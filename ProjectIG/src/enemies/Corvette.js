import { Vector3, Quaternion, Matrix4, Euler } from "three";
import * as THREE from 'three';
import { SimpleGun } from "../weapons/Weapons";
import { Enemy } from "./Enemy";
import { GameState } from "@/GameState";

export class Corvette extends Enemy{
    constructor(position, team){
        super("spaceship1", position, team);
        this.name = 'Corvette-T'+ team +"-"+ GameState.npcUUID;
        GameState.npcUUID++;
        this.MAX_SPEED = 2;
        this.ACCELERATION = 3;
        this.TURN_SPEED = Math.PI/5;
        this.BASE_DRAG = 1.005;
        this.MAX_HEALTH = 500;
        this.MASS = 10;
        this.SIGHT_CONE = Math.PI/4;
        this.SIGHT_DISTANCE = 25;
        this.AGGRO_GRACE = 3;
        this.AGGRO_TIME = 15;
        this.RADAR_CD = 60;
        this.MOV_CD = 7;
        this.SAFETY_DIST = 30;


        this.celestialDanger = false;
        this.waitForRadar = 0;
        this.suspects = [];
        this.lastBehavior = this.currentBehavior;
        this.currentHealth = this.MAX_HEALTH;
        this.target = null;
        this.targetLastSeen = 0;
        this.orderReceived = false;
        this.destination = null;
        this.sinceArrival = 0;
        this.remember = null;
        this.lastKnowLocation = null;
        
    }

    update(dt){
        // console.log(this.getName()+" bull: ",this.collisionsResultBullet);
        // console.log(this.getName()+" ship: ",this.collisionsResultShip);
        this.damageThreshold = this.MAX_HEALTH*0.8;
        super.update();
        
        const time = dt*GameState.timeDial;
        if (!this.loaded || !this.obj) return;
        this.obj.updateMatrixWorld(true);
        this.dealWithCollisions();

        if(this.waitForRadar > 0) this.waitForRadar -= time;
        if(this.sinceArrival > 0) this.sinceArrival -= time;

        if(!this.target && this.suspects.length > 0){
            this.checkOnSuspects(time);
        }
        else if(!this.target){
            this.findSuspects();
        }
        else{
            const visible = this.isSeen(this.target);
            if(visible>0 && visible<this.SIGHT_DISTANCE){
                this.targetLastSeen = 0;
                this.goto(this.target.getWorldPosition());
                this.lastKnowLocation = this.target.getWorldPosition();
                this.fireArmaments();
                this.alert.setAlert('red', '!');
                this.alert.setVisible(true);
            }else if(this.targetLastSeen > this.AGGRO_TIME){
                this.target = null;
                this.targetLastSeen = 0;
                this.alert.setVisible(false);
            }else{
                this.targetLastSeen+=time;
                this.alert.setAlert('yellow',"!");
                this.alert.setVisible(true);
                if(this.lastKnowLocation)
                    this.goto(this.lastKnowLocation);
            }
        }

        this.navigator();

        this.movement(time);
    }

    onAttack(enemy){
        if(!enemy || enemy.getTeam() === this.team) return;
        this.target = enemy;
        this.destination = enemy.getWorldPosition();
    }

    goto(pos){
        this.destination = pos.clone();
        this.destination.z = 0;
    }

    navigator(){
        const pos = this.getWorldPosition();
        var minDist = Infinity;
        var closestBody = null;
        for(const body of [...GameState.planets, GameState.sun]){
            if(body.getMesh().visible === false) continue;
            const bodyPos = body.getWorldPosition();
            const dist = new Vector3().subVectors(bodyPos, pos);
            const length = dist.length();
            if(length > this.SAFETY_DIST) continue;
            if(length < minDist){
                minDist = length;
                closestBody = body;
            } 
        }
        if(closestBody){
            this.celestialDanger = true;
            const bodyPos = closestBody.getWorldPosition();
            const toBody = new Vector3().subVectors(bodyPos, pos);
            toBody.z = 0;

            const escapeDir = toBody.clone().cross(new Vector3(0,0,1)).normalize();
            const bodyVel = closestBody.getVelocity();
            bodyVel.z = 0;
            const projLength = bodyVel.dot(escapeDir);

            const offset = new Vector3();

            if(projLength > 0){
                offset.add(escapeDir.clone().normalize());
            }else{
                offset.add(escapeDir.clone().negate().normalize());
            }

            if(this.destination){
                this.remember = this.destination;
            }
            this.destination = this.getWorldPosition().clone().addScaledVector(offset, closestBody.getHitboxSize());
            return;
        }
        if(this.celestialDanger){
            this.destination = this.remember;
            this.celestialDanger = false;
            return;
        }

        if(!this.destination && this.sinceArrival <= 0){
            if(!this.target && this.waitForRadar > 0){
                const newOffset = new Vector3(
                    (Math.random()-0.5)*40 + 10,
                    (Math.random()-0.5)*40 + 10,
                    0
                )
                this.destination = this.getWorldPosition().clone().add(newOffset);
                this.destination.z = 0;
                return;
            }
            else if(!this.target){
                var closest = Infinity;
                var name = ''
                for(const ship of [...GameState.npcs, GameState.player]){
                    if(ship.getTeam() === this.getTeam()) continue;
                    const OtherPos = ship.getWorldPosition();
                    const dist = new Vector3().subVectors(OtherPos, pos);
                    if(dist.length() < closest){
                        this.destination = OtherPos;
                        closest = dist.length();
                        name = ship.getName();
                    } 
                }
                // console.log(this.getName(), "Radar: ", name);
                this.waitForRadar = this.RADAR_CD;
                return;
                // console.log("used radar");
            }else{
                this.destination = this.target.getWorldPosition();
                this.destination.z = 0;
                return;
                // console.log("Chasing player");
            }
        }else if(this.target){
            this.destination = this.target.getWorldPosition();
            this.destination.z = 0;
            // console.log("Have a destination because: Chasing player");
        }
    }

