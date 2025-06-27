import { MTLLoader, OBJLoader} from "three/examples/jsm/Addons.js";
import { Explosion } from "../ExplosionAnimation";
import { Vector3, Quaternion, MathUtils } from "three";
import { AlertIcon } from "../UserInterface";
import { GameState } from "@/GameState";
import { GameConfigs } from "@/GameConfigs";
import { Character } from "../Character";
import { Planet, Star } from "../Cosmology";
import { Bullet } from "../weapons/Bullet";
import { Rocket } from "../weapons/Rocket";
import * as THREE from 'three';
import { SimpleGun } from "../weapons/Weapons";
import { AxesHelper } from 'three';

// Green and yellow
const TEAM_COLORS = [0x33ff33,0xffff33]
export class Enemy{
    constructor(path, position, team){
        this.SIGHT_CONE = 1;
        this.MAX_HEALTH = 10;
        this.MASS = 1;
        this.HITBOX_RANGE = 4;
        this.DAMAGE_CD = 0.5;
        
        this.collisionsResultBullet = {};
        this.collisionsResultPlanet = {};
        this.collisionsResultShip = {};

        this.dead = false;
        this.team = team;
        this.path = "./assets/Various/";
        this.loaded = false;
        this.currentHealth = this.MAX_HEALTH;
        this.name = team;
        this.lastDamage = 0;
        this.vel = new Vector3();
        this.gravityVector = new Vector3();
        this.damageThreshold = this.MAX_HEALTH*0.8;
        const mtlLoader = new MTLLoader();
                mtlLoader.setPath(this.path);
                mtlLoader.load(path+".mtl", 
                    (mtl)=>{
                        this.mlt = mtl;
                        mtl.preload();
                        const objectLoader = new OBJLoader();
                        objectLoader.setPath(this.path);
                        if (!mtl){
                            // console.log('Material not found');
                            throw new Error;
                        }
                        objectLoader.setMaterials(mtl);
                        objectLoader.load(path+".obj",
                            (obj)=>{
                                
                                obj.scale.set(0.5,0.5,0.5);
                                
                                obj.position.copy(position);
                                obj.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
                                this.obj = obj;
                                this.loaded = true;
                                GameState.scene.add(obj);

                                const teamColor = TEAM_COLORS[this.team]

                                obj.traverse((child) => {
                                    if (child.isMesh) {
                                        child.material.dispose();
                                        child.material = new THREE.MeshStandardMaterial({
                                            color: teamColor,
                                            metalness: 0.2,
                                            roughness: 0.7,
                                        });
                                    }
                                });


                                this.alert = new AlertIcon();
                                this.obj.add(this.alert.getElement());
                                this.alert.setVisible(false);
                                this.mainGun = new SimpleGun(this);
                                if (GameState.impactSoundBuffer) {
                                    this.sound = new THREE.PositionalAudio(GameState.listener);
                                    this.sound.setBuffer(GameState.impactSoundBuffer);
                                    this.sound.setRefDistance(20);
                                    this.sound.setVolume(0.8);
                                    this.sound.setLoop(false);
                                    this.obj.add(this.sound);
                                }

                                // console.log(`[${this.getName()}] Loaded`);
                            }, 
                            (err)=>{ console.log(err); }
                        );
                    }, 
                    (err)=>{ console.log(err); }
                )
    }
    addChild(child){ this.obj.add(child); }
    getMesh(){ return this.obj; }
    isDead(){ return this.dead; }
    getWorldPosition(){
        if(!this.loaded || !this.obj) return new Vector3(0,0,0);
        return this.obj.getWorldPosition(new Vector3());
    }
    getWorldDirection(){
        if (!this.loaded || !this.obj) return new Vector3(0,0,1);

        const forward = new Vector3(0,0,1);
        const quaternion = new Quaternion();
        this.obj.getWorldQuaternion(quaternion);
        forward.applyQuaternion(quaternion);

        forward.z = 0;
        return forward.normalize();
    }
    
