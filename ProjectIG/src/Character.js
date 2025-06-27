import * as WEAPON from "./weapons/Weapons";
import { RocketLauncher } from "./weapons/Weapons";
import { GameOver } from "@/GameOverHandler";
import { GameState } from "@/GameState";
import { GameConfigs } from "@/GameConfigs";
import { OBJLoader } from "three/examples/jsm/Addons.js";
import { MTLLoader } from "three/examples/jsm/Addons.js";
import { Vector3, Object3D, Quaternion} from "three";
import { PeripheralsInputs } from "./PeripheralsInputs";
import { Enemy } from "./enemies/Enemy";
import { Planet, Star } from "./Cosmology";
import { Bullet } from "./weapons/Bullet";
import { Rocket } from "./weapons/Rocket";
import { Explosion } from "./ExplosionAnimation";
import * as THREE from 'three';


export class Character{
    constructor(position){
        this.ACC = 3;
        this.ANG_SPEED = 10;
        this.MAX_SPEED = 10;
        this.BASE_DRAG = 1.005;
        this.BREAKS_DRAG = 1.05;
        this.SENSITIVITY = 0.003;
        this.HITBOX_RANGE = 3;
        this.MASS = 10;
        this.DAMAGE_CD = 0.5;
        this.MAX_D_GAUGE = 4;
        this.DILATION_OVERUSE_CD = 6;
        


        this.lastDamage = 0;
        this.damageThreshold = this.MAX_HP/10;
        this.dCD = 0;
        this.weaponList = []
        this.dead = false;

        this.selectedWeapon = 0;
        
        this.MAX_HP = 1000;
        this.currentHp = this.MAX_HP;

        this.team = 'player';   
        this.yaw = 0;

        this.loaded = false;

        this.dilationGauge = this.MAX_D_GAUGE;

        this.vel = 0;
        this.latVel = 0;

        this.targetPos = position.clone();

        this.collisionsResultBullet = {};
        this.collisionsResultShip = {};

        
        

        const path = "assets/PlayerCharacter"

        const mtlLoader = new MTLLoader();
        mtlLoader.setPath(path+"/");
        mtlLoader.load('SciFi_Fighter_AK5.mtl', 
            (mtl)=>{
                mtl.preload();
                const objectLoader = new OBJLoader();
                objectLoader.setPath(path+'/');
                objectLoader.setMaterials(mtl);
                objectLoader.load('SciFi_Fighter_AK5.obj',
                    (obj)=>{
                        obj.scale.set(0.003,0.003,0.003);
                        obj.traverse((child)=>{
                            if(child.isMesh) child.geometry.rotateX(Math.PI/2);
                        })
                        this.obj = obj;
                        this.loaded = true;
                        this.root = new Object3D();
                        this.root.position.copy(position);

                        this.root.add(this.obj);

                        if (GameState.impactSoundBuffer) {
                            this.sound = new THREE.PositionalAudio(GameState.listener);
                            this.sound.setBuffer(GameState.impactSoundBuffer);
                            this.sound.setRefDistance(20);
                            this.sound.setVolume(0.8);
                            this.sound.setLoop(false);
                            this.root.add(this.sound);
                        }

                        this.weaponList.push(new WEAPON.SimpleGun(this))
                        this.weaponList.push(new WEAPON.Shotgun(this));
                        this.weaponList.push(new RocketLauncher(this));

                        GameState.scene.add(this.root);
                        console.log(`[${this.getName()}] model loaded`);
                    },
                    undefined, 
                    (err)=>{ console.log(err); }
                );
            },
            undefined, 
            (err)=>{ console.log(err); }
        )
    };

