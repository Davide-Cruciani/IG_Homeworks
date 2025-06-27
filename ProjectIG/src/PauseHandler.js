class PauseHandler{
    constructor(){
        this.locked = false;
        this.active = false;
        this.element = document.createElement('div');
        this.element.id = 'pause-overlay';
        this.element.innerText = 'PAUSE';
        document.body.appendChild(this.element);
    }

    activate(){
        if(this.active || this.locked) return;
        this.element.classList.add('visible');
        this.active = true;
    }

    lock(){
        this.locked = true;
        this.deactivate();
    }

    unlock(){
        this.locked = false;
    }
    
    deactivate(){
        if(!this.active) return;
        this.element.classList.remove('visible');
        this.active = false;
    }

}

export const Pause = new PauseHandler();