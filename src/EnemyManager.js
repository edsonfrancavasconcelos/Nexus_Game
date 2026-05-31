export class EnemyManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.enemies = [];
    }

    update(laserManager, onKill, player, deltaTime) {
        // Loop de inimigos
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // CHECAGEM DE COLISÃO
            // Verificamos cada laser contra cada inimigo
            laserManager.lasers.forEach((laser, lIdx) => {
                const dist = enemy.position.distanceTo(laser.position);
                
                if (dist < 15) { // Ajuste esse valor conforme o tamanho da sua nave
                    this.explode(enemy);
                    this.scene.remove(enemy);
                    this.enemies.splice(i, 1);
                    
                    // Remove o laser que atingiu
                    this.scene.remove(laser);
                    laserManager.lasers.splice(lIdx, 1);
                    
                    onKill(100); // Pontos
                }
            });
        }
    }
    
    explode(enemy) {
        // Chame seu ExplosionManager aqui
    }
}