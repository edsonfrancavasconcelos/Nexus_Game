import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SoundManager } from './SoundManager.js';
import { ExplosionManager } from './ExplosionManager.js';

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
        this.maxEnemiesOnScreen = 10;
        this.waveCooldown = 2.0; 
        
        this.soundManager = new SoundManager();
        this.explosionManager = new ExplosionManager(scene);
        this._loadEnemyModel();
    }

    async init() {
        await this.soundManager.init();
    }

    _loadEnemyModel() {
        const loader = new GLTFLoader();
        loader.load('assets/models/nave_inimiga.glb', (gltf) => {
            this.enemyTemplate = gltf.scene;
            this.enemyTemplate.scale.set(1.5, 1.5, 1.5);
            this.enemyTemplate.traverse(c => {
                if(c.isMesh) {
                    c.matrixAutoUpdate = false;
                    c.updateMatrix();
                }
            });
        });
    }

    _enemyShoot(enemy) {
        const laser = new THREE.Mesh(ENEMY_LASER_GEO, ENEMY_LASER_MAT);
        laser.position.copy(enemy.position);
        const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.quaternion);
        this.scene.add(laser);
        this.enemyProjectiles.push({ mesh: laser, dir: direction, speed: 450 });
        this.soundManager.play('enemyLaser');
    }

    spawnWave(player) {
        if (!this.enemyTemplate || this.enemies.length >= this.maxEnemiesOnScreen) return;
        const enemy = this.enemyTemplate.clone();
        const pPos = player.mesh.position;

        enemy.position.set(
            pPos.x + (Math.random() - 0.5) * 600,
            pPos.y + (Math.random() - 0.5) * 200,
            pPos.z - 1500 
        );

        enemy.userData = {
            speed: this.enemySpeed + Math.random() * 50,
            shootTimer: 1.0 + Math.random() * 2
        };

        this.scene.add(enemy);
        this.enemies.push(enemy);
    }

    update(laserManager, onScoreIncrease, player, deltaTime) {
        if (!player?.mesh || !deltaTime) return;

        this.waveTimer += deltaTime;
        if (this.waveTimer > this.waveCooldown) {
            this.spawnWave(player);
            this.waveTimer = 0;
        }

        const pPos = player.mesh.position;
        
        // --- CRÍTICO: Garantir que pegamos a lista correta de lasers ---
        const playerLasers = laserManager.lasers || [];

        // 1. Movimentação dos tiros inimigos
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const p = this.enemyProjectiles[i];
            p.mesh.position.addScaledVector(p.dir, p.speed * deltaTime);
            if (Math.abs(p.mesh.position.z - pPos.z) > 1500) {
                this.scene.remove(p.mesh);
                this.enemyProjectiles.splice(i, 1);
            }
        }

        // 2. Loop principal de inimigos
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const data = enemy.userData;

            enemy.position.z += data.speed * deltaTime;
            const distZ = enemy.position.z - pPos.z;

            if (distZ < -100) enemy.lookAt(pPos);

            data.shootTimer -= deltaTime;
            if (data.shootTimer <= 0 && distZ < 0) {
                this._enemyShoot(enemy);
                data.shootTimer = 2.0 + Math.random();
            }

            // --- DETECÇÃO DE COLISÃO REFORÇADA ---
            let enemyHit = false;

            // Loop pelos lasers do jogador
            for (let j = playerLasers.length - 1; j >= 0; j--) {
                const laser = playerLasers[j];
                
                // Usamos distâncias absolutas (AABB simplificado)
                // Se o laser estiver dentro desse "bloco" ao redor da inimiga, ela explode
                const dx = Math.abs(enemy.position.x - laser.position.x);
                const dy = Math.abs(enemy.position.y - laser.position.y);
                const dz = Math.abs(enemy.position.z - laser.position.z);

                // Aumentamos a margem de acerto para 35 no X e 60 no Z
                // Isso compensa a alta velocidade dos objetos
                if (dx < 35 && dy < 30 && dz < 60) {
                    if (onScoreIncrease) onScoreIncrease(100);
                    
                    // Remove o laser da cena e da lista
                    this.scene.remove(laser);
                    playerLasers.splice(j, 1);
                    
                    enemyHit = true;
                    break; 
                }
            }

            if (enemyHit) {
                this.destroyEnemy(i);
                continue;
            }

            // Colisão Direta Inimigo x Player
            if (enemy.position.distanceToSquared(pPos) < 900) {
                this.destroyEnemy(i);
                continue;
            }

            if (distZ > 400) {
                this.scene.remove(enemy);
                this.enemies.splice(i, 1);
            }
        }
        this.explosionManager.update(deltaTime);
    }

    destroyEnemy(index) {
        const enemy = this.enemies[index];
        if (!enemy) return;
        this.explosionManager.create(enemy.position);
        this.soundManager.play('explosion');
        this.scene.remove(enemy);
        this.enemies.splice(index, 1);
    }

    clearAllEnemies() {
        this.enemies.forEach(e => this.scene.remove(e));
        this.enemyProjectiles.forEach(p => this.scene.remove(p.mesh));
        this.enemies = [];
        this.enemyProjectiles = [];
    }
}