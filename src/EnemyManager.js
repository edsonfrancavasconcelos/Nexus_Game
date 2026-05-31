import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ENEMY_LASER_GEO = new THREE.SphereGeometry(1.5, 6, 6);
const ENEMY_LASER_MAT = new THREE.MeshBasicMaterial({ 
    color: 0xff0033,
    toneMapped: false 
});

export class EnemyManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.enemies = [];
        this.enemyProjectiles = []; 
        this.waveTimer = 0;
        this.enemySpeed = 160.0;
        this.maxEnemiesOnScreen = 8; 
        this.waveCooldown = 2.5; 
        
        this.enemyTemplate = null;
        this._loadEnemyModel();
    }

    async init() {}

    _loadEnemyModel() {
        const loader = new GLTFLoader();
        loader.load('/assets/models/nave_inimiga.glb', (gltf) => {
            this.enemyTemplate = gltf.scene;
            this.enemyTemplate.scale.set(1.5, 1.5, 1.5);
            this.enemyTemplate.traverse(c => {
                if(c.isMesh) {
                    c.castShadow = false;
                    c.receiveShadow = false;
                    c.material.precision = "mediump";
                }
            });
        }, undefined, (err) => console.error("Erro ao carregar inimigo:", err));
    }

    _enemyShoot(enemy, soundManager) {
        const laser = new THREE.Mesh(ENEMY_LASER_GEO, ENEMY_LASER_MAT);
        laser.position.copy(enemy.position);
        
        this.scene.add(laser);
        this.enemyProjectiles.push({ 
            mesh: laser, 
            dir: new THREE.Vector3(0, 0, 1), 
            speed: 350 
        });

        // Som corrigido: 'enemyLaser' conforme definido no SoundManager
        if (soundManager) soundManager.play('enemyLaser');
    }

    spawnWave(player) {
        if (!this.enemyTemplate || this.enemies.length >= this.maxEnemiesOnScreen) return;
        
        const enemy = this.enemyTemplate.clone();
        const pPos = player.mesh.position;

        enemy.position.set(
            pPos.x + (Math.random() - 0.5) * 400,
            pPos.y + (Math.random() - 0.5) * 150,
            pPos.z - 1200
        );

        enemy.userData = {
            speed: this.enemySpeed + Math.random() * 60,
            shootTimer: 1.5 + Math.random() * 2,
            hp: 1
        };

        this.scene.add(enemy);
        this.enemies.push(enemy);
    }

    update(laserManager, onScoreIncrease, player, deltaTime, explosionManager, soundManager) {
        if (!player?.mesh || !deltaTime) return;

        this.waveTimer += deltaTime;
        if (this.waveTimer > this.waveCooldown) {
            this.spawnWave(player);
            this.waveTimer = 0;
        }

        const pPos = player.mesh.position;
        const playerLasers = laserManager.lasers || [];

        // 1. Atualizar Tiros Inimigos
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const p = this.enemyProjectiles[i];
            p.mesh.position.z += p.speed * deltaTime;

            if (p.mesh.position.z > pPos.z + 100) {
                this.scene.remove(p.mesh);
                this.enemyProjectiles.splice(i, 1);
            }
        }

        // 2. Atualizar Inimigos e Colisões
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const data = enemy.userData;

            enemy.position.z += data.speed * deltaTime;

            data.shootTimer -= deltaTime;
            if (data.shootTimer <= 0 && enemy.position.z < pPos.z) {
                this._enemyShoot(enemy, soundManager);
                data.shootTimer = 2.0 + Math.random() * 2;
            }

            // Colisão (Player Laser x Inimigo)
            let isDestroyed = false;
            for (let j = playerLasers.length - 1; j >= 0; j--) {
                const laser = playerLasers[j];
                if (enemy.position.distanceTo(laser.position) < 45) {
                    if (onScoreIncrease) onScoreIncrease(100);
                    
                    this.scene.remove(laser);
                    playerLasers.splice(j, 1);
                    
                    if (explosionManager) explosionManager.create(enemy.position);
                    if (soundManager) soundManager.play('explosion');
                    
                    isDestroyed = true;
                    break;
                }
            }

            if (isDestroyed) {
                this.scene.remove(enemy);
                this.enemies.splice(i, 1);
                continue;
            }

            // Colisão (Inimigo x Player)
            if (enemy.position.distanceTo(pPos) < 40) {
                if (explosionManager) explosionManager.create(enemy.position);
                this.scene.remove(enemy);
                this.enemies.splice(i, 1);
            } else if (enemy.position.z > pPos.z + 200) {
                this.scene.remove(enemy);
                this.enemies.splice(i, 1);
            }
        }
    }

    clearAllEnemies() {
        this.enemies.forEach(e => this.scene.remove(e));
        this.enemyProjectiles.forEach(p => this.scene.remove(p.mesh));
        this.enemies = [];
        this.enemyProjectiles = [];
    }
}