import * as THREE from 'three';

export class SpaceEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.initEnvironment();
    }

    initEnvironment() {
        // 1. Aumentamos a luz ambiente para 1.0 para garantir que o preto não seja absoluto
        const ambientLight = new THREE.AmbientLight(0x404060, 1.0); 
        this.scene.add(ambientLight);

        // 2. Luz Direcional (O "Sol") - Agora um pouco mais forte
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(10, 20, 15);
        this.scene.add(sunLight);

        // 3. Rim Lighting (Luz de Contorno) - Duplicamos para garantir destaque em ambos os lados
        // Isso cria aquele brilho nas bordas da nave preta
        const rimLightLeft = new THREE.PointLight(0x3344ff, 2.0, 100);
        rimLightLeft.position.set(-30, 0, 0);
        this.scene.add(rimLightLeft);

        const rimLightRight = new THREE.PointLight(0xff4433, 2.0, 100);
        rimLightRight.position.set(30, 0, 0);
        this.scene.add(rimLightRight);

        // 4. Fundo levemente azulado em vez de preto puro
        // Isso ajuda o cérebro humano a distinguir profundidade
        this.scene.background = new THREE.Color(0x020208);

        // 5. Nevoeiro com cor ajustada para combinar com o fundo
        this.scene.fog = new THREE.FogExp2(0x020208, 0.0008);

        console.log('--- AMBIENTE CONFIGURADO ---');
    }

    update(deltaTime) {
        // Opcional: fazer as luzes de contorno "pulsarem" levemente
        // Isso dá uma sensação de movimento espacial
    }
}