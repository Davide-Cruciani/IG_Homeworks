import * as THREE from 'three';
import { GameState } from '@/GameState';

export class Explosion{
    constructor(user,duration=1){

        this.geometry = new THREE.SphereGeometry(1,16,16);
        this.material = new THREE.MeshBasicMaterial({
            color: 0xff5500,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        })

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.scale.setScalar(0.5);
        this.age = 0;
        this.user = user
        this.mesh.position.copy(user.getWorldPosition());
        this.duration = duration;
        this.size = user.getHitboxSize()*10;
        this.finished = false;
        GameState.scene.add(this.mesh);

        if (GameState.explosionSoundBuffer) {
            this.sound = new THREE.PositionalAudio(GameState.listener);
            this.sound.setBuffer(GameState.explosionSoundBuffer);
            this.sound.setRefDistance(20);
            this.sound.setVolume(0.8);
            this.sound.setLoop(false);
            this.mesh.add(this.sound);
            if(this.sound) this.sound.play();
        }
    }

    update(dt){
        const time = dt * GameState.timeDial;
        this.age += time;
        const t = this.age/this.duration;
        
        if(t>=1){
            GameState.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.user.destroy();
            this.finished = true;
            return;
        }


        const scale = 0.5 + (this.size - 0.5) * t * t;

        this.mesh.scale.setScalar(scale);
        const alpha = 1-(t*t);
        this.mesh.material.opacity = alpha;
    }
}
