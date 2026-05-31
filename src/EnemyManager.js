import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SoundManager } from './SoundManager.js';
import { ExplosionManager } from './ExplosionManager.js';

// --- Recursos Estáticos (Compartilhados) ---
const ENEMY_LASER_GEO = new THREE.SphereGeometry(1, 4, 4);
const ENEMY_LASER_MAT = new THREE.MeshBasicMaterial({ color: 0xff0000 });

export class EnemyManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.enemies = [];
        this.enemyProjectiles = []; 
        this.waveTimer = 0;

        // Configurações
        this.enemySpeed = 160.0;
        this.maxEnemiesOnScreen = 10;
        this.waveCooldown = 2.0; // Em segundos agora
        
        this.soundManager = new SoundManager();
        this.explosionManager = new ExplosionManager(scene);

        // OTIMIZAÇÃO: Vetores fixos para evitar Garbage Collection (lixo na memória)
        this._dir = new THREE.Vector3(0, 0, 1);
        this._v = new THREE.Vector3();

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
            // Congela o modelo para renderizar mais rápido
            this.enemyTemplate.traverse(c => {
                if(c.isMesh) {
                    c.matrixAutoUpdate = false;
                    c.updateMatrix();
                }
            });
        });
    }

    _enemyShoot(enemy) {
        // OTIMIZAÇÃO: Não adicione luzes aos lasers. Use apenas o Mesh.
        const laser = new THREE.Mesh(ENEMY_LASER_GEO, ENEMY_LASER_MAT);
        laser.position.copy(enemy.position);
        
        // Calcula direção baseada na rotação da nave inimiga
        const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.quaternion);
        
        this.scene.add(laser);
        this.enemyProjectiles.push({
            mesh: laser,
            dir: direction,
            speed: 400
        });

        this.soundManager.play('enemyLaser');
    }

    spawnWave(player) {
        if (!this.enemyTemplate || this.enemies.length >= this.maxEnemiesOnScreen) return;

        const enemy = this.enemyTemplate.clone();
        const pPos = player.mesh.position;

        // Spawn fora da visão, mas no caminho do player
        enemy.position.set(
            pPos.x + (Math.random() - 0.5) * 500,
            pPos.y + (Math.random() - 0.5) * 200,
            pPos.z - 1200
        );

        enemy.userData = {
            speed: this.enemySpeed + Math.random() * 50,
            shootTimer: Math.random() * 2,
            radius: 12 // Raio de colisão matemática
        };

        this.scene.add(enemy);
        this.enemies.push(enemy);
    }

    update(laserManager, onScoreIncrease, player, deltaTime) {
        if (!player?.mesh || !deltaTime) return;

        // 1. Controle de Spawns
        this.waveTimer += deltaTime;
        if (this.waveTimer > this.waveCooldown) {
            this.spawnWave(player);
            this.waveTimer = 0;
        }

        const pPos = player.mesh.position;
        const playerLasers = laserManager?.lasers || [];

        // 2. Atualizar Tiros Inimigos (Simples e Rápido)
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const p = this.enemyProjectiles[i];
            p.mesh.position.addScaledVector(p.dir, p.speed * deltaTime);

            // Deletar se estiver longe
            if (Math.abs(p.mesh.position.z - pPos.z) > 1500) {
                this.scene.remove(p.mesh);
                this.enemyProjectiles.splice(i, 1);
            }
        }

        // 3. Loop de Inimigos (Onde o FPS morre)
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const data = enemy.userData;

            // Movimento
            enemy.position.z += data.speed * deltaTime;
            const distZ = enemy.position.z - pPos.z;

            // IA simplificada: Só olha pro player se estiver longe
            if (distZ < -100) {
                enemy.lookAt(pPos);
            }

            // Atirar
            data.shootTimer -= deltaTime;
            if (data.shootTimer <= 0 && distZ < 0) {
                this._enemyShoot(enemy);
                data.shootTimer = 1.5 + Math.random();
            }

            // COLISÃO MATEMÁTICA (Esfera x Esfera) -> 100x mais rápido que Box3
            const distSq = enemy.position.distanceToSquared(pPos);
            
            // Colisão com Player
            if (distSq < 400) { // (Raio inimigo + Raio player)^2
                this.destroyEnemy(i);
                continue;
            }

            // Colisão com Lasers do Player
            let hit = false;
            for (let j = playerLasers.length - 1; j >= 0; j--) {
                const l = playerLasers[j];
                if (enemy.position.distanceToSquared(l.position) < 250) {
                    if (onScoreIncrease) onScoreIncrease(100);
                    this.scene.remove(l);
                    playerLasers.splice(j, 1);
                    hit = true;
                    break;
                }
            }

            if (hit) {
                this.destroyEnemy(i);
                continue;
            }

            // Remover se passou do player
            if (distZ > 300) {
                this.scene.remove(enemy);
                this.enemies.splice(i, 1);
            }
        }

        this.explosionManager.update(deltaTime);
    }

    destroyEnemy(index) {
        const enemy = this.enemies[index];
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