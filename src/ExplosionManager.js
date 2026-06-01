import * as THREE from 'three';

// Recursos base
const GEO = {
    debris: new THREE.IcosahedronGeometry(1.2, 0),
    smoke: new THREE.SphereGeometry(2.5, 8, 8)
};

export class ExplosionManager {
    constructor(scene) {
        this.scene = scene;
        this.explosions = [];
    }

    create(position) {
        const group = new THREE.Group();
        group.position.copy(position);
        this.scene.add(group);

        const fragments = [];

        // Função interna para criar fragmentos com material único
        const addPart = (geo, color, isSmoke, count) => {
            for (let i = 0; i < count; i++) {
                // CLONE é obrigatório para não bugar as cores de todas as peças
                const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true });
                const mesh = new THREE.Mesh(geo, mat);
                
                const s = isSmoke ? (2 + Math.random() * 2) : (0.5 + Math.random() * 1.5);
                mesh.scale.set(s, s, s);
                group.add(mesh);

                fragments.push({
                    mesh,
                    isSmoke,
                    velocity: new THREE.Vector3((Math.random()-0.5)*4, (Math.random()-0.5)*4, (Math.random()-0.5)*4),
                    initialScale: s
                });
            }
        };

        // 12 Fragmentos de Fogo (Laranja/Amarelo)
        addPart(GEO.debris, 0xffaa00, false, 12);
        // 8 Nuvens de Fumaça (Branca/Cinza claro)
        addPart(GEO.smoke, 0xffffff, true, 8);

        const mainLight = new THREE.PointLight(0xff6600, 200, 30);
        group.add(mainLight);

        this.explosions.push({ group, mainLight, fragments, life: 1.0, decay: 0.04 });
    }

    update(deltaTime) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.life -= exp.decay;
            exp.mainLight.intensity = exp.life * 100;

            for (let frag of exp.fragments) {
                frag.velocity.multiplyScalar(0.92);
                frag.mesh.position.add(frag.velocity);

                if (frag.isSmoke) {
                    // Fumaça Branca: Expande e desvanece suavemente
                    frag.mesh.scale.setScalar(frag.initialScale * (1 + (1 - exp.life) * 2));
                    frag.mesh.material.opacity = exp.life * 0.3;
                } else {
                    // Fogo: Rotação caótica e desvanecimento rápido
                    frag.mesh.rotation.x += 0.3;
                    frag.mesh.rotation.y += 0.3;
                    frag.mesh.material.opacity = exp.life;
                }
            }

            if (exp.life <= 0) {
                this.scene.remove(exp.group);
                exp.fragments.forEach(f => f.mesh.material.dispose());
                this.explosions.splice(i, 1);
            }
        }
    }
}