import * as THREE from 'three';
import { unzipSync, strFromU8 } from 'fflate';

import { SoundManager } from './SoundManager.js';
import { InputManager } from './InputManager.js';
import { Player } from './Player.js';
import { LaserManager } from './LaserManager.js';
import { EnemyManager } from './EnemyManager.js';
import { StarfieldManager } from './StarfieldManager.js';
import { ExplosionManager } from './ExplosionManager.js';
import { SpaceEnvironment } from './SpaceEnvironment.js';
import { ProgressionManager } from './ProgressionManager.js';

// --- DECLARAÇÕES GLOBAIS ---
let audioInitialized = false;
let currentState = 'menu';
let score = 0;

const GAME_STATE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'game_over' };

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010103);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 8, 60);

const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    powerPreference: "high-performance" 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Instâncias
const soundManager = new SoundManager();
const laserManager = new LaserManager(scene);
const player = new Player(scene, laserManager);
const inputManager = new InputManager();
const enemyManager = new EnemyManager(scene, camera);
const starfieldManager = new StarfieldManager(scene);
const explosionManager = new ExplosionManager(scene);
const spaceEnvironment = new SpaceEnvironment(scene);
const progressionManager = new ProgressionManager();

// --- LÓGICA ---
function updateHUD() {
    const scoreVal = document.getElementById('score-val');
    if (scoreVal) scoreVal.textContent = score.toString().padStart(7, '0');
}

async function initGame() {
    soundManager.init();
    await enemyManager.init();
}

function startGame() {
    if (currentState === GAME_STATE.PLAYING) return;
    
    currentState = GAME_STATE.PLAYING;
    score = 0;
    document.getElementById('overlay').style.display = 'none';
    
    player.mesh.position.set(0, -1, 8);
    enemyManager.clearAllEnemies();
    enemyManager.spawnWave(player);
    
    soundManager.play('nave');
    updateHUD();
}

// --- LOOP PRINCIPAL ---
let lastTime = 0;

function animate(now = 0) {
    requestAnimationFrame(animate);
    
    const deltaTime = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (currentState === GAME_STATE.PLAYING) {
        const input = inputManager.update();

        // Disparo do jogador
        if (inputManager.keys.Space) {
            if (!player.lastFireTime || now - player.lastFireTime > 220) {
                laserManager.fire(player.mesh.position, camera);
                soundManager.play('laser');
                player.lastFireTime = now;
            }
        }

        player.update(input, deltaTime);
        laserManager.update(deltaTime);
        
        // Atualiza inimigos (aqui deve estar chamando explosões)
        enemyManager.update(
            laserManager, 
            (pts) => { 
                score += pts; 
                updateHUD(); 
            }, 
            player, 
            deltaTime, 
            explosionManager, 
            soundManager
        );

        // Atualiza explosões e outros sistemas
        explosionManager.update();
        starfieldManager.update(deltaTime);
        spaceEnvironment.update?.(deltaTime);

        renderer.render(scene, camera);
    }
}

// --- INICIALIZAÇÃO ---
window.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (!audioInitialized) {
                soundManager.init();
                audioInitialized = true;
            }
            startGame();
        });
    }

    initGame().then(() => {
        animate(0);
    });
});