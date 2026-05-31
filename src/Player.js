import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --- GEOMETRIAS E MATERIAIS PARA EFEITOS VISUAIS ---
const FLASH_GEO = new THREE.SphereGeometry(1, 8, 8);
const FLASH_MAT = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
});

export class Player {
    // 1. ADICIONAMOS o laserManager no constructor
    constructor(scene, laserManager) { 
        this.scene = scene;
        this.laserManager = laserManager; // Agora o Player conhece o gerente de lasers
        
        this.isFiring = false;
        this.isPaused = false;

        this.mesh = new THREE.Group();
        this.mesh.name = "playerShip";

        this.shipModel = null;
        this.speed = 0.90;

        this.thrusters = [];
        this.muzzleFlashes = []; // Mantemos apenas os flashes visuais
        
        this.lastShotTime = 0;
        this.fireRate = 110;

        this.mesh.position.set(0, 3, 0);
        this.scene.add(this.mesh);

        this._loadModel();
        this._initKeyboard();
        this._initTouchControls();
        this._tempV3 = new THREE.Vector3();
    }

    _loadModel() {
        const loader = new GLTFLoader();
        // Corrigido o caminho para ser relativo ao root se necessário
        loader.load('/assets/models/nave_game.glb', (gltf) => {
            const model = gltf.scene;
            model.scale.set(2, 2, 2);
            model.rotation.set(0, Math.PI, 0);

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.shipModel = model;
            this.mesh.add(this.shipModel);

            this._createPlasmaThrusters();
            this._createGunPositions();
            this._createNavigationLights();
        });
    }

    _createGunPositions() {
        this.gunPositions = [
            new THREE.Vector3(-8.2, 1.6, -7.5),
            new THREE.Vector3(8.2, 1.6, -7.5),
            new THREE.Vector3(0, 2.2, -11.0)
        ];
    }

    // ... (Mantive as luzes e thrusters como você enviou)
    _createNavigationLights() {
        const bottomLight = new THREE.PointLight(0xaaffff, 120, 60);
        bottomLight.position.set(0, -2.5, -4);
        this.shipModel.add(bottomLight);
        const topLight = new THREE.PointLight(0xffffff, 100, 50);
        topLight.position.set(0, 4.5, -4);
        this.shipModel.add(topLight);
        this.fuselageLight = bottomLight;
        this.topLight = topLight;
    }

    _createPlasmaThrusters() {
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0x66eeff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
        });
        const coreGeo = new THREE.ConeGeometry(0.99, 3.0, 16);
        const pos = new THREE.Vector3(0, 2.0, -9.8);
        const core = new THREE.Mesh(coreGeo, coreMat);
        const light = new THREE.PointLight(0x33ddff, 120, 100);
        core.position.copy(pos);
        light.position.copy(pos);
        core.rotation.x = Math.PI / 2;
        this.shipModel.add(core);
        this.shipModel.add(light);
        this.thrusters.push({ core, light });
    }

    _initKeyboard() {
        const handleKey = (e, val) => {
            if (e.code === 'KeyF' || e.code === 'Space') this.isFiring = val;
        };
        window.addEventListener('keydown', (e) => handleKey(e, true));
        window.addEventListener('keyup', (e) => handleKey(e, false));
    }

    _initTouchControls() {
        this.shootButton = document.getElementById('shootBtn');
        this.pauseButton = document.getElementById('pauseBtn');
        if (this.shootButton) {
            const startFire = () => { this.isFiring = true; };
            const stopFire = () => { this.isFiring = false; };
            this.shootButton.addEventListener('touchstart', (e) => { e.preventDefault(); startFire(); });
            this.shootButton.addEventListener('touchend', stopFire);
        }
    }

    // 2. MÉTODO DE TIRO CORRIGIDO
    _shoot() {
        if (this.isPaused || !this.shipModel) return;

        const now = Date.now();
        if (now - this.lastShotTime < this.fireRate) return;
        this.lastShotTime = now;

        // Chamamos o LaserManager OFICIAL para criar os lasers que matam inimigos
        this.laserManager.fire(this.mesh, this.shipModel);

        // Criamos apenas os flashes visuais nas armas
        this.gunPositions.forEach(pos => {
            this._createMuzzleFlash(pos);
        });
    }

    _createMuzzleFlash(gunPos) {
        const worldPos = this._tempV3.copy(gunPos).applyMatrix4(this.shipModel.matrixWorld);
        const flashMesh = new THREE.Mesh(FLASH_GEO, FLASH_MAT.clone());
        flashMesh.position.copy(worldPos);
        this.scene.add(flashMesh);

        // Auto-destruição do flash
        setTimeout(() => {
            this.scene.remove(flashMesh);
        }, 50);
    }

    update(moveInput, deltaTime) { 
        if (!this.shipModel || this.isPaused) return;

        // Movimentação
        this.mesh.position.x += moveInput.x * this.speed;
        this.mesh.position.y += moveInput.y * this.speed;
        
        // Inclinação visual
        this.mesh.rotation.z += (-moveInput.x * 0.6 - this.mesh.rotation.z) * 0.08;
        this.mesh.rotation.x += (moveInput.y * 0.25 - this.mesh.rotation.x) * 0.08;

        // Tiro
        if (this.isFiring) this._shoot();

        // Atualização de efeitos visuais (thrusters)
        const time = Date.now() * 0.003;
        this.thrusters.forEach((t) => {
            t.core.scale.set(0.8, 1 + Math.sin(time * 10) * 0.1, 0.8);
            t.light.intensity = 100 + Math.sin(time * 50) * 30;
        });
    }
}