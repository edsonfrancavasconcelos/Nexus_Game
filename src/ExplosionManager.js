import * as THREE from 'three';

// Recursos Compartilhados (criados apenas uma vez)
const GEO = {
    debris: new THREE.DodecahedronGeometry(1.5, 0),
    smoke: new THREE.SphereGeometry(3, 6, 6)
};

const BASE_MATS = {
    debris: new THREE.MeshLambertMaterial({ 
        color: 0x222222, 
        flatShading: true, 
        transparent: true 
    }),
    smoke: new THREE.MeshBasicMaterial({ 
        color: 0x111111, 
        transparent: true, 
        opacity: 0.6 
    })
};

export class ExplosionManager {
    constructor(scene) {
        this.scene = scene;
        this.explosions = [];
        this.cameraRef = null;
    }

    create(position, camera = null) {
        if (camera) this.cameraRef = camera;

        const group = new THREE.Group();
        group.position.copy(position);
        this.scene.add(group);

        const fragments = [];

        const addFragment = (geometry, material, count, isSmoke) => {
            for (let i = 0; i < count; i++) {
                const instanceMat = material.clone();
                const mesh = new THREE.Mesh(geometry, instanceMat);

                const s = isSmoke ? (1 + Math.random() * 2) : (0.3 + Math.random() * 0.7);
                mesh.scale.set(s, s, s);
                group.add(mesh);

                fragments.push({
                    mesh,
                    isSmoke,
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * (isSmoke ? 0.8 : 2.5),
                        (Math.random() - 0.5) * (isSmoke ? 0.8 : 2.5),
                        (Math.random() - 0.5) * (isSmoke ? 0.8 : 2.5)
                    ),
                    initialScale: s
                });
            }
        };

        // Cria fragmentos
        addFragment(GEO.debris, BASE_MATS.debris, 12, false);
        addFragment(GEO.smoke, BASE_MATS.smoke, 6, true);

        // Luz da explosão
        const mainLight = new THREE.PointLight(0xffaa00, 100, 40);
        group.add(mainLight);

        this.explosions.push({
            group,
            mainLight,
            fragments,
            life: 1.0,
            decay: 0.028
        });
    }

    update() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.life -= exp.decay;

            // Atualiza luz
            exp.mainLight.intensity = exp.life * 100;

            for (let frag of exp.fragments) {
                // Movimento
                frag.velocity.multiplyScalar(0.95);
                frag.mesh.position.add(frag.velocity);

                if (frag.isSmoke) {
                    // Fumaça
                    frag.mesh.scale.setScalar(frag.initialScale * (1 + (1 - exp.life) * 2));
                    frag.mesh.material.opacity = exp.life * 0.35;
                } else {
                    // Detritos
                    frag.mesh.rotation.x += 0.12;
                    frag.mesh.rotation.z += 0.08;
                    frag.mesh.material.opacity = exp.life * 0.9;
                    frag.mesh.material.color.setRGB(
                        exp.life * 0.8,
                        exp.life * 0.4,
                        0
                    );
                }
            }

            // Remover explosão quando acabar
            if (exp.life <= 0) {
                this.scene.remove(exp.group);

                // Limpeza de materiais
                const uniqueMaterials = new Set();
                exp.fragments.forEach(f => uniqueMaterials.add(f.mesh.material));
                uniqueMaterials.forEach(mat => mat.dispose());

                this.explosions.splice(i, 1);
            }
        }
    }
}