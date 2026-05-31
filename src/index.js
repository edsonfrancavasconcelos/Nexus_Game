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

const GAME_STATE = { MENU: 'menu', PLAYING: 'playing' };
let currentState = GAME_STATE.MENU;
let score = 0;

// =========================================
// RENDERER & SCENE
// =========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010103);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 2000); // Aumentei o far plane para 2000
camera.position.set(0, 5, 55);

const renderer = new THREE.WebGLRenderer({ 
    antialias: false,
    powerPreference: "high-performance",
    precision: "lowp" 
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2)); 
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// =========================================
// MANAGERS (ORDEM IMPORTANTE!)
// =========================================
const laserManager = new LaserManager(scene); // 1º: Criar o LaserManager
const player = new Player(scene, laserManager); // 2º: Injetar o laserManager no Player
const soundManager = new SoundManager();
const inputManager = new InputManager();
const enemyManager = new EnemyManager(scene, camera);
const starfieldManager = new StarfieldManager(scene);
const explosionManager = new ExplosionManager(scene);
const spaceEnvironment = new SpaceEnvironment(scene);
const progressionManager = new ProgressionManager();

const overlay = document.getElementById('overlay');
const scoreVal = document.getElementById('score-val');

function updateHUD() {
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
    if (overlay) overlay.style.display = 'none';
    
    player.mesh.position.set(0, -1, 8);
    enemyManager.clearAllEnemies?.();
    enemyManager.spawnWave?.(player);
    
    soundManager.play('nave', true);
    updateHUD();
}

// Essa função agora garante que o Player use o sistema central de lasers
function handleShoot() {
    if (currentState !== GAME_STATE.PLAYING) return;
    
    // Atualiza matrizes para o laser sair do lugar certo
    player.mesh.updateMatrixWorld(); 
    if (player.shipModel) player.shipModel.updateMatrixWorld();

    soundManager.play('laser');
    // Chama o tiro através do laserManager (usado pela colisão)
    laserManager.fire(player.mesh, player.shipModel);
}

// =========================================
// CONTROLES
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

// Mobile
const shootBtn = document.getElementById('shootBtn');
if (shootBtn) {
    shootBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleShoot();
    }, { passive: false });
}

// =========================================
// LOOP PRINCIPAL
// =========================================
let lastTime = 0;

function animate(now) {
    requestAnimationFrame(animate);

    const deltaTime = Math.min((now - lastTime) / 1000, 0.05); 
    lastTime = now;

    if (currentState === GAME_STATE.PLAYING) {
        const input = inputManager.update(); 
        
        player.update(input, deltaTime);
        laserManager.update(player.mesh, deltaTime);
        
        // SISTEMA DE COLISÃO REFORÇADO
        enemyManager.update(laserManager, (points) => {
            score += points;
            updateHUD();    
        }, player, deltaTime);

        explosionManager.update(deltaTime);
        starfieldManager.update(deltaTime);
        if (spaceEnvironment.update) spaceEnvironment.update(deltaTime);

        // Chase Cam
        camera.position.x += (player.mesh.position.x * 0.2 - camera.position.x) * 0.1;
        camera.lookAt(player.mesh.position.x * 0.5, 0, -100);
    }

    renderer.render(scene, camera);
}

initGame().then(() => {
    animate(0);
});