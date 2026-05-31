import * as THREE from 'three';
import { unzipSync, strFromU8 } from 'fflate';

// Configuração única para fflate
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

// --- DECLARAÇÕES GLOBAIS ---
let audioInitialized = false;
let currentState = 'menu';
let score = 0;

const GAME_STATE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'game_over' };

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010103);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(0, 5, 55);

// Adicionando o AudioListener aqui (O "ouvido" do jogo)
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", precision: "mediump" });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Instanciamento
const soundManager = new SoundManager(audioListener); // Passando o listener
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
    // soundManager já deve receber o listener no constructor ou via init
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
        
        if (inputManager.keys.Space) {
            if (!player.lastFireTime || now - player.lastFireTime > 250) {
                laserManager.fire(player.mesh, player.mesh);
                soundManager.play('laser');
                player.lastFireTime = now;
            }
        }
        
        player.update(input, deltaTime);
        laserManager.update(player.mesh, deltaTime);
        
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

// --- INICIALIZAÇÃO ---
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-btn')?.addEventListener('click', () => {
        // Tenta desbloquear o áudio do navegador (Contexto)
        if (!audioInitialized) {
            soundManager.init(); 
            audioInitialized = true;
        }
        startGame();
    });

    initGame().then(() => animate(0));
});