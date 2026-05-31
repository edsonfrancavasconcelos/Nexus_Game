import * as THREE from 'three';

export class SpaceEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.initEnvironment();
    }

    initEnvironment() {
        // 1. ILUMINAÇÃO BÁSICA (Muito leve)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Luz suave em tudo
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1); // Luz vindo de um lado
        sunLight.position.set(5, 10, 7);
        this.scene.add(sunLight);

        // 2. COR DE FUNDO (Melhor que carregar um modelo pesado)
        this.scene.background = new THREE.Color(0x020205);

        // 3. NEBULOSA SIMPLIFICADA (Opcional - Adiciona profundidade sem pesar)
        const fog = new THREE.Fog(0x020205, 100, 1000);
        this.scene.fog = fog;

        console.log('AMBIENTE OTIMIZADO: Modelo GLB removido para ganho de FPS.');
    }
}