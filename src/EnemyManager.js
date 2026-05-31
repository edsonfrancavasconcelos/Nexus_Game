import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SoundManager } from './SoundManager.js';
import { ExplosionManager } from './ExplosionManager.js';

// --- Recursos Estáticos (Zero impacto de memória extra) ---
const ENEMY_LASER_GEO = new THREE.SphereGeometry(1.2, 4, 4);
const ENEMY_LASER_MAT = new THREE.MeshBasicMaterial({ color: 0xff0000 });

export class EnemyManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.enemies = [];
        this.enemyProjectiles = []; 
        this.waveTimer = 0;

        this.enemySpeed = 160.0;
        this.maxEnemiesOnScreen = 8;
        this.waveSize = 3;
        this.waveCooldown = 120;
        this.enemyTemplate = null;

        this.soundManager = new SoundManager();
        this.explosionManager = new ExplosionManager(scene);

        // Vetores reutilizáveis (Obrigatório para performance)
        this._tempVec = new THREE.Vector3();
        this._dirVec = new THREE.Vector3(0, 0, 1);

        this._loadEnemyModel();
    }

    async init() {
        await this.soundManager.init();
    }

    _loadEnemyModel() {
        const loader = new GLTFLoader();
        loader.load('assets/models/nave_inimiga.glb', (gltf) => {
            const model = gltf.scene;
            model.traverse((child) => {
                if (child.isMesh) {
                    child.matrixAutoUpdate = false; // PERFORMANCE: Otimiza renderização
                    child.updateMatrix();
                }
            });
            model.scale.set(1.5, 1.5, 1.5);
            this.enemyTemplate = model;
        });
    }

    _enemyShoot(enemy) {
        const laser = new THREE.Mesh(ENEMY_LASER_GEO, ENEMY_LASER_MAT);
        laser.position.copy(enemy.position);
        
        // PERFORMANCE: Removi a PointLight. Use apenas o brilho do material.
        this.scene.add(laser);
        
        // Calcula direção usando o vetor estático
        const direction = this._dirVec.clone().applyQuaternion(enemy.quaternion);
        
        this.enemyProjectiles.push({
            mesh: laser,
            direction: direction,
            speed: 400
        });

        this.soundManager.play('enemyLaser');
    }

    spawnWave(player) {
        if (!this.enemyTemplate || !player?.mesh) return;

        for (let i = 0; i < this.waveSize; i++) {
            const enemy = this.enemyTemplate.clone();
            
            const spawnX = player.mesh.position.x + (Math.random() - 0.5) * 400;
            const spawnY = player.mesh.position.y + (Math.random() - 0.5) * 200;
            const spawnZ = player.mesh.position.z - 1500 - (Math.random() * 500);

            enemy.position.set(spawnX, spawnY, spawnZ);
            
            // PERFORMANCE: Hitbox simplificada (Esfera de colisão é 10x mais rápida que Box3)
            enemy.userData = {
                moveSpeed: this.enemySpeed + Math.random() * 40,
                radius: 10, // Usaremos raio para colisão matemática
                spawnProtection: 0.5,
                shootTimer: Math.random() * 100,
                passedSound: false 
            };
            
            this.scene.add(enemy);
            this.enemies.push(enemy);
        }
    }

    destroyEnemy(enemy) {
        if (!enemy) return;
        const index = this.enemies.indexOf(enemy);
        if (index === -1) return;

        this.explosionManager.create(enemy.position, this.camera);
        this.soundManager.play('explosion');

        this.scene.remove(enemy);
        this.enemies.splice(index, 1);
    }

    update(laserManager, onScoreIncrease, player, deltaTime) {
        if (!player?.mesh || !deltaTime) return;

        this.waveTimer += deltaTime * 60;
        if (this.waveTimer > this.waveCooldown && this.enemies.length < this.maxEnemiesOnScreen) {
            this.spawnWave(player);
            this.waveTimer = 0;
        }

        // --- Atualizar Tiros (Otimizado) ---
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const p = this.enemyProjectiles[i];
            p.mesh.position.addScaledVector(p.direction, p.speed * deltaTime);

            // Verificação de distância simples (sem distanceToSquared que é mais lento que matemática pura aqui)
            if (Math.abs(p.mesh.position.z - player.mesh.position.z) > 1500) {
                this.scene.remove(p.mesh);
                this.enemyProjectiles.splice(i, 1);
            }
        }

        const lasers = laserManager?.lasers || [];
        const pPos = player.mesh.position;

        // --- Loop de Inimigos (Onde o lag acontece) ---
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const uData = enemy.userData;

            enemy.position.z += uData.moveSpeed * deltaTime;
            const distZ = enemy.position.z - pPos.z;

            // IA Suave
            if (distZ < -250) {
                enemy.position.x += (pPos.x - enemy.position.x) * (1.2 * deltaTime);
                enemy.position.y += (pPos.y - enemy.position.y) * (1.2 * deltaTime);
                enemy.lookAt(pPos);
            }

            // Tiro
            uData.shootTimer += deltaTime * 60;
            if (uData.shootTimer > 180 && distZ < 0) {
                this._enemyShoot(enemy);
                uData.shootTimer = 0;
            }

            // PERFORMANCE: Colisão Matemática (Esfera vs Ponto) 
            // É MUITO mais rápido que usar Box3 ou setFromObject
            if (uData.spawnProtection > 0) {
                uData.spawnProtection -= deltaTime;
            } else {
                // Colisão Inimigo x Player
                const distSq = enemy.position.distanceToSquared(pPos);
                if (distSq < 400) { // Raio de colisão de 20 unidades (20^2)
                    this.destroyEnemy(enemy);
                    continue;
                }

                // Colisão Inimigo x Lasers Player
                let hit = false;
                for (let j = lasers.length - 1; j >= 0; j--) {
                    const l = lasers[j];
                    if (enemy.position.distanceToSquared(l.position) < 225) { // Raio 15 (15^2)
                        if (onScoreIncrease) onScoreIncrease(100);
                        this.scene.remove(l);
                        lasers.splice(j, 1);
                        hit = true;
                        break;
                    }
                }
                if (hit) {
                    this.destroyEnemy(enemy);
                    continue;
                }
            }

            if (distZ > 400) {
                this.scene.remove(enemy);
                this.enemies.splice(i, 1);
            }
        }
        this.explosionManager.update(deltaTime);
    }

    clearAllEnemies() {
        this.enemies.forEach(e => this.scene.remove(e));
        this.enemyProjectiles.forEach(p => this.scene.remove(p.mesh));
        this.enemies.length = 0;
        this.enemyProjectiles.length = 0;
    }
}