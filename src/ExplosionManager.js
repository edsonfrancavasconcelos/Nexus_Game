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

// ... dentro da classe ExplosionManager ...

create(position, camera) {
    if (camera) this.cameraRef = camera;

    const group = new THREE.Group();
    group.position.copy(position);
    this.scene.add(group);

    const fragments = [];

    const addFragment = (geometry, material, count, isSmoke) => {
        // Usamos uma cor base que varia levemente para cada explosão
        const instanceMat = material.clone();
        
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(geometry, instanceMat);
            
            // Variância de tamanho inicial
            const s = isSmoke ? (1 + Math.random() * 2) : (0.3 + Math.random() * 0.7);
            mesh.scale.set(s, s, s);
            group.add(mesh);

            fragments.push({
                mesh,
                isSmoke,
                // Aumentei a força inicial da velocidade
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * (isSmoke ? 0.8 : 2.5),
                    (Math.random() - 0.5) * (isSmoke ? 0.8 : 2.5),
                    (Math.random() - 0.5) * (isSmoke ? 0.8 : 2.5)
                ),
                initialScale: s
            });
        }
    };

    addFragment(GEO.debris, BASE_MATS.debris, 12, false);
    addFragment(GEO.smoke, BASE_MATS.smoke, 6, true);

    // Cor inicial da luz mais intensa (Laranja/Amarelo)
    const mainLight = new THREE.PointLight(0xffaa00, 100, 40);
    group.add(mainLight);

    this.explosions.push({
        group, mainLight, fragments,
        life: 1.0,
        decay: 0.025 // Mais rápida
    });
}

update() {
    // ... (parte do shake igual) ...

    for (let i = this.explosions.length - 1; i >= 0; i--) {
        const exp = this.explosions[i];
        exp.life -= exp.decay;

        // Efeito de cor: explode brilhante, termina escuro
        exp.mainLight.intensity = exp.life * 100;

        for (let frag of exp.fragments) {
            // Aplica desaceleração (atrito)
            frag.velocity.multiplyScalar(0.95); 
            frag.mesh.position.add(frag.velocity);

            if (frag.isSmoke) {
                // Fumaça expande e desaparece
                frag.mesh.scale.setScalar(frag.initialScale * (1 + (1 - exp.life) * 2));
                frag.mesh.material.opacity = exp.life * 0.3;
            } else {
                // Detritos giram e caem
                frag.mesh.rotation.x += 0.1;
                frag.mesh.rotation.z += 0.1;
                frag.mesh.material.opacity = exp.life;
                frag.mesh.material.color.setRGB(exp.life, exp.life * 0.5, 0); // Efeito esfriando
            }
        }
  
    }
}
      
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