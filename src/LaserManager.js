import * as THREE from 'three';

// Geometria única para todos os lasers (reutilizada)
const LASER_GEO = new THREE.CylinderGeometry(0.2, 0.2, 8, 6);
LASER_GEO.rotateX(Math.PI / 2); // Rotaciona uma única vez na memória

export class LaserManager {
    constructor(scene) {
        this.scene = scene;
        this.lasers = [];
        this.laserSpeed = 6.0;

        // Materiais pré-criados
        this.matCyan = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.matWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // HUD / Mira
        this.hudGroup = new THREE.Group();
        this.hudMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 });
        const ringGeo = new THREE.RingGeometry(1.5, 1.8, 32);
        const ring = new THREE.Mesh(ringGeo, this.hudMaterial);
        this.hudGroup.add(ring);
        this.scene.add(this.hudGroup);

        // Offsets fixos das armas
        this.gunOffsets = [
            new THREE.Vector3(0, 2.2, -11.0),   // Bico
            new THREE.Vector3(-8.2, 1.6, -7.5), // Asa Esquerda
            new THREE.Vector3(8.2, 1.6, -7.5)   // Asa Direita
        ];

        // Objetos temporários para cálculos (evita criar lixo na memória)
        this._workingVec = new THREE.Vector3();
        this._targetVec = new THREE.Vector3();
    }

    fire(playerMesh, shipModel) {
        if (!shipModel) return;

        for (let i = 0; i < this.gunOffsets.length; i++) {
            const offset = this.gunOffsets[i];
            
            // Calcula posição mundial da arma sem clonar o offset
            const worldGunPos = this._workingVec.copy(offset).applyMatrix4(shipModel.matrixWorld);
            
            // Reutiliza geometria e seleciona material pré-definido
            const laser = new THREE.Mesh(LASER_GEO, i === 0 ? this.matWhite : this.matCyan);
            
            laser.position.copy(worldGunPos);
            
            // Direção do disparo em direção à mira (HUD)
            const direction = new THREE.Vector3();
            direction.subVectors(this.hudGroup.position, worldGunPos).normalize();

            // Orientação do laser
            laser.lookAt(this.hudGroup.position);

            laser.userData = { 
                direction: direction, 
                life: 120 
            };

            this.scene.add(laser);
            this.lasers.push(laser);
        }
    }

    update(playerMesh) {
        if (!playerMesh) return;

        // Atualiza Mira (HUD) 150m à frente
        // Usamos _targetVec para não criar "new Vector3" todo frame
        this._targetVec.set(0, 0, -150).applyMatrix4(playerMesh.matrixWorld);
        
        this.hudGroup.position.lerp(this._targetVec, 0.2);
        this.hudGroup.lookAt(playerMesh.position);

        // Atualiza Lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            
            // Move o laser usando a direção salva
            laser.position.addScaledVector(laser.userData.direction, this.laserSpeed);
            laser.userData.life--;

            // Remove se a vida acabar
            if (laser.userData.life <= 0) {
                this.scene.remove(laser);
                // Importante: NÃO damos dispose na geometria aqui porque ela é compartilhada!
                this.lasers.splice(i, 1);
            }
        }
    }
}