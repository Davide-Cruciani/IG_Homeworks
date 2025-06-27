import { SphereGeometry, TextureLoader, MeshBasicMaterial, Mesh } from "three";
import * as THREE from 'three'
import { GameConfigs } from "@/GameConfigs";

export class Skysphere{
    constructor(){
        const loader = new TextureLoader();
        const texture = loader.load('assets/skysphereNASA.jpg', 
            ()=>{
                console.log('Skysphere texture loaded');
            },
            undefined,
            (err)=>{console.log('Skysphere texture err: ', err);}
        );
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.encoding = THREE.sRGBEncoding;


        const geometry = new SphereGeometry(GameConfigs.SKYBOX_RADIUS, 60, 40);

        const uv = geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++) {
            uv.setX(i, 1 - uv.getX(i));
        }

        const material = new MeshBasicMaterial({
            map:texture,
            side: THREE.BackSide,
            toneMapped: false,
        });
        this.mesh = new Mesh(geometry, material);
    }
    getMesh(){
        return this.mesh;
    }
}