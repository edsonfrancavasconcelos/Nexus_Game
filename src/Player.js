import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Player {
    constructor(scene, laserManager) { // Recebe o laserManager
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
            const model = gltf.scene;
            model.scale.set(2, 2, 2);
            model.rotation.set(0, Math.PI, 0);

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // Otimização de material para mobile
                    if(child.material) child.material.precision = "mediump";
                }
            });

            this.shipModel = model;
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
        this.topLight = topLight;
    }

    _createGunPositions() {
        // Posições relativas ao shipModel
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
            // Usamos isFiring = true para o update() cuidar do resto
            shootBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.isFiring = true; });
            shootBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.isFiring = false; });
            shootBtn.addEventListener('mousedown', () => this.isFiring = true);
            shootBtn.addEventListener('mouseup', () => this.isFiring = false);
        }
    }

    _shoot() {
        if (this.isPaused || !this.laserManager) return;

        const now = Date.now();
        if (now - this.lastShotTime < this.fireRate) return;
        this.lastShotTime = now;

        // Delegamos a criação do tiro para o LaserManager
        // Ele vai usar as posições das armas que definimos aqui
        [this.gunLeft, this.gunRight, this.gunNose].forEach(pos => {
            this.laserManager.fire(this.mesh, pos); 
        });
    }

    update(moveInput, deltaTime) { 
        if (!this.shipModel || this.isPaused) return;

        // Movimentação (DeltaTime garante velocidade igual em qualquer celular)
        const moveX = moveInput.x * this.speed * (deltaTime * 60);
        const moveY = moveInput.y * this.speed * (deltaTime * 60);

        this.mesh.position.x += moveX;
        this.mesh.position.y += moveY;

        // Rotação estilizada
        this.mesh.rotation.z += (-moveInput.x * 0.6 - this.mesh.rotation.z) * 0.08;
        this.mesh.rotation.x += (moveInput.y * 0.25 - this.mesh.rotation.x) * 0.08;

        // Lógica de Tiro
        if (this.isFiring) this._shoot();

        // Animação visual (Luzes)
        const time = Date.now() * 0.003;
        if (this.fuselageLight) this.fuselageLight.intensity = 110 + Math.sin(time * 2) * 20;
        
        this.thrusters.forEach((t) => {
            t.core.scale.set(0.8, 1 + Math.sin(time * 10) * 0.1, 0.8);
            t.light.intensity = 100 + Math.sin(time * 50) * 30;
        });
    }
}