import * as THREE from 'three';
import * as fflate from 'fflate';

// ... (seus imports permanecem iguais)

// --- MUDANÇA: Variável de controle de áudio ---
let audioInitialized = false;

// --- LOOP PRINCIPAL ---
let lastTime = 0;

function animate(now) {
    requestAnimationFrame(animate);

    const deltaTime = Math.min((now - lastTime) / 1000, 0.1); 
    lastTime = now;

    if (currentState === GAME_STATE.PLAYING) {
        // 1. Inputs
        const input = inputManager.update();
        
        // 2. Disparo Teclado
        if (inputManager.keys.Space) {
            if (!player.lastFireTime || now - player.lastFireTime > 250) {
                laserManager.fire(player.mesh, player.mesh);
                soundManager.play('laser');
                player.lastFireTime = now;
            }
        }
        
        // 3. Atualizações
        player.update(input, deltaTime);
        laserManager.update(player.mesh, deltaTime);
        
        // --- CORREÇÃO: Chamada completa do update do EnemyManager ---
        enemyManager.update(
            laserManager, 
            (points) => {
                score += points;
                updateHUD();
            }, 
            player, 
            deltaTime, 
            explosionManager, 
            soundManager // Agora o enemyManager tem acesso ao som e explosão!
        );

        explosionManager.update(deltaTime);
        starfieldManager.update(deltaTime);
        if (spaceEnvironment.update) spaceEnvironment.update(deltaTime);

        camera.position.x += (player.mesh.position.x * 0.2 - camera.position.x) * 0.05;
        camera.lookAt(player.mesh.position.x * 0.5, player.mesh.position.y, -50);
    }

    renderer.render(scene, camera);
}

// --- EVENTOS CORRIGIDOS ---
document.getElementById('start-btn')?.addEventListener('click', () => {
    // Garante que o áudio só inicia no clique
    if (!audioInitialized) {
        soundManager.init();
        audioInitialized = true;
    }
    startGame();
});

// ... (restante dos eventos e execução permanecem iguais)