    computeGravity(){
        this.gravityVector.set(0,0,0);
        const shipPos = this.getWorldPosition();
        GameState.planets.forEach((planet) => {
            const planetPos = planet.getWorldPosition();

            const vectorToPlanet = new Vector3();
            vectorToPlanet.subVectors(planetPos, shipPos);

            const distance = vectorToPlanet.length();
            if (distance < 0 || isNaN(distance)) return;
            const gravityAcc = GameConfigs.GRAVITATION*planet.getMass() / (distance*distance);

            this.gravityVector.add(vectorToPlanet.clone().normalize().multiplyScalar(gravityAcc));
        });

        return this.gravityVector;
    }

    isSeen(object){
        if (!this.obj || !this.loaded || !object.loaded || !object) return -1;
        if(!object.getMesh()) return -1;
        this.obj.updateMatrixWorld(true);
        object.getMesh().updateMatrixWorld(true);
        
        const quaternion = new Quaternion();
        this.obj.getWorldQuaternion(quaternion);
        
        const objectPos = new Vector3();
        const currentPos = new Vector3();
        const forward = new Vector3(0,0,1);
        forward.applyQuaternion(quaternion).normalize();
        forward.z = 0;
        const objectVector = new Vector3();
        

        object.getMesh().getWorldPosition(objectPos);
        this.obj.getWorldPosition(currentPos);
        objectVector.subVectors(objectPos, currentPos);

        currentPos.z = 0;
        objectPos.z = 0;

        const objectNormalized = objectVector.clone().normalize();
        
        const angleCosine = Math.cos(this.SIGHT_CONE);
        const dot = forward.clone().dot(objectNormalized);
        const distance = objectVector.length();

        if (dot > angleCosine){
            for (const planet of [...GameState.planets,  GameState.sun]){
                if(!planet.mesh.visible) continue;
                const planetPos = planet.getWorldPosition();
                planetPos.z = 0;
                const planetDir = new Vector3().subVectors(planetPos, currentPos);
                const planetDot = planetDir.dot(objectNormalized);
                if(planetDot <0 || planetDot > distance) continue;
                const perpendicular = new Vector3().copy(planetDir);
                perpendicular.sub(objectNormalized.clone().multiplyScalar(planetDot));
                if(perpendicular.length() < planet.getHitboxSize())
                    return -1;
            }
            return distance;
        }
        else return -1;
    }

    getVelocity(){
        const vel = this.vel.clone();
        vel.z = 0;
        return vel
    }

    

    getName(){ return this.name; }
    getMass(){ return this.MASS; }
    getHealth(){ return this.currentHealth; }
    getMaxHealth(){ return this.MAX_HEALTH; }
    getHitboxSize(){ return this.HITBOX_RANGE; }


    setTeam(team){ this.team = team; }
    getTeam(){ return this.team; }

    explosion(){
        if (this.dead) return;
        this.dead = true;
        const explosion = new Explosion(this);
        GameState.explosions.push(explosion);

    }

    destroy(){
        // console.log(`[${this.getName()}] destroy() called`);
        GameState.npcs = GameState.npcs.filter((npc)=>{ return npc !== this});
        if(this.mlt){
            for (const material of Object.values(this.mlt.materials)){
                material.dispose?.();
            }
            this.mlt = null;
        }
        if(this.obj){
            GameState.scene.remove(this.obj);
            this.obj.traverse((child)=>{
                if(child.isMesh){
                    child.geometry.dispose();
                    if(Array.isArray(child.material))
                        child.material.forEach((mtl)=>mtl.dispose());
                    else if(child.material)
                        child.material.dispose();
                }
            });
            this.obj = null;
        }
        this.loaded = false;
        this.dead = true;
    }

