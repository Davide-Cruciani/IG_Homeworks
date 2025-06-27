import * as THREE from "three";
import { GameState } from '@/GameState'
import { GameConfigs } from "@/GameConfigs";
import { Planet, Star } from "../Cosmology";

export class Bullet{
    constructor(position, direction, user, size, name) {
        this.SPEED = 20;
        this.MASS = 2;
        this.MAX_DAMAGE = 50;
        this.TTL = 0;

        this.name = name;
        this.size = size;
        this.age = 0;
        this.geometry = new THREE.SphereGeometry(size);
        this.material = new THREE.MeshPhongMaterial({
            color:0xffff00,
            emissive:0xffa500,
            emissiveIntensity: 2,
            shininess: 100
        });

        this.valid = true;
        this.direction = direction;
        this.direction.z = 0;
        this.direction.normalize();
        
        this.group = new THREE.Group();
        this.group.position.copy(position);
        this.group.position.z = 0;

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.user = user;

        this.group.add(this.mesh);

        this.trailGeometry = new THREE.CylinderGeometry(size, 0.05, 2, 8, 1, true);
        this.trailGeometry.rotateX(Math.PI / 2);
        this.trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xff5500,
            transparent: true,
            opacity: 0.7,
        });
        this.trailMesh = new THREE.Mesh(this.trailGeometry, this.trailMaterial);
        this.trailMesh.position.z = 0;
        this.trailMesh.position.copy(this.mesh.position).sub(this.direction);
        this.trailMesh.lookAt(new THREE.Vector3(0,0,0));
        this.group.add(this.trailMesh);

        if (GameState.impactSoundBuffer) {
            this.sound = new THREE.PositionalAudio(GameState.listener);
            this.sound.setBuffer(GameState.impactSoundBuffer);
            this.sound.setRefDistance(20);
            this.sound.setVolume(0.8);
            this.sound.setLoop(false);
            this.getMesh().add(this.sound);
        }

    }

    getMesh(){ return this.group; };

    setName(name){
        this.name = name;
    }

    getVelocity(){
        const speed = this.direction.clone();
        speed.multiplyScalar(this.SPEED);
        speed.z = 0;
        return speed;
    }

    getName(){ return this.name; }

    setTTL(time){
        this.TTL = time;
    }

    update(dt){
        const time = dt * GameState.timeDial;
        if (!this.valid) {
            this.delete();
            return;
        }

        if(this.age < this.TTL){
            const movement = this.direction.clone();
            movement.multiplyScalar(this.SPEED * time);
            this.group.position.add(movement);
            this.group.position.z = 0;
            this.age += time;
        }else{
            this.valid = false;
            this.delete();
        }
    }

    getWorldDirection(){
        if(!this.group) return new THREE.Vector3();
        const direction = new Vector3(this.direction.x, this.direction.y, 0);
        direction.normalize();
        return direction;
    }

    getWorldPosition(){
        if(!this.group) return new THREE.Vector3();;
        const res = new THREE.Vector3();
        this.group.getWorldPosition(res);
        res.z = 0;
        return res;
    }

    isValid(){ return this.valid; }

    delete(){
        if(this.mesh){
            GameState.scene.remove(this.group);
            this.mesh = null;
        }
        if (this.geometry){
            this.geometry.dispose();
            this.geometry = null;
        }

        if(this.material){
            this.material.dispose();
            this.material = null;
        }

        if(this.valid)
            this.valid = false;
        if(this.trailMesh){
            this.trailMesh = null;
        }
        if(this.trailGeometry){
            this.trailGeometry.dispose();
            this.trailGeometry = null;
        }
        if(this.trailMaterial){
            this.trailMaterial.dispose();
            this.trailMaterial = null;
        }
        if(this.group){
            this.group = null;
        }

        this.user.bulletCount--;
    }

    getDamage(){ return this.MASS * this.SPEED*this.SPEED *0.5; }
    getImpulse(){ return this.MASS * this.SPEED*this.SPEED/2; }
    getHitboxSize(){ return this.size; }

    checkCelestial(celestial){
        if(!(celestial instanceof Planet) && !(celestial instanceof Star)) return;
        const myPos = this.getWorldPosition();
        if(!myPos) return;
        const celestialPos = celestial.getWorldPosition();
        myPos.z =0;
        celestialPos.z = 0;
        const distance = new THREE.Vector3();
        distance.subVectors(celestialPos, myPos);
        if (distance.length() < celestial.getHitboxSize() + this.getHitboxSize()){
            this.delete();
        }
    }

    hit(object){
        if(object === this.user || !this.valid) return {occurred: false};
        const otherPos = object.getWorldPosition();
        const myPos = this.getWorldPosition();
        if(!myPos || !otherPos) return {occurred: false};
        myPos.z = 0;
        otherPos.z = 0;
        const dist = new THREE.Vector3();
        dist.subVectors(otherPos, myPos);

        const collision = dist.length() < this.getHitboxSize() + object.getHitboxSize();
        if(!collision) return {occurred: false};


        if(this.sound) this.sound.play();

        const direction = dist.clone()
        if (direction.lengthSq() > 0) 
            direction.normalize();
        
        const momentum = this.MASS * this.SPEED;
        const energy = this.getDamage();

        const clampedIMP = Math.min(GameConfigs.MAX_IMPULSE, momentum);
        const clampedDMG = Math.min(this.MAX_DAMAGE, energy/object.getMass());

        const report = {
            damage: clampedDMG,
            direction: direction,
            impulse: clampedIMP,
            occurred: true,
            sender:this.user
        }
        this.valid = false;
        this.delete();
        return report; 
    }
}