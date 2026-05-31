import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SoundManager } from './SoundManager.js';
import { ExplosionManager } from './ExplosionManager.js';

// --- Recursos Compartilhados (Criados uma vez para não pesar na memória) ---
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

        // Vetores temporários para evitar criação de objetos (GC Friendly)
        this._tempVec = new THREE.Vector3();
        this._dirVec = new THREE.Vector3();

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
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            model.scale.set(1.5, 1.5, 1.5);
            this.enemyTemplate = model;
        });
    }

    _enemyShoot(enemy) {
        // Reutiliza geometria e material estáticos
        const laser = new THREE.Mesh(ENEMY_LASER_GEO, ENEMY_LASER_MAT);

        laser.position.copy(enemy.position);
        laser.quaternion.copy(enemy.quaternion);

        // Luz simplificada - Apenas uma por tiro (se necessário)
        const light = new THREE.PointLight(0xff0000, 10, 20);
        laser.add(light);

        this.scene.add(laser);
        
        // Direção calculada sem clonar vetores
        const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.quaternion);
        
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
            
            // Hitbox é criada uma vez por inimigo, não uma vez por frame
            const hitbox = new THREE.Box3();
            
            enemy.userData = {
                moveSpeed: this.enemySpeed + Math.random() * 40,
                hitbox: hitbox,
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

        this.soundManager.play('explosion');
        this.explosionManager.create(enemy.position, this.camera);

        this.scene.remove(enemy);
        this.enemies.splice(index, 1);
    }

    update(laserManager, onScoreIncrease, player, deltaTime) {
        if (!player?.mesh || !deltaTime) return;

        // Controle de Waves (deltaTime é em segundos, ex: 0.016)
        this.waveTimer += deltaTime * 60; // Mantém escala de frames para cooldown

        if (this.waveTimer > this.waveCooldown && this.enemies.length < this.maxEnemiesOnScreen) {
            this.spawnWave(player);
            this.waveTimer = 0;
        }

        // Atualizar Tiros dos Inimigos (Otimizado)
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const p = this.enemyProjectiles[i];
            
            // Adiciona velocidade usando deltaTime (sem clonar vetor)
            p.mesh.position.addScaledVector(p.direction, p.speed * deltaTime);

            // Verificação de distância otimizada
            if (p.mesh.position.distanceToSquared(player.mesh.position) > 2250000) { // 1500^2
                this.scene.remove(p.mesh);
                this.enemyProjectiles.splice(i, 1);
            }
        }

        const lasers = laserManager?.lasers || [];

        // Loop de Inimigos
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const uData = enemy.userData;

            // Movimento constante para frente
            enemy.position.z += uData.moveSpeed * deltaTime;

            const distZ = enemy.position.z - player.mesh.position.z;

            // IA segue o player se estiver longe no eixo Z
            if (distZ < -250) {
                enemy.position.x += (player.mesh.position.x - enemy.position.x) * (1.2 * deltaTime);
                enemy.position.y += (player.mesh.position.y - enemy.position.y) * (1.2 * deltaTime);
                enemy.lookAt(player.mesh.position);
            }

            // Lógica de Tiro (deltaTime)
            uData.shootTimer += deltaTime * 60;
            if (uData.shootTimer > 180 && distZ < 0) {
                this._enemyShoot(enemy);
                uData.shootTimer = 0;
            }

            // Som de passagem
            if (!uData.passedSound && distZ > -400) {
                this.soundManager.play('enemyPass');
                uData.passedSound = true;
            }

            // Atualiza Hitbox
            uData.hitbox.setFromObject(enemy);
            if (uData.spawnProtection > 0) uData.spawnProtection -= deltaTime;

            const canCollide = uData.spawnProtection <= 0;

            // Colisão com Player (Aproximação rápida por distância antes da Box3)
            if (canCollide) {
                const pPos = player.mesh.position;
                const ePos = enemy.position;
                if (Math.abs(ePos.z - pPos.z) < 30 && Math.abs(ePos.x - pPos.x) < 12 && Math.abs(ePos.y - pPos.y) < 8) {
                    this.destroyEnemy(enemy);
                    continue;
                }
            }

            // Colisão com Lasers do Player
            if (canCollide && lasers.length > 0) {
                let enemyHit = false;
                for (let j = lasers.length - 1; j >= 0; j--) {
                    const l = lasers[j];
                    if (uData.hitbox.containsPoint(l.position) || enemy.position.distanceToSquared(l.position) < 625) {
                        if (onScoreIncrease) onScoreIncrease(100);
                        this.scene.remove(l);
                        lasers.splice(j, 1);
                        enemyHit = true;
                        break;
                    }
                }
                if (enemyHit) {
                    this.destroyEnemy(enemy);
                    continue;
                }
            }

            // Remove se passou muito longe
            if (distZ > 400) {
                this.scene.remove(enemy);
                this.enemies.splice(i, 1);
            }
        }

        this.explosionManager.update();
    }

    clearAllEnemies() {
        this.enemies.forEach(e => this.scene.remove(e));
        this.enemyProjectiles.forEach(p => this.scene.remove(p.mesh));
        this.enemies.length = 0;
        this.enemyProjectiles.length = 0;
        this.waveTimer = 0;
    }
}