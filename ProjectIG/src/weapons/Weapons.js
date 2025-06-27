import { Clock, Vector3, Quaternion, PositionalAudio } from "three";
import { Bullet } from "./Bullet";
import { GameState } from "@/GameState";
import { Rocket } from "./Rocket";
import * as THREE from 'three';

export class DummyWeapon{
    constructor(){
        this.NAME = 'No weapon';
    }

    shoot(){
        return;
    }

    getName(){ return this.NAME; }
}

export class SimpleGun{
    constructor(ship){
        this.CD = 0.25;
        this.BULLET_TTL = 5;
        this.NAME = 'Basic Gun';
        this.ship = ship;
        this.idCounter = 0;

        this.timeKeeper = new Clock(true);
        this.timeLastBullet = 0;
        if (GameState.gunSoundBuffer) {
            this.sound = new THREE.PositionalAudio(GameState.listener);
            this.sound.setBuffer(GameState.gunSoundBuffer);
            this.sound.setRefDistance(20);
            this.sound.setVolume(0.8);
            this.sound.setLoop(false);
            this.ship.getMesh().add(this.sound);
        }
    }

    createBulletName(){
        const name = `${this.ship.getName()}-${this.getName()}-${this.idCounter}`;
        this.idCounter++;
        return name;
    }

    shoot(){
        if (GameState.gunSoundBuffer && !this.sound) {
            this.sound = new PositionalAudio(GameState.listener);
            this.sound.setBuffer(GameState.gunSoundBuffer);
            this.sound.setRefDistance(20);
            this.sound.setVolume(0.8);
            this.sound.setLoop(false);
            this.ship.getMesh().add(this.sound);
        }
        const elapsed = this.timeKeeper.getElapsedTime();
        if (elapsed - this.timeLastBullet > this.CD){
                const shipPos = this.ship.getWorldPosition();
                const shipDir = this.ship.getWorldDirection();
                const name = this.createBulletName(); 
                const bullet = new Bullet(shipPos, shipDir, this.ship, 0.07, name);
                this.timeLastBullet = elapsed;
                bullet.setTTL(this.BULLET_TTL);
                GameState.bullets.push(bullet);
                GameState.scene.add(bullet.getMesh());
                if(this.sound) this.sound.play();
            }
    }

    getName(){
        return this.NAME;
    }

    getCD(){
        const elapsed = this.timeKeeper.getElapsedTime();
        const time_left = this.CD - (elapsed - this.timeLastBullet);
        return time_left;
    }

}

export class Shotgun extends SimpleGun{
    constructor(ship) {
        super(ship);
        this.NAME = 'ShotGun';
        this.CD = 1.5;
        this.BULLET_TTL = 5;
        this.BULLETS_IN_SHELL = 6;
        this.SPREAD = Math.PI/6;
    }
    shoot(){
        if (GameState.gunSoundBuffer && !this.sound) {
            this.sound = new PositionalAudio(GameState.listener);
            this.sound.setBuffer(GameState.gunSoundBuffer);
            this.sound.setRefDistance(20);
            this.sound.setVolume(0.8);
            this.sound.setLoop(false);
            this.ship.getMesh().add(this.sound);
        }
        const elapsed = this.timeKeeper.getElapsedTime();
        if (elapsed - this.timeLastBullet> this.CD){
            const shipPos = this.ship.getWorldPosition();
            const shipDir = this.ship.getWorldDirection();
            shipDir.z = 0;
            shipDir.normalize();

            for(let i=0;i<this.BULLETS_IN_SHELL;i++){
                const t = (i/(this,this.BULLETS_IN_SHELL-1));
                const angleOffset = (t-0.5)*this.SPREAD;
                const spreadQuat = new Quaternion().setFromAxisAngle(
                    new Vector3(0, 0, 1),
                    angleOffset
                );
                const spreadDir = shipDir.clone().applyQuaternion(spreadQuat).normalize();
                const name = this.ship.getName() + this.idCounter;

                const bullet = new Bullet(shipPos, spreadDir, this.ship, 0.12, name);
                bullet.setTTL(this.BULLET_TTL);
                this.idCounter++;
                GameState.bullets.push(bullet);
                GameState.scene.add(bullet.getMesh());
            }
            if(this.sound) this.sound.play()
            this.timeLastBullet = elapsed;
        }
    }
}

export class RocketLauncher extends SimpleGun{
    constructor(ship){
        super(ship);
        this.CD = 7;
        this.BULLET_TTL = 15;
        this.NAME = "Rocket";
        if (GameState.rocketSoundBuffer) {
            this.sound = new PositionalAudio(GameState.listener);
            this.sound.setBuffer(GameState.rocketSoundBuffer);
            this.sound.setRefDistance(20);
            this.sound.setVolume(0.8);
            this.sound.setLoop(false);
            this.ship.getMesh().add(this.sound);
        }

    }
    shoot(){
        if (GameState.rocketSoundBuffer && !this.sound) {
            this.sound = new PositionalAudio(GameState.listener);
            this.sound.setBuffer(GameState.rocketSoundBuffer);
            this.sound.setRefDistance(20);
            this.sound.setVolume(0.8);
            this.sound.setLoop(false);
            this.ship.getMesh().add(this.sound);
        }
        const elapsed = this.timeKeeper.getElapsedTime();
        if (elapsed - this.timeLastBullet > this.CD){
                const shipPos = this.ship.getWorldPosition();
                const shipDir = this.ship.getWorldDirection();
                const name = this.createBulletName(); 
                const bullet = new Rocket(shipPos, shipDir, this.ship, 0.12, name);
                this.timeLastBullet = elapsed;
                bullet.setTTL(this.BULLET_TTL);
                GameState.bullets.push(bullet);
                GameState.scene.add(bullet.getMesh());
                if(this.sound) this.sound.play();
            }
    }
}