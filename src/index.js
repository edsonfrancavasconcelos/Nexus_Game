import * as THREE from 'three';
import { unzipSync, strFromU8 } from 'fflate';
window.fflate = { unzipSync, strFromU8 };

import { SoundManager } from './SoundManager.js';
import { InputManager } from './InputManager.js';
import { Player } from './Player.js';
import { LaserManager } from './LaserManager.js';
import { EnemyManager } from './EnemyManager.js';
import { StarfieldManager } from './StarfieldManager.js';
import { ExplosionManager } from './ExplosionManager.js';
import { SpaceEnvironment } from './SpaceEnvironment.js';
import { ProgressionManager } from './ProgressionManager.js';

window.fflate = fflate;

// --- DECLARAÇÕES GLOBAIS ---
let audioInitialized = false;
let currentState = 'menu'; // Valor inicial
let score = 0;

const GAME_STATE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'game_over' };

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010103);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 5, 55);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", precision: "mediump" });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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
function animate(now) {
    requestAnimationFrame(animate);
    const deltaTime = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (currentState === GAME_STATE.PLAYING) {
        const input = inputManager.update();
        
        // Disparo
        if (inputManager.keys.Space) {
            if (!player.lastFireTime || now - player.lastFireTime > 250) {
                laserManager.fire(player.mesh, player.mesh);
                soundManager.play('laser');
                player.lastFireTime = now;
            }
        }
        
        player.update(input, deltaTime);
        laserManager.update(player.mesh, deltaTime);
        
        // UPDATE DO ENEMY MANAGER (CRÍTICO)
        enemyManager.update(
            laserManager, 
            (pts) => { score += pts; updateHUD(); }, 
            player, 
            deltaTime, 
            explosionManager, 
            soundManager
        );

        explosionManager.update(deltaTime);
        starfieldManager.update(deltaTime);
        renderer.render(scene, camera);
    }
}

// --- EXECUÇÃO ---
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

    // Inicializa o ambiente de jogo mas NÃO inicia o loop de jogo (animate) ainda
    initGame()
        .then(() => {
            console.log("Assets carregados, pronto para iniciar.");
            // Chamamos o animate para o Three.js renderizar o menu (estático)
            // Se preferir, apenas chame o render uma vez ou inicie o loop aqui
            animate(0); 
        })
        .catch(err => console.error("Erro ao carregar assets:", err));
});