    shipCollision(object){
        
        if(!(object instanceof Character) || !(object instanceof Enemy)) return;
        if(object.isDead()) return;
        if(object === this) return; 
        if(this.collisionsResultShip[object.getName()]) return;
        const currentPos = this.getWorldPosition();
        const otherPos = object.getWorldPosition();
        const direction = new Vector3();
        direction.subVectors(otherPos, currentPos);
        direction.z = 0;

        const distance = direction.length();
        if(distance < this.getHitboxSize() + object.getHitboxSize()){
            const normDirection = direction.lengthSq() === 0 ? new Vector3(): direction.normalize();

            const deltaL = (this.getHitboxSize() + object.getHitboxSize()) - distance;
            const dirMine = normDirection.clone().multiplyScalar(-1);
            const dirOther = normDirection.clone();
            

            const myVel = this.getVelocity();
            myVel.z = 0;
            const otherVel = object.getVelocity();
            otherVel.z = 0;
            const relativeVel = otherVel.clone().sub(myVel);
            
            const impactSpeed = relativeVel.dot(normDirection);
            if(impactSpeed <= 0) return;

            const myMass = this.getMass();
            const otherMass = object.getMass();

            if( myMass <=0 || otherMass <= 0){
                // console.log("Invalid masses");
                // console.log(this.getName, myMass);
                // console.log(object.getName(), otherMass);   
                return;
            }

            const massCoefficient = (myMass*otherMass)/(myMass+otherMass);

            const momentum = massCoefficient *impactSpeed * GameConfigs.IMPACT_MUL;
            const impactDamage = 0.5 * momentum * impactSpeed;
            
            var ramFactor = (direction.angleTo(this.getWorldDirection()) < Math.PI/4)? 0.25: 0.5;

            const report = {
                damage: impactDamage/(myMass*ramFactor),
                impulse: momentum/myMass,
                direction: dirMine
            }

            const reportOther = {
                damage: impactDamage*(ramFactor)/otherMass,
                impulse: momentum/otherMass,
                direction: dirOther
            }
            // console.log(`[${this.getName()}] hit [${object.getName()}]: `, report);
            this.collisionsResultShip[object.getName()] = report;
            object.collisionsResultShip[this.getName()] = reportOther;
            if(deltaL > 0){
                this.getMesh().position.addScaledVector(dirMine, deltaL/2);
                object.getMesh().position.addScaledVector(dirOther, deltaL/2);
            }
        }
    }

    planetCollision(object){
        if(!(object instanceof Planet) && !(object instanceof Star)) return;
        if(this.collisionsResultPlanet[object.getName()]) return;
        const currentPos = this.getWorldPosition();
        const otherPos = object.getWorldPosition();
        const distance = otherPos.distanceTo(currentPos);
        if(distance < this.getHitboxSize() + object.getHitboxSize()){
            this.takeDamage(this.getMaxHealth());
        }
    }

    bulletCollision(object){
        if(!(object instanceof Bullet) && !(object instanceof Rocket)) return;
        if(!object.isValid()) return;
        if(this.collisionsResultBullet[object.getName()]) return;
        const collisionReport = object.hit(this);
        if(collisionReport.occurred){
            this.collisionsResultBullet[object.getName()] = collisionReport;
            this.onAttack(collisionReport.sender);
        }
    }

    dealWithCollisions(){
        var totalDamage = 0;
        const totalRecoil = new Vector3();
        const vulnerable = GameState.clock.getElapsedTime() - this.lastDamage > this.DAMAGE_CD;
        
        if (!this.vel||isNaN(this.vel.x)||isNaN(this.vel.y)||isNaN(this.vel.z)) this.vel = new Vector3();

        for (const bullet in this.collisionsResultBullet){
            const data = this.collisionsResultBullet[bullet];
            // console.log('Bullet collision data:', data);
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
            // console.log('Ship collision data:', data);
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
        if (totalDamage>0){
            this.collisionsResultBullet = {};
            this.collisionsResultShip = {};
            this.lastDamage = GameState.clock.getElapsedTime();
            // console.log(`[${this.getName()}] Total recoil: `, totalRecoil);
            if(this.obj)
                this.vel.add(totalRecoil);
        }
    }

    onAttack(enemy){}

    takeDamage(damage){
        if (this.dead) return;
        this.currentHealth -= Math.min(damage, this.damageThreshold);
        this.damageThreshold -= damage;
        if(damage>0)
            console.log(`[${this.getName()}] Damage Taken ${damage}, currentHealth: ${this.currentHealth}`);
        if(this.currentHealth <= 0){
            this.currentHealth = 0;
            this.explosion();
        }
    }

    update(){
        if (GameState.impactSoundBuffer && !this.sound) {
            this.sound = new THREE.PositionalAudio(GameState.listener);
            this.sound.setBuffer(GameState.impactSoundBuffer);
            this.sound.setRefDistance(20);
            this.sound.setVolume(0.8);
            this.sound.setLoop(false);
            this.obj.add(this.sound);
        }
    }

}