import * as THREE from 'three';

export class SpaceEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.initEnvironment();
    }

    initEnvironment() {
        // 1. ILUMINAÇÃO AMBIENTE: Aumentada levemente para garantir visibilidade inicial
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8); 
        this.scene.add(ambientLight);

        // 2. LUZ DIRECIONAL: Foco frontal/lateral para realçar a silhueta das naves
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(10, 20, 15);
        this.scene.add(sunLight);

        // 3. LUZ DE PREENCHIMENTO (Rim Light): Azulado para dar profundidade
        const rimLight = new THREE.PointLight(0x3344ff, 0.6);
        rimLight.position.set(-20, -10, -10);
        this.scene.add(rimLight);

        // 4. FUNDO: Mantido o tom escuro para o contraste das estrelas
        this.scene.background = new THREE.Color(0x010103);

        // 5. NEVOEIRO (Fog): Densidade ajustada para evitar o desaparecimento prematuro das naves
        // Se as naves sumirem muito cedo, diminua o 0.0015 para 0.0005
        this.scene.fog = new THREE.FogExp2(0x010103, 0.0008);

        console.log('--- AMBIENTE CONFIGURADO ---');
    }

    update(deltaTime) {
        // Opcional: Adicionar movimento suave se necessário
        // this.scene.children.forEach(child => { if(child.isPointLight) ... });
    }
}