import * as THREE from 'three';

const LASER_GEO = new THREE.CylinderGeometry(0.3, 0.3, 10, 6);
const LASER_MAT = new THREE.MeshBasicMaterial({ color: 0x00ffff });

export class LaserManager {
    constructor(scene) {
        this.scene = scene;
        this.lasers = []; // A array que o EnemyManager vai ler
    }

    fire(playerMesh, shipModel) {
        // Criamos o laser na posição atual da nave
        const laser = new THREE.Mesh(LASER_GEO, LASER_MAT);
        
        // Sincroniza a posição com o bico da nave
        laser.position.copy(playerMesh.position);
        laser.rotation.x = Math.PI / 2;

        // userData guarda a velocidade para o update
        laser.userData.velocity = new THREE.Vector3(0, 0, -500); // Velocidade alta para colisão precisa

        this.scene.add(laser);
        this.lasers.push(laser);
    }

    update(playerMesh, deltaTime) {
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.position.z += laser.userData.velocity.z * deltaTime;

            // Remove se for longe demais
            if (laser.position.z < -500) {
                this.scene.remove(laser);
                this.lasers.splice(i, 1);
            }
        }
    }
}