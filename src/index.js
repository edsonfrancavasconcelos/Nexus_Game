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
let score = 0, level = 1;

// =========================================
// RENDERER OTIMIZADO (Foco em Performance)
// =========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010103);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 5, 55);

const renderer = new THREE.WebGLRenderer({ 
    antialias: false,        // Essencial para rodar em celular sem travar
    powerPreference: "high-performance",
    precision: "lowp" 
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2)); 
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false; 
document.body.appendChild(renderer.domElement);

// =========================================
// MANAGERS
// =========================================
const soundManager = new SoundManager();
const inputManager = new InputManager(); // Garanta que este manager suporte o joystick do HTML
const player = new Player(scene);
const laserManager = new LaserManager(scene);
const enemyManager = new EnemyManager(scene, camera);
const starfieldManager = new StarfieldManager(scene);
const explosionManager = new ExplosionManager(scene);
const spaceEnvironment = new SpaceEnvironment(scene);
const progressionManager = new ProgressionManager();

const overlay = document.getElementById('overlay');
const scoreVal = document.getElementById('score-val');

// --- Elementos Mobile ---
const shootBtn = document.getElementById('shootBtn');
const pauseBtn = document.getElementById('pauseBtn');

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

function handleShoot() {
    if (currentState !== GAME_STATE.PLAYING) return;
    
    // FORÇAMOS a atualização da matriz antes de atirar
    // Sem isso, o laser nasce na posição "antiga" da nave
    player.mesh.updateMatrixWorld(); 
    if (player.shipModel) player.shipModel.updateMatrixWorld();

    soundManager.play('laser');
    laserManager.fire(player.mesh, player.shipModel);
}

// =========================================
// EVENTOS DE CONTROLE (PC E MOBILE)
// =========================================

// Botão Iniciar (Menu)
document.getElementById('start-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
});

// Teclado
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleShoot();
    }
});

// Botão de Tiro Mobile (🔥 FIRE)
if (shootBtn) {
    shootBtn.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Bloqueia gestos do navegador
        handleShoot();
    }, { passive: false });
}

// Botão de Pause Mobile (⏸)
if (pauseBtn) {
    pauseBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (currentState === GAME_STATE.PLAYING) {
            currentState = GAME_STATE.MENU;
            if (overlay) overlay.style.display = 'flex';
        } else {
            startGame();
        }
    }, { passive: false });
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// =========================================
// LOOP DE ANIMAÇÃO
// =========================================
let lastTime = 0;

function animate(now) {
    requestAnimationFrame(animate);

    const deltaTime = Math.min((now - lastTime) / 1000, 0.05); 
    lastTime = now;

    if (currentState === GAME_STATE.PLAYING) {
        const input = inputManager.update(); 
        
        player.update(input, deltaTime);
        
        // IMPORTANTE: O laserManager precisa do deltaTime para mover os lasers rápido o suficiente
        laserManager.update(player.mesh, deltaTime);
        
        // Passamos o laserManager completo para o enemyManager ter acesso à lista .lasers
        enemyManager.update(laserManager, (points) => {
            score += points;
            updateHUD();    
        }, player, deltaTime);

        explosionManager.update(deltaTime);
        starfieldManager.update(deltaTime);
        if (spaceEnvironment.update) spaceEnvironment.update(deltaTime);

        // Suavização da Câmera
        camera.position.x += (player.mesh.position.x * 0.2 - camera.position.x) * 0.1;
        
        // Olhamos um pouco mais para baixo para ver os lasers atingindo
        camera.lookAt(player.mesh.position.x * 0.5, 0, -100);
    }

    renderer.render(scene, camera);
}

initGame().then(() => {
    animate(0);
    if (overlay) overlay.style.display = 'flex';
});