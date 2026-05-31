import * as THREE from 'three';

// 1. Recursos Compartilhados (Instanciados apenas uma vez na vida do app)
const GEO = {
    debris: new THREE.DodecahedronGeometry(1.5, 0),
    smoke: new THREE.SphereGeometry(3, 6, 6)
};

// Materiais base (nós vamos clonar apenas o necessário para evitar conflitos de dispose)
const BASE_MATS = {
    debris: new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true, transparent: true }),
    smoke: new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.6 })
};

export class ExplosionManager {
    constructor(scene) {
        this.scene = scene;
        this.explosions = [];
        this.cameraRef = null;
        this.shakeIntensity = 0;
    }

    create(position, camera) {
        if (camera) this.cameraRef = camera;

        const group = new THREE.Group();
        group.position.copy(position);
        this.scene.add(group);

        const fragments = [];

        // Helper otimizado
        const addFragment = (geometry, material, count, isSmoke) => {
            // Criamos UM material por tipo de fragmento nesta explosão específica
            const instanceMat = material.clone();
            
            for (let i = 0; i < count; i++) {
                const mesh = new THREE.Mesh(geometry, instanceMat);
                const s = 0.5 + Math.random();
                mesh.scale.set(s, s, s);
                group.add(mesh);

                fragments.push({
                    mesh,
                    isSmoke,
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * (isSmoke ? 0.5 : 1.5),
                        Math.random() * (isSmoke ? 0.8 : 1.2),
                        (Math.random() - 0.5) * (isSmoke ? 0.5 : 1.5)
                    ),
                    gravity: isSmoke ? 0 : 0.05,
                    rot: new THREE.Vector3(Math.random() * 0.1, Math.random() * 0.1, Math.random() * 0.1)
                });
            }
        };

        // Adicionar Fragmentos (Contagem reduzida para estabilidade)
        addFragment(GEO.debris, BASE_MATS.debris, 10, false);
        addFragment(GEO.smoke, BASE_MATS.smoke, 8, true);

        // Luz com intensidade segura (PointLight consome muito, mantemos apenas 1)
        const mainLight = new THREE.PointLight(0xff4400, 50, 100);
        group.add(mainLight);

        this.shakeIntensity = 0.8; // Reduzido para não "deslocar" a câmera violentamente

        this.explosions.push({
            group,
            mainLight,
            fragments,
            life: 1.0,
            decay: 0.015 // Explosão dura um pouco mais para suavizar CPU
        });
    }

    update() {
        // Screenshake
        if (this.cameraRef && this.shakeIntensity > 0.01) {
            this.cameraRef.position.x += (Math.random() - 0.5) * this.shakeIntensity;
            this.cameraRef.position.y += (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= 0.9;
        }

        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.life -= exp.decay;

            // Update Luz
            exp.mainLight.intensity = exp.life * 50;

            // Update Fragmentos
            for (let j = 0; j < exp.fragments.length; j++) {
                const frag = exp.fragments[j];
                
                // Movimento
                frag.mesh.position.add(frag.velocity);
                if (frag.gravity > 0) frag.velocity.y -= frag.gravity;

                // Estética
                if (frag.isSmoke) {
                    frag.mesh.scale.multiplyScalar(1.01);
                    frag.mesh.material.opacity = exp.life * 0.5;
                } else {
                    frag.mesh.rotation.x += frag.rot.x;
                    frag.mesh.rotation.y += frag.rot.y;
                    frag.mesh.material.opacity = exp.life;
                }
            }

            // Finalização da explosão
            if (exp.life <= 0) {
                // Limpeza correta de memória
                this.scene.remove(exp.group);
                
                // Importante: Como clonamos o material no create, 
                // limpamos apenas as instâncias únicas aqui.
                const uniqueMaterials = new Set();
                exp.fragments.forEach(f => uniqueMaterials.add(f.mesh.material));
                uniqueMaterials.forEach(m => m.dispose());

                this.explosions.splice(i, 1);
            }
        }
    }
}