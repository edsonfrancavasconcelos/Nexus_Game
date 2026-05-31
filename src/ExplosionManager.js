import * as THREE from 'three';

const GEO = {
    debris: new THREE.DodecahedronGeometry(1.8, 0),
    smoke: new THREE.SphereGeometry(4, 8, 8)
};

const BASE_MATS = {
    debris: new THREE.MeshLambertMaterial({ 
        color: 0xff8800, 
        flatShading: true, 
        transparent: true,
        emissive: 0xff4400,
        emissiveIntensity: 0.6
    }),
    smoke: new THREE.MeshBasicMaterial({ 
        color: 0x666666, 
        transparent: true, 
        opacity: 0.7,
        depthWrite: false
    })
};

export class ExplosionManager {
    constructor(scene) {
        this.scene = scene;
        this.explosions = [];
    }

    create(position, camera = null) {
        if (!position) {
            console.warn("Explosion created without position!");
            position = new THREE.Vector3(0, 0, 0);
        }

        const group = new THREE.Group();
        group.position.copy(position);
        this.scene.add(group);

        const fragments = [];

        const addFragment = (geometry, material, count, isSmoke) => {
            for (let i = 0; i < count; i++) {
                const mat = material.clone();
                const mesh = new THREE.Mesh(geometry, mat);

                const s = isSmoke ? (2 + Math.random() * 3) : (0.6 + Math.random() * 1.2);
                mesh.scale.set(s, s, s);
                
                // Posição inicial aleatória
                mesh.position.set(
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 3
                );

                group.add(mesh);

                fragments.push({
                    mesh,
                    isSmoke,
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * (isSmoke ? 6 : 14),
                        (Math.random() - 0.5) * (isSmoke ? 5 : 12) + 4, // leve impulso para cima
                        (Math.random() - 0.5) * (isSmoke ? 6 : 14)
                    ),
                    initialScale: s,
                    rotationSpeed: new THREE.Vector3(
                        Math.random() * 0.3 - 0.15,
                        Math.random() * 0.3 - 0.15,
                        Math.random() * 0.3 - 0.15
                    )
                });
            }
        };

        // Cria os pedaços
        addFragment(GEO.debris, BASE_MATS.debris, 18, false);
        addFragment(GEO.smoke, BASE_MATS.smoke, 8, true);

        // Luz forte da explosão
        const explosionLight = new THREE.PointLight(0xffaa33, 120, 80);
        explosionLight.position.set(0, 2, 0);
        group.add(explosionLight);

        this.explosions.push({
            group,
            light: explosionLight,
            fragments,
            life: 1.0,
            decay: 0.022
        });

        console.log(`💥 Explosion created at`, position);
    }

    update() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.life -= exp.decay;

            exp.light.intensity = exp.life * 120;

            for (let frag of exp.fragments) {
                frag.velocity.multiplyScalar(0.94);
                frag.mesh.position.add(frag.velocity);

                // Gravidade leve
                frag.velocity.y -= 0.12;

                if (frag.isSmoke) {
                    frag.mesh.scale.setScalar(frag.initialScale * (1 + (1 - exp.life) * 3));
                    frag.mesh.material.opacity = exp.life * 0.6;
                } else {
                    // Rotação
                    frag.mesh.rotation.x += frag.rotationSpeed.x;
                    frag.mesh.rotation.y += frag.rotationSpeed.y;
                    frag.mesh.rotation.z += frag.rotationSpeed.z;

                    frag.mesh.material.opacity = Math.max(0.1, exp.life * 1.1);
                }
            }

            if (exp.life <= 0) {
                this.scene.remove(exp.group);
                exp.light.dispose();
                exp.fragments.forEach(f => {
                    f.mesh.material.dispose();
                });
                this.explosions.splice(i, 1);
            }
        }
    }
}