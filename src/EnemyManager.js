import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Geometria única para todos os tiros inimigos (Economiza memória)
const ENEMY_LASER_GEO = new THREE.SphereGeometry(1.5, 6, 6);
const ENEMY_LASER_MAT = new THREE.MeshBasicMaterial({ 
    color: 0xff0033,
    toneMapped: false // Faz o vermelho brilhar mais
});

export class EnemyManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.enemies = [];
        this.enemyProjectiles = []; 
        this.waveTimer = 0;
        this.enemySpeed = 160.0;
        this.maxEnemiesOnScreen = 8; // Reduzido levemente para manter FPS estável no mobile
        this.waveCooldown = 2.5; 
        
        // Managers passados via index ou instanciados aqui
        this.enemyTemplate = null;
        this._loadEnemyModel();
    }

    // O init deve ser chamado no index.js
    async init() {
        // Se o seu SoundManager tiver som global, carregue aqui
    }

    _loadEnemyModel() {
        const loader = new GLTFLoader();
        // Adicionado fallback para o caminho do modelo
        loader.load('/assets/models/nave_inimiga.glb', (gltf) => {
            this.enemyTemplate = gltf.scene;
            this.enemyTemplate.scale.set(1.5, 1.5, 1.5);
            this.enemyTemplate.traverse(c => {
                if(c.isMesh) {
                    c.castShadow = false; // Mobile: Sombras em inimigos pesam muito
                    c.receiveShadow = false;
                    c.material.precision = "mediump";
                }
            });
        }, undefined, (err) => console.error("Erro ao carregar inimigo:", err));
    }

    _enemyShoot(enemy) {
        const laser = new THREE.Mesh(ENEMY_LASER_GEO, ENEMY_LASER_MAT);
        laser.position.copy(enemy.position);
        
        // Direção: Sempre em frente (Z positivo vindo para o player)
        const direction = new THREE.Vector3(0, 0, 1);
        this.scene.add(laser);
        
        this.enemyProjectiles.push({ 
            mesh: laser, 
            dir: direction, 
            speed: 350 // Velocidade justa para o jogador conseguir desviar
        });
    }

    spawnWave(player) {
        if (!this.enemyTemplate || this.enemies.length >= this.maxEnemiesOnScreen) return;
        
        const enemy = this.enemyTemplate.clone();
        const pPos = player.mesh.position;

        // Spawn em uma área randômica à frente do player
        enemy.position.set(
            pPos.x + (Math.random() - 0.5) * 400,
            pPos.y + (Math.random() - 0.5) * 150,
            pPos.z - 1200 // Distância de spawn
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

        // Gerenciamento de Waves
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

            // Remove tiro se passar muito do player
            if (p.mesh.position.z > pPos.z + 100) {
                this.scene.remove(p.mesh);
                this.enemyProjectiles.splice(i, 1);
            }
        }

        // 2. Atualizar Inimigos e Colisões
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const data = enemy.userData;

            // Movimento em direção ao player
            enemy.position.z += data.speed * deltaTime;

            // IA Simples: Atirar
            data.shootTimer -= deltaTime;
            if (data.shootTimer <= 0 && enemy.position.z < pPos.z) {
                this._enemyShoot(enemy);
                data.shootTimer = 2.0 + Math.random() * 2;
                if(soundManager) soundManager.play('laserInimigo');
            }

            // --- DETECÇÃO DE COLISÃO (LASER DO PLAYER X INIMIGO) ---
            let isDestroyed = false;
            for (let j = playerLasers.length - 1; j >= 0; j--) {
                const laser = playerLasers[j];
                
                // Caixa de colisão virtual (Hitbox)
                const dist = enemy.position.distanceTo(laser.position);

                if (dist < 45) { // Hitbox generosa para gameplay fluido
                    if (onScoreIncrease) onScoreIncrease(100);
                    
                    // Cleanup do Laser
                    this.scene.remove(laser);
                    playerLasers.splice(j, 1);
                    
                    // Efeitos
                    if(explosionManager) explosionManager.create(enemy.position);
                    if(soundManager) soundManager.play('explosion');
                    
                    isDestroyed = true;
                    break;
                }
            }

            if (isDestroyed) {
                this.scene.remove(enemy);
                this.enemies.splice(i, 1);
                continue;
            }

            // Colisão Direta (Inimigo x Player)
            if (enemy.position.distanceTo(pPos) < 40) {
                if(explosionManager) explosionManager.create(enemy.position);
                this.scene.remove(enemy);
                this.enemies.splice(i, 1);
                // Aqui você chamaria uma função de dano no player
                continue;
            }

            // Remove se o inimigo passar da tela
            if (enemy.position.z > pPos.z + 200) {
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