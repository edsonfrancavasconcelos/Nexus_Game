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

    // Ajuste: Explosões mais rápidas e com cores mais vivas
    const addFragment = (geometry, material, count, isSmoke) => {
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(geometry, material); // Removi o clone() para testar performance
            const s = isSmoke ? (2 + Math.random() * 2) : (0.5 + Math.random() * 1.5);
            mesh.scale.set(s, s, s);
            group.add(mesh);

            fragments.push({
                mesh,
                isSmoke,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 5, // Velocidade maior
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5
                ),
                initialScale: s
            });
        }
    };

    addFragment(GEO.debris, BASE_MATS.debris, 15, false);
    addFragment(GEO.smoke, BASE_MATS.smoke, 10, true);

    const mainLight = new THREE.PointLight(0xff6600, 300, 50); // Luz mais forte e curta
    group.add(mainLight);

    this.explosions.push({ group, mainLight, fragments, life: 1.0, decay: 0.05 });
}

    update() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.life -= exp.decay;

            // Atualiza luz
            exp.mainLight.intensity = exp.life * 100;

        for (let frag of exp.fragments) {
    // Movimento - Aumentamos a resistência do ar (0.92) para um efeito de parada brusca
    frag.velocity.multiplyScalar(0.92);
    frag.mesh.position.add(frag.velocity);

    if (frag.isSmoke) {
        // Fumaça - Aumentamos o efeito de escala para parecer que se dispersa melhor
        frag.mesh.scale.setScalar(frag.initialScale * (1 + (1 - exp.life) * 4));
        frag.mesh.material.opacity = exp.life * 0.4;
    } else {
        // Detritos - Aumentamos a rotação para parecerem mais caóticos
        frag.mesh.rotation.x += 0.25;
        frag.mesh.rotation.y += 0.25;
        frag.mesh.rotation.z += 0.25;
        
        frag.mesh.material.opacity = exp.life;
        // Melhoria na cor: transição mais quente (amarelo para vermelho profundo)
        frag.mesh.material.color.setRGB(
            exp.life * 1.5,
            exp.life * 0.8,
            exp.life * 0.2
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