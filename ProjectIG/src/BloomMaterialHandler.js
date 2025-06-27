import * as THREE from 'three';
import { GameConfigs } from '@/GameConfigs';

export class BloomMaterialHandler{
    constructor(){
        this.dummyMaterial = new THREE.MeshBasicMaterial({color:'black'});
        this.materialList = {};
        this.darkenNonBloom = (obj)=>{
            if (obj.isMesh && obj.material && obj.layers.test(GameConfigs.BLOOM_LAYER) === false) {
                this.materialList[obj.uuid] = obj.material;
                obj.material = this.dummyMaterial;
            }
        }
        this.restoreNormalMaterials = (obj)=>{
            if(this.materialList[obj.uuid]){
                obj.material = this.materialList[obj.uuid];
                delete this.materialList[obj.uuid];
            }
        }
    }
}