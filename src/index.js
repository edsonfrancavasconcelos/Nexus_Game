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

// =========================================
// GAME STATE
// =========================================
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

// =========================================
// SCENE, CAMERA, RENDERER
// =========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010103); // Quase preto para performance

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1500); // Plano de corte próximo reduzido
camera.position.set(0, 5, 55);

const renderer = new THREE.WebGLRenderer({ 
    antialias: false, // PERFORMANCE: Desativado
    powerPreference: "high-performance",
    precision: "lowp", // PERFORMANCE: Precisão menor para shaders mais rápidos
    stencil: false,
    depth: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // PERFORMANCE: Máximo 1.5x (suficiente para nitidez)
renderer.shadowMap.enabled = false; 
document.body.appendChild(renderer.domElement);

// =========================================
// MANAGERS
// =========================================
const soundManager = new SoundManager();
const inputManager = new InputManager();
const player = new Player(scene);
const laserManager = new LaserManager(scene);
const enemyManager = new EnemyManager(scene, camera);
const starfieldManager = new StarfieldManager(scene);
const explosionManager = new ExplosionManager(scene);
const spaceEnvironment = new SpaceEnvironment(scene);
const progressionManager = new ProgressionManager();

// =========================================
// UI & HUD
// =========================================
const overlay = document.getElementById('overlay');
const scoreVal = document.getElementById('score-val');
const levelVal = document.getElementById('level-val');
const livesVal = document.getElementById('lives-val');

function updateHUD() {
    if (scoreVal) scoreVal.textContent = score.toString().padStart(7, '0');
    if (levelVal) levelVal.textContent = level;
    if (livesVal) livesVal.textContent = '❤️'.repeat(Math.max(0, lives));
}

// =========================================
// GAME LOGIC
// =========================================
async function initGame() {
    soundManager.init();
    await enemyManager.init();
}

function startGame() {
    if (currentState === GAME_STATE.PLAYING) return;

    currentState = GAME_STATE.PLAYING;
    score = 0;
    level = 1;
    lives = 3;

    if (overlay) overlay.style.display = 'none';

    player.mesh.position.set(0, -1, 8);
    enemyManager.clearAllEnemies?.();
    enemyManager.spawnWave?.(player);

    soundManager.play('nave', true);
    updateHUD();
}

function handleShoot() {
    if (currentState !== GAME_STATE.PLAYING) return;
    soundManager.play('laser');
    laserManager.fire(player.mesh, player.shipModel);
}

// =========================================
// EVENT LISTENERS
// =========================================
document.getElementById('start-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleShoot();
    }
});

// Throttling no resize para não sobrecarregar a CPU
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, 200);
});

// =========================================
// MAIN LOOP
// =========================================
let lastTime = 0;

function animate(now) {
    requestAnimationFrame(animate);

    const deltaTime = Math.min((now - lastTime) / 1000, 0.1); 
    lastTime = now;

    if (currentState === GAME_STATE.PLAYING) {
        const input = inputManager.update();
        
        player.update(input, deltaTime);
        laserManager.update(player.mesh, deltaTime);
        
        enemyManager.update(laserManager, (points) => {
            score += points;
            if (progressionManager.addScore(points)) {
                level = progressionManager.getLevel();
                updateHUD();
            }
            updateHUD();    
        }, player, deltaTime);

        explosionManager.update(deltaTime);
        starfieldManager.update(deltaTime);
        
        if (spaceEnvironment.update) spaceEnvironment.update(deltaTime);

        // Suavização da Câmera (Interpolação Linear Simples)
        const targetCamX = player.mesh.position.x * 0.2;
        const targetCamY = 5 + (player.mesh.position.y * 0.15);
        
        camera.position.x += (targetCamX - camera.position.x) * 0.05;
        camera.position.y += (targetCamY - camera.position.y) * 0.05;
        camera.lookAt(player.mesh.position.x * 0.5, player.mesh.position.y, -50);
    }

    renderer.render(scene, camera);
}

// =========================================
// RUN
// =========================================
initGame().then(() => {
    animate(0);
    if (overlay) overlay.style.display = 'flex';
});

// No final do seu arquivo principal
function initMobileControls() {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        document.getElementById('mobile-controls').style.display = 'block';
    }
}

window.addEventListener('load', initMobileControls);