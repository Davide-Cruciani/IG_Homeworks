import { GameState } from '@/GameState'
import { GameConfigs } from '@/GameConfigs';
import * as THREE from 'three';
import { Star, Planet, generatePlanetPosition } from './Cosmology';
import { Character } from './Character';
import { Corvette } from './enemies/Corvette';
import { Skysphere } from './Skysphere';

export function resetGame() {
    GameState.paused = true;
    GameState.clock.stop();

    GameState.scene.clear();

    GameState.npcs = [];
    GameState.planets = [];
    GameState.bullets = [];

    GameState.score = 0;

    GameState.zoom.level = 1;
    GameState.cameraRecoilOffset.set(0, 0, 0);

    GameState.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1200);
    GameState.clock = new THREE.Clock();
    GameState.scene = new THREE.Scene();

    const sun = new Star(new THREE.Vector3(0, 0, 0), 100, 50000);
    GameState.sun = sun;

    for (let i = 0; i < 5; i++) {
        const planetPosition = generatePlanetPosition();
        const size = Math.random() * 50 + 10;
        const mass = size * GameConfigs.DENSITY;
        const type = Math.floor(Math.random()*3);

        const planet = new Planet(planetPosition, size, mass, type);
        planet.initPlanetSpeed(sun.getWorldPosition());
        GameState.planets.push(planet);
    }

    GameState.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const skysphere = new Skysphere();
    GameState.scene.add(skysphere.getMesh());

    const player = new Character(new THREE.Vector3(0, -200, 0));
    GameState.player = player;


    setTimeout(()=>{
        GameState.clock.start();
        GameState.fps.sinceLast = GameState.clock.getElapsedTime();
        GameState.paused = false;
    }, 100);
}