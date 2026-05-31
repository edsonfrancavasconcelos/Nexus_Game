import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --- GEOMETRIAS E MATERIAIS PRÉ-CARREGADOS ---
const BULLET_GEO = new THREE.CylinderGeometry(0.2, 0.2, 18, 5);
const BULLET_MAT = new THREE.MeshBasicMaterial({
    color: 0x00eeff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
});

const FLASH_GEO = new THREE.SphereGeometry(1, 8, 8);
const FLASH_MAT = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
});

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.isFiring = false;
        this.isPaused = false;           // ← Novo: Controle de Pause

        this.mesh = new THREE.Group();
        this.mesh.name = "playerShip";

        this.shipModel = null;
        this.speed = 0.90;

        this.thrusters = [];
        this.bullets = [];
        this.muzzleFlashes = [];
        
        this.lastShotTime = 0;
        this.fireRate = 110;

        this.mesh.position.set(0, 3, 0);
        this.scene.add(this.mesh);

        this._loadModel();
        this._initKeyboard();
        this._initTouchControls();       // ← Novo: Controles Mobile
        this._tempV3 = new THREE.Vector3();
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

    // ==================== CONTROLES MOBILE ====================
    _initTouchControls() {
        this.shootButton = document.getElementById('shootBtn');
        this.pauseButton = document.getElementById('pauseBtn');

        if (this.shootButton) {
            const startFire = () => { this.isFiring = true; };
            const stopFire = () => { this.isFiring = false; };

            this.shootButton.addEventListener('touchstart', startFire);
            this.shootButton.addEventListener('mousedown', startFire);

            this.shootButton.addEventListener('touchend', stopFire);
            this.shootButton.addEventListener('mouseup', stopFire);
            this.shootButton.addEventListener('mouseleave', stopFire);
        }

        if (this.pauseButton) {
            this.pauseButton.addEventListener('click', () => {
                this.isPaused = !this.isPaused;
                
                if (this.pauseButton) {
                    this.pauseButton.textContent = this.isPaused ? '▶' : '⏸';
                    this.pauseButton.style.backgroundColor = this.isPaused ? '#22c55e' : '#ef4444';
                }
            });
        }
    }

    _shoot() {
        if (this.isPaused) return;

        const now = Date.now();
        if (now - this.lastShotTime < this.fireRate) return;
        this.lastShotTime = now;

        [this.gunLeft, this.gunRight, this.gunNose].forEach(pos => {
            this._createBullet(pos);
            this._createMuzzleFlash(pos);
        });
    }

    _createBullet(gunPos) {
        const bullet = new THREE.Mesh(BULLET_GEO, BULLET_MAT);
        bullet.rotation.x = Math.PI / 2;
        bullet.position.copy(gunPos).applyMatrix4(this.shipModel.matrixWorld);
        
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        bullet.userData.velocity = direction.multiplyScalar(8.5);

        this.scene.add(bullet);
        this.bullets.push(bullet);
    }

    _createMuzzleFlash(gunPos) {
        const worldPos = this._tempV3.copy(gunPos).applyMatrix4(this.shipModel.matrixWorld);
        const flashMesh = new THREE.Mesh(FLASH_GEO, FLASH_MAT.clone());
        flashMesh.position.copy(worldPos);
        this.scene.add(flashMesh);

        const flashLight = new THREE.PointLight(0x00eeff, 20, 15);
        flashLight.position.copy(worldPos);
        this.scene.add(flashLight);

        this.muzzleFlashes.push({ mesh: flashMesh, light: flashLight, life: 1.0 });
    }

    update(moveInput) { 
        if (!this.shipModel || this.isPaused) return;

        // Movimentação
        this.mesh.position.x += moveInput.x * this.speed;
        this.mesh.position.y += moveInput.y * this.speed;
        this.mesh.rotation.z += (-moveInput.x * 0.6 - this.mesh.rotation.z) * 0.08;
        this.mesh.rotation.x += (moveInput.y * 0.25 - this.mesh.rotation.x) * 0.08;

        // Tiro
        if (this.isFiring) this._shoot();

        // Atualização das balas
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.position.add(b.userData.velocity);
            if (b.position.lengthSq() > 1000000) {
                this.scene.remove(b);
                this.bullets.splice(i, 1);
            }
        }

        // Animações de luzes e thrusters
        const time = Date.now() * 0.003;
        
        if (this.fuselageLight) {
            this.fuselageLight.intensity = 110 + Math.sin(time * 2) * 20;
        }
        if (this.topLight) {
            this.topLight.intensity = 90 + Math.cos(time * 1.5) * 15;
        }

        this.thrusters.forEach((t) => {
            t.core.scale.set(0.8, 1 + Math.sin(time * 10) * 0.1, 0.8);
            t.light.intensity = 100 + Math.sin(time * 50) * 30;
        });
    }
}