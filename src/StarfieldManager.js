import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class StarfieldManager {
    constructor(scene) {
        this.scene = scene;
        this.spaceMesh = null;
        
        // CONFIGURAÇÃO: Velocidade de rotação
        this.rotationSpeed = 0.0005; 
        
        // Inicia o carregamento do modelo 3D do espaço
        this._loadSpace();
    }

    _loadSpace() {
        const loader = new GLTFLoader();

        loader.load(
            'assets/models/spaco.glb', 
            (gltf) => {
                this.spaceMesh = gltf.scene;

                // Envolve a câmera do jogo
                this.spaceMesh.scale.set(500, 500, 500);
                this.spaceMesh.position.set(0, 0, 0);

        // Localize essa parte dentro do seu loader.load em src/StarfieldManager.js
this.spaceMesh.traverse((child) => {
    if (child.isMesh) {
        if (child.material) {
            child.material.side = THREE.DoubleSide; 
            child.material.roughness = 1.0;
            child.material.metalness = 0.0;

            // =========================================================
            // CORREÇÃO CRÍTICA PARA EVITAR QUE AS NAVES FIQUEM INVISÍVEIS
            // =========================================================
            child.material.depthWrite = false; // Impede que o fundo oculte as naves
            child.renderOrder = 0;             // Força o espaço a ser desenhado PRIMEIRO
            
            if (child.material.map) {
                child.material.emissive = new THREE.Color(0xffffff);
                child.material.emissiveMap = child.material.map;
                child.material.emissiveIntensity = 1.0;
            }
        }
    }
});


                this.scene.add(this.spaceMesh);
                console.log('Cenário espacial em rotação carregado!');
            },
            undefined,
            (error) => {
                console.error('Erro ao carregar o arquivo do espaço:', error);
            }
        );
    }

    update() {
        if (this.spaceMesh) {
            this.spaceMesh.rotation.y += this.rotationSpeed;
            this.spaceMesh.rotation.x += 0.0001; 
        }
    }
}