    movement(time){
        if(this.sinceArrival > 0) return;
        if(!this.loaded || !this.obj) return;
        if(!this.destination) return;


        // console.log("Destination: ",this.destination)

        this.computeGravity();
        const integrity = isNaN(this.gravityVector.x)||isNaN(this.gravityVector.y)||isNaN(this.gravityVector.z);
        if(integrity) this.gravityVector.set(0,0,0);
    
        const dest = this.destination.clone();
        dest.z = 0;
        const position = this.getWorldPosition();
        position.z = 0;

        if(this.target){
            const targetVel = this.target.getVelocity();
            targetVel.z = 0;
            const predictedOffset  = targetVel.clone().multiplyScalar(time);
            predictedOffset.z = 0;
            dest.add(predictedOffset);
        }

        const direction = new Vector3().subVectors(dest, position);
        // console.log('Distance from dest', direction.length());
        if(direction.length()> 14){
            const norm = direction.clone().normalize();
            const forward = this.getWorldDirection();

            const angle = forward.angleTo(norm);

            // console.log("Angle: ", angle);

            const f = forward.clone().normalize();
            const t = norm.clone().normalize();

            // console.log("Destination direction: ", norm.toArray());
            // console.log("Forward", forward.toArray());

            const crossN = f.clone().cross(t);

            // console.log("CrossN: ", crossN);

            if(crossN.z > 0){
                this.getMesh().rotation.y += this.TURN_SPEED*time;
            }
            else if(crossN.z < 0){
                this.getMesh().rotation.y -= this.TURN_SPEED*time;
            }else if(Math.round(angle) !== 0){
                this.getMesh().rotation.y += this.TURN_SPEED*time;
            }

            this.vel.addScaledVector(norm, this.ACCELERATION*time);
            this.vel.addScaledVector(this.gravityVector, time);
            if (this.vel.length() > this.MAX_SPEED) {
                this.vel.setLength(this.MAX_SPEED);
            }
            // console.log("Going forward");
        }else if(direction.length() > 5){
            this.vel.set(0,0,0);
            this.vel.addScaledVector(this.gravityVector, time);
            this.sinceArrival = this.MOV_CD;
            // console.log("Still")  
        }else{
            const norm = direction.clone().normalize();
            this.vel.addScaledVector(norm.negate(), this.ACCELERATION*time);
            this.vel.addScaledVector(this.gravityVector, time);
            // console.log('Going Backwards');
        }
        this.vel.z = 0;
            
        this.obj.position.addScaledVector(this.vel, time);
        this.obj.position.z = 0;
        this.vel.divideScalar(this.BASE_DRAG);
    }

    getVelocity(){
        const vel = this.vel.clone();
        vel.z = 0;
        return vel;
    }
    

    checkOnSuspects(time){
        this.suspects = this.suspects.filter((suspect)=>{
            if(!suspect.ptr || !suspect.ptr.loaded) return true;
            const distance = this.isSeen(suspect.ptr);
            
            if (distance<0 || distance>this.SIGHT_DISTANCE)
                suspect.time -= time;    
            else
                suspect.time += time * (this.SIGHT_DISTANCE+5 - distance)/this.SIGHT_DISTANCE;

            if(suspect.time > this.AGGRO_GRACE){
                this.target = suspect.ptr;
                return false;
            }
            return (suspect.time > 0)
        });

        if(this.target){
            this.suspects = [];
            this.alert.setAlert('red', "!");
            this.alert.setVisible(true);
        }else{
            if (this.suspects.length > 0){
                this.alert.setAlert("yellow", "?");
                this.alert.setVisible(true);
            }
            else{
                this.alert.setVisible(false);
            }
        }
    }

    findSuspects(){

        const candidates = [];

        const playerVis = this.isSeen(GameState.player);
        if(playerVis>0 && playerVis<this.SIGHT_DISTANCE){
            var suspect = {
                ptr: GameState.player,
                time:0
            }
            candidates.push(suspect);
        }

        for(let entry of GameState.npcs){
            if(!entry || !entry.loaded || entry === this || entry.getTeam() === this.team) continue;
            const visible = this.isSeen(entry);
            if(visible>0 && visible<this.SIGHT_DISTANCE){
                const suspect = {
                    ptr: entry,
                    time:0
                }
                candidates.push(suspect);
            }
        }

        candidates.forEach((candidate)=>{
            const exists = this.suspects.find((val)=> val.ptr === candidate.ptr);
            if (!exists) this.suspects.push(candidate);
        })

        if (this.suspects.length > 0){
            this.alert.setVisible(true);
            this.alert.setAlert('yellow','?');
        }
    }

    fireArmaments(){
        this.mainGun.shoot();
    }
    kill(){
        this.destroy();
        GameState.npcs.forEach((npc)=>{npc.destroy()});
    }
}