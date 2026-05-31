import * as THREE from 'three';

// Geometria única
const LASER_GEO = new THREE.CylinderGeometry(0.5, 0.5, 12, 6);
LASER_GEO.rotateX(Math.PI / 2); 

export class LaserManager {
    constructor(scene) {
        this.scene = scene;
        this.lasers = [];
        // Aumentei a velocidade drasticamente (de 6 para 800)
        this.laserSpeed = 850.0; 

        this.matCyan = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.matWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

        this.hudGroup = new THREE.Group();
        this.hudMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
        const ringGeo = new THREE.RingGeometry(1.5, 1.8, 32);
        const ring = new THREE.Mesh(ringGeo, this.hudMaterial);
        this.hudGroup.add(ring);
        this.scene.add(this.hudGroup);

        this.gunOffsets = [
            new THREE.Vector3(0, 2.2, -11.0),
            new THREE.Vector3(-8.2, 1.6, -7.5),
            new THREE.Vector3(8.2, 1.6, -7.5)
        ];

        this._workingVec = new THREE.Vector3();
        this._targetVec = new THREE.Vector3();
    }

    fire(playerMesh, shipModel) {
        if (!shipModel) return;

        for (let i = 0; i < this.gunOffsets.length; i++) {
            const offset = this.gunOffsets[i];
            const worldGunPos = new THREE.Vector3().copy(offset).applyMatrix4(shipModel.matrixWorld);
            
            const laser = new THREE.Mesh(LASER_GEO, i === 0 ? this.matWhite : this.matCyan);
            laser.position.copy(worldGunPos);
            
            // Direção em direção à mira
            const direction = new THREE.Vector3();
            direction.subVectors(this.hudGroup.position, worldGunPos).normalize();

            laser.lookAt(this.hudGroup.position);

            laser.userData = { 
                direction: direction, 
                life: 3.0 // 3 segundos de vida (mais que suficiente)
            };

            this.scene.add(laser);
            this.lasers.push(laser);
        }
    }

    update(playerMesh, deltaTime) {
        if (!playerMesh || !deltaTime) return;

        // Atualiza Mira (HUD)
        this._targetVec.set(0, 0, -200).applyMatrix4(playerMesh.matrixWorld);
        this.hudGroup.position.lerp(this._targetVec, 0.2);
        this.hudGroup.lookAt(playerMesh.position);

        // Atualiza Lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            
            // AGORA USA DELTATIME: O movimento fica suave e alcança as inimigas
            laser.position.addScaledVector(laser.userData.direction, this.laserSpeed * deltaTime);
            
            laser.userData.life -= deltaTime;

            // Remove se a vida acabar ou se fugir muito do mapa
            if (laser.userData.life <= 0 || laser.position.z < -2000) {
                this.scene.remove(laser);
                this.lasers.splice(i, 1);
            }
        }
    }
}