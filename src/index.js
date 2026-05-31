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
let score = 0, level = 1, lives = 3;

// =========================================
// RENDERER OTIMIZADO (O segredo da fluidez)
// =========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010103);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 5, 55);

const renderer = new THREE.WebGLRenderer({ 
    antialias: false,        // DESATIVADO: Melhora muito o FPS
    powerPreference: "high-performance",
    precision: "lowp"        // Cálculos simplificados para CPUs fracas
});

// Força uma resolução menor para não travar em telas muito grandes
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2)); 
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false; // Sombras pesam demais, mantemos desligado
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
    score = 0; level = 1; lives = 3;
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

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// =========================================
// LOOP DE ANIMAÇÃO OTIMIZADO
// =========================================
let lastTime = 0;

function animate(now) {
    requestAnimationFrame(animate);

    // Limita o deltaTime para evitar "pulos" na tela
    const deltaTime = Math.min((now - lastTime) / 1000, 0.05); 
    lastTime = now;

    if (currentState === GAME_STATE.PLAYING) {
        const input = inputManager.update();
        
        player.update(input, deltaTime);
        laserManager.update(player.mesh, deltaTime);
        
        enemyManager.update(laserManager, (points) => {
            score += points;
            if (progressionManager.addScore(points)) level = progressionManager.getLevel();
            updateHUD();    
        }, player, deltaTime);

        explosionManager.update(deltaTime);
        starfieldManager.update(deltaTime);
        if (spaceEnvironment.update) spaceEnvironment.update(deltaTime);

        // Chase Cam simplificada
        camera.position.x += (player.mesh.position.x * 0.15 - camera.position.x) * 0.05;
        camera.lookAt(player.mesh.position.x * 0.5, 0, -50);
    }

    renderer.render(scene, camera);
}

initGame().then(() => {
    animate(0);
    if (overlay) overlay.style.display = 'flex';
});