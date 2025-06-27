export const PeripheralsInputs = {
    'escape':0,
    'a': 0,
    'd': 0,
    's': 0,
    'w': 0,
    'c':0,
    'space':0,
    'mb1':0,
    'mb0':0,
    'mouseX':0,
    'mouseY':0
}

export function keydownHandler(event){
    switch (event.key.toLowerCase()) {
        case 'a':
            PeripheralsInputs['a'] = 1;
            PeripheralsInputs['d'] = 0;
            break;
        case 'c':
            PeripheralsInputs['c'] = 1;
            break;
        case 'd':
            PeripheralsInputs['d'] = 1;
            PeripheralsInputs['a'] = 0;
            break;
        case 'w':
            PeripheralsInputs['w'] = 1;
            PeripheralsInputs['s'] = 0;
            break;
        case 's':
            PeripheralsInputs['s'] = 1;
            PeripheralsInputs['w'] = 0;
            break;
        case 'q':
            PeripheralsInputs['q'] = 1;
            break;
        case 'e':
            PeripheralsInputs['e'] = 1;
            break;
        case ' ':
            PeripheralsInputs['space'] = 1;
            break;
        default:
            console.log('Unknown key: ' + event.key);
            break;
    }
}

export function keyupHandler(event){
    switch (event.key.toLowerCase()) {
        case 'a':
            PeripheralsInputs['a'] = 0;
            break;
        case 'c':
            PeripheralsInputs['c'] = 0;
            break;
        case 'd':
            PeripheralsInputs['d'] = 0;
            break;
        case 'w':
            PeripheralsInputs['w'] = 0;
            break;
        case 's':
            PeripheralsInputs['s'] = 0;
            break;
        case ' ':
            PeripheralsInputs['space'] = 0;
            break;
        default:
            break;
    }
}

export function mousedownHandler(event){
    switch (event.button){
        case 0:
            PeripheralsInputs['mb0'] = 1;
            break;
        case 1:
            PeripheralsInputs['mb1'] = 1;
            break;
        default:
            console.log('Unused mouse button', (event.button));
            break;
    }
}

export function mouseupHandler(event){
    switch (event.button){
        case 0:
            PeripheralsInputs['mb0'] = 0;
            break;
        case 1:
            PeripheralsInputs['mb1'] = 0;
            break;
        default:
            console.log('Unused mouse button', (event.button));
            break;
    }
}

export function mousemoveHand(event){
    var x = event.movementX || 0;
    var y = event.movementY || 0;

    PeripheralsInputs['mouseX'] = x;
    PeripheralsInputs['mouseY'] = y;
}