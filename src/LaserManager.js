import * as THREE from 'three';

// Geometria única compartilhada
const LASER_GEO = new THREE.CylinderGeometry(0.3, 0.3, 12, 6); // Aumentado um pouco para visibilidade
LASER_GEO.rotateX(Math.PI / 2); 

export class LaserManager {
    constructor(scene) {
        this.scene = scene;
        this.lasers = [];
        this.laserSpeed = 800.0; // Velocidade em unidades por segundo

        // Materiais com emissivo para brilhar no escuro
        this.matCyan = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.matWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // HUD / Mira
        this.hudGroup = new THREE.Group();
        const ringGeo = new THREE.RingGeometry(1.5, 1.8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
        this.hudGroup.add(new THREE.Mesh(ringGeo, ringMat));
        this.scene.add(this.hudGroup);

        // Offsets fixos das armas
        this.gunOffsets = [
            new THREE.Vector3(0, 2.2, -11.0),   // Bico
            new THREE.Vector3(-8.2, 1.6, -7.5), // Asa Esquerda
            new THREE.Vector3(8.2, 1.6, -7.5)   // Asa Direita
        ];

        this._workingVec = new THREE.Vector3();
        this._targetVec = new THREE.Vector3();
    }

    fire(playerMesh, shipModel) {
        if (!shipModel) return;

        // Pegamos a matriz mundial do modelo para posicionar os tiros
        shipModel.updateMatrixWorld();

        for (let i = 0; i < this.gunOffsets.length; i++) {
            const offset = this.gunOffsets[i];
            const worldGunPos = new THREE.Vector3().copy(offset).applyMatrix4(shipModel.matrixWorld);
            
            const laser = new THREE.Mesh(LASER_GEO, i === 0 ? this.matWhite : this.matCyan);
            laser.position.copy(worldGunPos);
            
            // Direção: Mira (HUD) - Posição da Arma
            const direction = new THREE.Vector3();
            direction.subVectors(this.hudGroup.position, worldGunPos).normalize();

            laser.lookAt(this.hudGroup.position);

            laser.userData = { 
                direction: direction, 
                life: 2.0 // Vida em segundos, não em frames
            };

            this.scene.add(laser);
            this.lasers.push(laser);
        }
    }

    update(playerMesh, deltaTime) {
        if (!playerMesh || !deltaTime) return;

        // 1. Atualiza Mira (HUD) - 180m à frente para facilitar o tiro à distância
        this._targetVec.set(0, 0, -180).applyMatrix4(playerMesh.matrixWorld);
        this.hudGroup.position.lerp(this._targetVec, 0.15);
        this.hudGroup.lookAt(playerMesh.position);

        // 2. Atualiza Lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            const data = laser.userData;

            // Movimento baseado em deltaTime (Consistência de velocidade)
            laser.position.addScaledVector(data.direction, this.laserSpeed * deltaTime);
            
            data.life -= deltaTime;

            // Cleanup
            if (data.life <= 0) {
                this.scene.remove(laser);
                this.lasers.splice(i, 1);
            }
        }
    }

    // Limpa tudo ao reiniciar o jogo
    clear() {
        this.lasers.forEach(l => this.scene.remove(l));
        this.lasers = [];
    }
}