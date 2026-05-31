import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class SpaceEnvironment {

    constructor(scene) {

        this.scene = scene;

        this.loadEnvironment();
    }

    loadEnvironment() {

        const loader = new GLTFLoader();

        loader.load(

            'assets/models/spaco.glb',

            (gltf) => {

                const model = gltf.scene;

                // =====================================
                // ESCALA ULTRA PEQUENA
                // =====================================
               model.scale.set(
                    10,
                    10,
                    10
                );
                

                // =====================================
                // CENTRALIZA O MODELO
                // =====================================
                const box =
                    new THREE.Box3().setFromObject(model);

                const center =
                    box.getCenter(
                        new THREE.Vector3()
                    );

                model.position.sub(center);

                // =====================================
                // POSIÇÃO NO FUNDO
                // =====================================
                model.position.set(
                    0,
                    -15,
                    -500
                );

                // =====================================
                // MATERIAIS
                // =====================================
                model.traverse((child) => {

                    if (child.isMesh) {

                        child.castShadow = false;

                        child.receiveShadow = false;

                        if (child.material) {

                            child.material.metalness = 0.4;

                            child.material.roughness = 0.8;
                        }
                    }
                });

                this.scene.add(model);

                console.log(
                    'AMBIENTE ESPACIAL OK'
                );
            },

            undefined,

            (error) => {

                console.error(
                    'ERRO SPACE:',
                    error
                );
            }
        );
    }
}