import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, laserManager) { 
        this.scene = scene;
        this.laserManager = laserManager; 
        this.isFiring = false;
        this.mesh = new THREE.Group();
        this.shipModel = null;
        this.lastShotTime = 0;
        this.fireRate = 120;

        this.scene.add(this.mesh);
        this._loadModel();
    }

    _loadModel() {
        const loader = new GLTFLoader();
        loader.load('/assets/models/nave_game.glb', (gltf) => {
            this.shipModel = gltf.scene;
            this.mesh.add(this.shipModel);
        });
    }

    _shoot() {
        const now = Date.now();
        if (now - this.lastShotTime < this.fireRate) return;
        this.lastShotTime = now;

        // O segredo: usamos o manager injetado
        this.laserManager.fire(this.mesh, this.shipModel);
    }

    update(moveInput, deltaTime) {
        if (this.isFiring) this._shoot();
        // Lógica de movimento...
    }
}