    update(time){
        // console.log("Local pos:", GameState.player.position);
        // console.log("World pos:", GameState.player.getWorldPosition(new THREE.Vector3()));
        // if(this.collisionsResultBullet.length) 
        // console.log("Player bull rep:", this.collisionsResultBullet);
        // console.log("Player ship rep:",this.collisionsResultShip);

        this.damageThreshold = this.MAX_HP/0.7;
        if (GameState.impactSoundBuffer && !this.sound) {
            this.sound = new THREE.PositionalAudio(GameState.listener);
            this.sound.setBuffer(GameState.impactSoundBuffer);
            this.sound.setRefDistance(20);
            this.sound.setVolume(0.8);
            this.sound.setLoop(false);
            this.root.add(this.sound);
        }
        if(this.dead) return;
        if(!this.root || !this.loaded) return;
        
        this.handleDilation(time);
        this.dealWithCollisions();

        this.yaw -= PeripheralsInputs['mouseX'] * this.SENSITIVITY;

        this.pitch = Math.max(-this.MAX_PITCH + (Math.PI/12), Math.min(this.MAX_PITCH, this.pitch));


        const yawQuat = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), this.yaw);

        const rollAngle = Math.max(Math.min(this.latVel * 0.1, Math.PI/6), -Math.PI/6); 
        const rollQuat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rollAngle);
        const finalQuat = yawQuat.clone().multiply(rollQuat);
        this.root.quaternion.copy(finalQuat);


        

        const key_q = PeripheralsInputs['q'];
        const key_e = PeripheralsInputs['e'];

        if (key_q === 1) {
            this.selectedWeapon--;
            PeripheralsInputs['q'] = 0;
        }
        if (key_e === 1){
            this.selectedWeapon++;
            PeripheralsInputs['e'] = 0;
        }
        if(this.selectedWeapon >= this.weaponList.length) this.selectedWeapon = 0;
        if(this.selectedWeapon < 0) this.selectedWeapon = this.weaponList.length-1;

        const key_a = PeripheralsInputs['a'];
        const key_d = PeripheralsInputs['d'];
        const key_w = PeripheralsInputs['w'];
        const key_s = PeripheralsInputs['s'];
        const key_c = PeripheralsInputs['c'];



        const firePrimary = PeripheralsInputs['mb0'];

        this.movement(key_a,key_d,key_s,key_w,key_c,time);
        this.handleCamera(yawQuat);
        if (firePrimary === 1)
            this.fireSelectedWeapon();
        
    }

    shipCollision(object){
        if(!object || !object.loaded || !object.obj) return;
        if(this.dead) return;
        if(!(object instanceof Enemy)) return;
        if(object.isDead()) return;
        if(object === this) return; 
        if(this.collisionsResultShip[object.getName()]) return;
        const currentPos = this.getWorldPosition();
        const otherPos = object.getWorldPosition();
        currentPos.z = 0;
        otherPos.z = 0;     
        const direction = new Vector3();
        direction.subVectors(otherPos, currentPos);
        direction.z = 0;
        const distance = direction.length();
        if(distance < this.getHitboxSize() + object.getHitboxSize()){
            const normDirection = direction.lengthSq() === 0 ? new Vector3(): direction.normalize();

            const deltaL = (this.getHitboxSize() + object.getHitboxSize()) - distance;
            const dirMine = normDirection.clone().multiplyScalar(-1);
            const dirOther = normDirection.clone();
            


            const myVel = this.getVelocity()
            const otherVel = object.getVelocity();
            const relativeVel = otherVel.clone().sub(myVel);
            
            const impactSpeed = relativeVel.dot(normDirection);
            if(impactSpeed <= 0) {
                return;
            }

            const myMass = this.getMass();
            const otherMass = object.getMass();

            if( myMass <=0 || otherMass <= 0){
                console.log("Invalid masses");
                console.log(this.getName, myMass);
                console.log(object.getName(), otherMass);   
                return;
            }

            const massCoefficient = (myMass*otherMass)/(myMass+otherMass);
            
            const momentum = massCoefficient * impactSpeed * GameConfigs.IMPACT_MUL;
            const impactDamage = 0.5 * momentum * impactSpeed;
            
            var ramFactor = (direction.angleTo(this.getWorldDirection()) < Math.PI/4)? 3: 1;

            const report = {
                damage: impactDamage/(myMass*ramFactor),
                impulse: Math.min(momentum/myMass, GameConfigs.MAX_RAM_DAMAGE),
                direction: dirMine
            }

            const reportOther = {
                damage: impactDamage*(ramFactor)/otherMass,
                impulse: Math.min(momentum/otherMass, GameConfigs.MAX_RAM_DAMAGE),
                direction: dirOther
            }
            this.collisionsResultShip[object.getName()] = report;
            object.collisionsResultShip[this.getName()] = reportOther;
            if(this.sound) this.sound.play();
            if(deltaL > 0){
                this.getMesh().position.addScaledVector(dirMine, deltaL/2);
                object.getMesh().position.addScaledVector(dirOther, deltaL/2);
            }
        }
    }

    planetCollision(object){
        if(this.dead) return;
        if(!(object instanceof Planet) && !(object instanceof Star)) return;
        const currentPos = this.getWorldPosition();
        const otherPos = object.getWorldPosition();
        const distance = otherPos.distanceTo(currentPos);
        if(distance < this.getHitboxSize() + object.getHitboxSize()){
            this.takeDamage(this.getMaxHealth());
        }
    }

    bulletCollision(object){
        if(this.dead) return;
        if(!(object instanceof Bullet) && !(object instanceof Rocket)) return;
        if(!object.isValid()) return;
        if(this.collisionsResultBullet[object.getName()]) return;
        const collisionReport = object.hit(this);
        if(collisionReport.occurred)
            this.collisionsResultBullet[object.getName()] = collisionReport;
    }

    dealWithCollisions(){
        const totalRecoil = new Vector3();
        var totalDamage = 0;
        const vulnerable = GameState.clock.getElapsedTime() - this.lastDamage > this.DAMAGE_CD;
        for (const bullet in this.collisionsResultBullet){
            const data = this.collisionsResultBullet[bullet];
            if(vulnerable){
                totalDamage += data.damage;
                this.takeDamage(data.damage);
            }
            const direction = data.direction;
            if (direction.length()>0){
                direction.normalize();
                totalRecoil.addScaledVector(direction, Math.min(data.impulse, GameConfigs.MAX_IMPULSE));
            }
        }

        for (const ship in this.collisionsResultShip){
            const data = this.collisionsResultShip[ship];
            if(vulnerable){
                totalDamage += data.damage;
                this.takeDamage(data.damage);
            }
            const direction = data.direction;
            if (direction.length()>0){
                direction.normalize();
                totalRecoil.addScaledVector(direction, Math.min(data.impulse, GameConfigs.MAX_IMPULSE));
            }
        }

        if(totalDamage>0){
            totalRecoil.clampLength(0, GameConfigs.MAX_KNOCK);
            this.collisionsResultBullet = {};
            this.collisionsResultShip = {};
            this.lastDamage = GameState.clock.getElapsedTime();
            const cameraRecoil = totalRecoil.clone().multiplyScalar(0.5);
            const shake = new Vector3(
                (Math.random() - 0.5) * 0.002,
                (Math.random() - 0.5) * 0.002,
                (Math.random() - 0.5) * 0.002
            );
            cameraRecoil.add(shake);
            GameState.cameraRecoilOffset = cameraRecoil;
            this.root.position.add(totalRecoil);
        }
    }

    fireSelectedWeapon(){
        this.weaponList[this.selectedWeapon].shoot();
    }

    getWeaponData(){
        const current = this.selectedWeapon;
        const weaponNumber = this.weaponList.length;

        const previous = (current - 1 + weaponNumber) % weaponNumber;
        const next = (current + 1) % weaponNumber;

        const data = {
            previous: this.weaponList[previous],
            current: this.weaponList[current],
            next: this.weaponList[next]
        };
        return data;
    }

    handleCamera(yawQuat){
        const shipPos = this.root.getWorldPosition(new Vector3());

        const baseOffset = new Vector3(0,-5,3);
        const cameraOffset = baseOffset.clone().multiplyScalar(GameState.zoom.level);
        cameraOffset.applyQuaternion(yawQuat);

        const cameraPos = shipPos.clone().add(cameraOffset);
        cameraPos.add(GameState.cameraRecoilOffset);
        GameState.cameraRecoilOffset.multiplyScalar(0.5);
        GameState.camera.position.lerp(cameraPos, 0.2);
        
        const forward = new Vector3(0,1,0);
        forward.applyQuaternion(yawQuat);

        const lookPos = shipPos.clone().add(forward.multiplyScalar(15));

        if(!GameState.camera.__lookTarget){
            GameState.camera.__lookTarget = lookPos.clone();
        }else{
            GameState.camera.__lookTarget.lerp(lookPos, 0.1)
        }

        GameState.camera.up.set(0,0,1);
        GameState.camera.lookAt(GameState.camera.__lookTarget);
    }

    movement(keyA, keyD, keyS, keyW, keyC, time){
        if (keyD>0) this.latVel += this.ACC*((keyD===2)? 0.1: 1) * time;
        else if(keyA>0) this.latVel -= this.ACC*((keyA===2)? 0.1: 1) * time;
        if (keyW>0) this.vel += this.ACC*((keyW===2)? 0.1: 1) * time;
        else if(keyS>0) this.vel -= this.ACC*((keyS===2)? 0.1: 1) * time;
        
        const drag = (keyC)? this.BREAKS_DRAG: this.BASE_DRAG;
        
        this.latVel = Math.min(this.MAX_SPEED, this.latVel);
        this.vel = Math.min(this.MAX_SPEED, this.vel);
        
        this.latVel /= drag;
        this.vel /= drag;
        
        const right = new Vector3(1, 0, 0);
        const forward = new Vector3(0, 1, 0);
        
        
        forward.applyQuaternion(this.root.quaternion);
        right.applyQuaternion(this.root.quaternion);
        
        const movementVector = new Vector3();
        movementVector.addScaledVector(forward, this.vel * time);
        movementVector.addScaledVector(right, this.latVel * time)

        // this.targetPos.add(movementVector);
        // this.targetPos.z = 0;
        // this.root.position.lerp(this.targetPos, 0.1);
        this.root.position.add(movementVector);
        this.root.position.z = 0;
    }

    getName(){ return 'player'; }
    getMass(){ return this.MASS; }
    getMesh(){ return this.obj; }
    getHitboxSize(){ return this.HITBOX_RANGE; }

    add(child){
        this.obj.add(child);
    }

    getVelocity(){
        const forward = new Vector3(0,1,0);
        forward.applyQuaternion(this.root.quaternion);
        const right = new Vector3(1,0,0);
        right.applyQuaternion(this.root.quaternion);

        const total = new Vector3()
        total.addScaledVector(right, this.latVel);
        total.addScaledVector(forward, this.vel);
        total.z = 0;
        return total.clone();
    }

    getWorldPosition(){ 
        if(!this.root || !this.loaded) {
            console.warn(this.getName() + 'Position not found');
            return new Vector3(0,0,0);
        }
        const pos = this.obj.getWorldPosition(new Vector3()); 
        pos.z  = 0;
        return pos;
    }
    getWorldDirection(){
        if(!this.root || !this.loaded) {
            console.warn(this.getName() + 'Direction not found');
            return new Vector3();
        }
        const direction = new Vector3(0, 1, 0);
        direction.applyQuaternion(this.root.quaternion);
        direction.z = 0;
        direction.normalize();
        return direction;
    }
    getTeam(){ return this.team; }

    getHealth(){ return this.currentHp; }
    
    getMaxHealth() {return this.MAX_HP; }

    destroy(){
        if (this.root) {
            GameState.scene.remove(this.root);
            this.root.traverse(obj => {
                if (obj.isMesh) {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach(mat => mat.dispose());
                        } else {
                            obj.material.dispose();
                        }
                    }
                }
            });
        }

        this.obj = null;
        this.root = null;
        this.loaded = false;

        console.log(`[${this.getName()}] is Dead`);
        GameOver.updateScore(GameState.score.toFixed(2));
        GameOver.showGameOverScreen();
    }

    getDilationCharge(){
        return this.dilationGauge;
    }

    getDilationMax(){
        return this.MAX_D_GAUGE;
    }
    
    getDilationCD(){
        return this.dCD > 0;
    }

    explosion(){
        if (this.dead) return;
            this.dead = true;
            const explosion = new Explosion(this);
            GameState.explosions.push(explosion);
    }

    handleDilation(time){
        this.dCD -= time;
        this.dCD = Math.max(this.dCD, 0);
        if(this.dCD > 0){
            // console.log("Dilation CD: ", this.dCD);
            GameState.dialActive = false;
            this.dilationGauge += time;
            this.dilationGauge = Math.min(this.dilationGauge, this.MAX_D_GAUGE);
            return;
        }
        if(PeripheralsInputs['space'] === 1){
            this.dilationGauge -= time;
            this.dilationGauge = Math.max(this.dilationGauge, 0);
            if(this.dilationGauge === 0){
                // console.log("Dilation off");
                GameState.dialActive = false;
                this.dCD = this.DILATION_OVERUSE_CD;
            }else{
                // console.log("Dilation on");
                GameState.dialActive = true;
            }
        }else{
            // console.log("Dilation off");
            GameState.dialActive = false;
            this.dilationGauge += time;
            this.dilationGauge = Math.min(this.dilationGauge, this.MAX_D_GAUGE);
        }

    }

    isDead(){ return this.dead; }
    takeDamage(damage){
        if(this.dead) return;
        console.log(`[${this.getName()}] taking ${damage.toFixed(2)} damage (HP before: ${this.currentHp.toFixed(2)})`);
        
        this.currentHp -= Math.min(damage, this.damageThreshold);
        this.damageThreshold -= damage;
        if(this.currentHp <= 0){
            this.currentHp = 0;
            this.explosion();
        }
    }
}