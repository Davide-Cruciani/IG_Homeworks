import { Pause } from "./PauseHandler";
import { resetGame } from "./Restart";

class GameOverHandler{
    constructor(){
        this.mainElement = document.createElement('div');
        this.mainElement.id = 'game-over-screen';
        this.textElement = document.createElement('div');
        this.textElement.id = 'game-over-text';
        this.textElement.textContent = 'YOU DIED'
        this.scoreElement = document.createElement('div');
        this.scoreElement.id = 'score'
        this.scoreElement.textContent = '0';
        this.button = document.createElement('button');
        this.button.id = 'restart-button';
        this.button.textContent = 'Retry?';
        this.mainElement.appendChild(this.textElement);
        this.mainElement.appendChild(this.scoreElement);
        this.mainElement.appendChild(this.button);
        this.button.addEventListener('click', ()=>{
            Pause.unlock();
            resetGame();
            this.mainElement.style.display = 'none';
        });
        document.body.appendChild(this.mainElement);
    }
    showGameOverScreen(){
        this.mainElement.style.display = 'flex';
        if(document.pointerLockElement){
            document.exitPointerLock();
        }
        Pause.lock();   
    }

    updateScore(score){
        this.scoreElement.textContent = ''+score;
    }

} 

export const GameOver = new GameOverHandler();