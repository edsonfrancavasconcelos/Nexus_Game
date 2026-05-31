export class EnemyManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.enemies = [];
        
        // --- CONFIGURAÇÃO DE DIFICULDADE ---
        this.spawnTimer = 0;
        this.spawnInterval = 0.5; // Criar inimigo a cada 0.5 segundos (era 2.0 ou 3.0)
        this.enemiesPerWave = 3;   // Quantos inimigos nascem de uma vez
    }

    async init() {
        // Carregue seu modelo aqui como já faz
        // this.enemyModel = await loadModel...
    }

    spawnEnemy() {
        for (let i = 0; i < this.enemiesPerWave; i++) {
            // Cria um clone ou uma mesh simples para teste
            const geometry = new THREE.BoxGeometry(4, 4, 4);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const enemy = new THREE.Mesh(geometry, material);

            // Posição Aleatória na frente do jogador
            const x = (Math.random() - 0.5) * 100; // Espalha em X de -50 a 50
            const y = (Math.random() - 0.5) * 30;  // Espalha em Y
            const z = -200; // Nascem longe ao fundo

            enemy.position.set(x, y, z);
            
            // Velocidade individual para cada inimigo não parecer um robô
            enemy.userData.speed = 40 + Math.random() * 60; 

            this.scene.add(enemy);
            this.enemies.push(enemy);
        }
    }

    update(laserManager, onKill, player, deltaTime) {
        // 1. Controle de Spawn (Cronômetro)
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        // 2. Movimentação e Colisão
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Move o inimigo em direção ao jogador (Z positivo)
            enemy.position.z += enemy.userData.speed * deltaTime;

            // REMOVE SE PASSAR DO JOGADOR (Performance)
            if (enemy.position.z > 100) {
                this.scene.remove(enemy);
                this.enemies.splice(i, 1);
                continue;
            }

            // CHECK DE COLISÃO COM LASERS
            laserManager.lasers.forEach((laser, lIdx) => {
                const dist = enemy.position.distanceTo(laser.position);
                
                // Se a distância for menor que o tamanho da nave (ajuste 5-10)
                if (dist < 8) { 
                    // Efeito de explosão (se tiver)
                    // explosionManager.create(enemy.position);
                    
                    this.scene.remove(enemy);
                    this.enemies.splice(i, 1);
                    
                    this.scene.remove(laser);
                    laserManager.lasers.splice(lIdx, 1);
                    
                    onKill(100); // Pontuação
                }
            });
        }
    }
}