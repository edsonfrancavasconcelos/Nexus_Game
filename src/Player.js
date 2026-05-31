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

    _createNavigationLights() {
        const bottomLight = new THREE.PointLight(0xaaffff, 120, 60);
        bottomLight.position.set(0, -2.5, -4);
        this.shipModel.add(bottomLight);

        const topLight = new THREE.PointLight(0xffffff, 100, 50);
        topLight.position.set(0, 4.5, -4);
        this.shipModel.add(topLight);

        this.fuselageLight = bottomLight;
    }

    _createGunPositions() {
        this.gunLeft = new THREE.Vector3(-8.2, 1.6, -7.5);
        this.gunRight = new THREE.Vector3(8.2, 1.6, -7.5);
        this.gunNose = new THREE.Vector3(0, 2.2, -11.0);
    }

    _createPlasmaThrusters() {
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0x66eeff,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
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
        const shootBtn = document.getElementById('shootBtn');
        if (shootBtn) {
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

        [this.gunLeft, this.gunRight, this.gunNose].forEach(pos => {
            this.laserManager.fire(this.mesh, this.shipModel); 
        });
    }

    update(moveInput, deltaTime) { 
        if (!this.shipModel || this.isPaused) return;

        this.mesh.position.x += moveInput.x * this.speed * (deltaTime * 60);
        this.mesh.position.y += moveInput.y * this.speed * (deltaTime * 60);

        this.mesh.rotation.z += (-moveInput.x * 0.6 - this.mesh.rotation.z) * 0.08;
        this.mesh.rotation.x += (moveInput.y * 0.25 - this.mesh.rotation.x) * 0.08;

        if (this.isFiring) this._shoot();

        const time = Date.now() * 0.003;
        if (this.fuselageLight) this.fuselageLight.intensity = 110 + Math.sin(time * 2) * 20;
        
        this.thrusters.forEach((t) => {
            t.core.scale.set(0.8, 1 + Math.sin(time * 10) * 0.1, 0.8);
            t.light.intensity = 100 + Math.sin(time * 50) * 30;
        });
    }
}