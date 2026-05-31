import * as THREE from 'three';
import * as fflate from 'fflate';

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

const GAME_STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

let currentState = GAME_STATE.MENU;
let score = 0;
let level = 1;
let lives = 3;

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010103);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 5, 55);

const renderer = new THREE.WebGLRenderer({ 
    antialias: false, 
    powerPreference: "high-performance",
    precision: "mediump", // "lowp" às vezes quebra o render de modelos GLB, use mediump
    stencil: false,
    depth: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
document.body.appendChild(renderer.domElement);

// --- MANAGERS (ORDEM IMPORTANTE) ---
const soundManager = new SoundManager();
const laserManager = new LaserManager(scene); // Instancie antes do Player
const player = new Player(scene, laserManager); // PASSE o laserManager aqui!
const inputManager = new InputManager();
const enemyManager = new EnemyManager(scene, camera);
const starfieldManager = new StarfieldManager(scene);
const explosionManager = new ExplosionManager(scene);
const spaceEnvironment = new SpaceEnvironment(scene);
const progressionManager = new ProgressionManager();

// --- UI ELEMENTS ---
const overlay = document.getElementById('overlay');
const mobileControls = document.getElementById('mobile-controls'); // Referência corrigida

function updateHUD() {
    const scoreVal = document.getElementById('score-val');
    if (scoreVal) scoreVal.textContent = score.toString().padStart(7, '0');
}

// --- GAME LOGIC ---
async function initGame() {
    soundManager.init();
    await enemyManager.init();
}

function startGame() {
    if (currentState === GAME_STATE.PLAYING) return;

    currentState = GAME_STATE.PLAYING;
    score = 0;
    
    // Esconder Menu e Mostrar Controles Mobile
    if (overlay) overlay.style.display = 'none';
    if (mobileControls) mobileControls.style.display = 'block';

    player.mesh.position.set(0, -1, 8);
    enemyManager.clearAllEnemies?.();
    enemyManager.spawnWave?.(player);

    soundManager.play('nave', true);
    updateHUD();
}

// --- CONTROLES DE TOQUE (MOBILE) ---
function setupMobileEvents() {
    const shootBtn = document.getElementById('shootBtn');
    if (shootBtn) {
        shootBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            player.isFiring = true; 
            soundManager.play('laser');
        });
        shootBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            player.isFiring = false;
        });
    }

    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Lógica de pause aqui
        });
    }
}

// --- LOOP PRINCIPAL ---
let lastTime = 0;

function animate(now) {
    requestAnimationFrame(animate);

    const deltaTime = Math.min((now - lastTime) / 1000, 0.1); 
    lastTime = now;

    if (currentState === GAME_STATE.PLAYING) {
        // 1. Pega os inputs (Movimento E Teclas)
        const input = inputManager.update();
        
        // 2. Lógica de Disparo no Teclado
        if (inputManager.keys.Space) {
            // Verifica se o player está pronto para atirar (para não disparar 60 vezes por segundo)
            if (!player.lastFireTime || now - player.lastFireTime > 250) {
                laserManager.fire(player.mesh, player.mesh); // Ajuste conforme seu Player.js
                soundManager.play('laser');
                player.lastFireTime = now;
            }
        }
        
        player.update(input, deltaTime);
        laserManager.update(player.mesh, deltaTime);
        
        // ... restante do código
    }
    renderer.render(scene, camera);
}

// --- EVENTOS ---
document.getElementById('start-btn')?.addEventListener('click', startGame);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- EXECUÇÃO ---
window.addEventListener('DOMContentLoaded', () => {
    // Agora o DOM está pronto e soundManager já foi criado lá em cima
    document.getElementById('start-btn')?.addEventListener('click', () => {
        if (!audioInitialized) {
            soundManager.init();
            audioInitialized = true;
        }
        startGame();
    });

    initGame().then(() => {
        setupMobileEvents();
        animate(0);
    });
});