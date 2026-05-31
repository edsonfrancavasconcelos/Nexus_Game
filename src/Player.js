import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, laserManager) {
        this.scene = scene;
        this.laserManager = laserManager;
        
        this.isFiring = false;
        this.isPaused = false;

        this.mesh = new THREE.Group();
        this.mesh.name = "playerShip";

        this.shipModel = null;
        this.speed = 0.90;

        this.thrusters = [];
        this.lastShotTime = 0;
        this.fireRate = 110;

        this.mesh.position.set(0, 3, 0);
        this.scene.add(this.mesh);

        this._loadModel();
        this._initKeyboard();
        this._initTouchControls();
    }

    _loadModel() {
        const loader = new GLTFLoader();
        loader.load('/assets/models/nave_game.glb', (gltf) => {
            this.shipModel = gltf.scene;
            this.shipModel.scale.set(2, 2, 2);
            this.shipModel.rotation.set(0, Math.PI, 0);

            this.shipModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if(child.material) child.material.precision = "mediump";
                }
            });

            this.mesh.add(this.shipModel);
            this._createPlasmaThrusters();
            this._createGunPositions();
            this._createNavigationLights();
        });
    }

    // ... (Métodos _createNavigationLights, _createGunPositions e _createPlasmaThrusters mantidos) ...

    _createGunPositions() {
        this.gunLeft = new THREE.Vector3(-8.2, 1.6, -7.5);
        this.gunRight = new THREE.Vector3(8.2, 1.6, -7.5);
        this.gunNose = new THREE.Vector3(0, 2.2, -11.0);
    }

    _initTouchControls() {
        const shootBtn = document.getElementById('shootBtn');
        if (shootBtn) {
            // Adicionamos 'pointerdown' para cobrir tanto touch quanto mouse
            shootBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.isFiring = true; });
            shootBtn.addEventListener('pointerup', (e) => { e.preventDefault(); this.isFiring = false; });
            shootBtn.addEventListener('pointerleave', (e) => { this.isFiring = false; });
        }
    }

    _shoot() {
        if (this.isPaused || !this.laserManager) return;

        const now = Date.now();
        if (now - this.lastShotTime < this.fireRate) return;
        this.lastShotTime = now;

        // CORREÇÃO: Passamos o this.mesh (o container) e o shipModel
        // para que o LaserManager possa calcular a posição real no espaço
        [this.gunLeft, this.gunRight, this.gunNose].forEach(pos => {
            this.laserManager.fire(this.mesh, this.shipModel); 
        });
    }

    update(moveInput, deltaTime) { 
        if (!this.shipModel || this.isPaused) return;

        // Movimentação
        this.mesh.position.x += moveInput.x * this.speed * (deltaTime * 60);
        this.mesh.position.y += moveInput.y * this.speed * (deltaTime * 60);

        this.mesh.rotation.z += (-moveInput.x * 0.6 - this.mesh.rotation.z) * 0.08;
        this.mesh.rotation.x += (moveInput.y * 0.25 - this.mesh.rotation.x) * 0.08;

        if (this.isFiring) this._shoot();

        // Animação visual...
    }
}