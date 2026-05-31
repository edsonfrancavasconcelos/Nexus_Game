import * as THREE from 'three';

export class SpaceEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.initEnvironment();
    }

    initEnvironment() {
        // 1. ILUMINAÇÃO AMBIENTE (Reduzida para criar contraste)
        // Se a luz ambiente for muito alta, a nave perde o efeito de metal/brilho.
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4); 
        this.scene.add(ambientLight);

        // 2. LUZ DIRECIONAL (O "Sol")
        // Posicionada levemente atrás e acima da câmera para realçar as bordas da nave.
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(10, 20, 15);
        this.scene.add(sunLight);

        // 3. LUZ DE PREENCHIMENTO (Rim Light)
        // Adiciona um azulado sutil do lado oposto para dar profundidade.
        const rimLight = new THREE.PointLight(0x3344ff, 0.6);
        rimLight.position.set(-20, -10, -10);
        this.scene.add(rimLight);

        // 4. FUNDO DO ESPAÇO
        // Usando um tom de azul marinho quase preto para melhor contraste com as estrelas.
        this.scene.background = new THREE.Color(0x010103);

        // 5. NEVOEIRO EXPONENCIAL (Mais realista para o vácuo)
        // O FogExp2 escurece objetos conforme a distância de forma mais suave que o Fog comum.
        this.scene.fog = new THREE.FogExp2(0x010103, 0.0015);

        console.log('--- AMBIENTE CONFIGURADO ---');
    }

    // Método para atualizar cores ou intensidades dinamicamente (ex: mudar de fase)
    update(deltaTime) {
        // Você pode adicionar uma rotação leve na sunLight ou pulsar a rimLight aqui
    }
}