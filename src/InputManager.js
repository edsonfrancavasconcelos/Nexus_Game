export class InputManager {

    constructor() {

        // =====================================
        // INPUT
        // =====================================
        this.moveInput = {
            x: 0,
            y: 0
        };

        // =====================================
        // TECLAS
        // =====================================
   this.keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false // Adicionado
};

// No _initKeyboard, adicione:
if (e.code === 'Space') {
    e.preventDefault();
    this.keys.Space = true;
}

// No evento 'keyup', adicione:
if (e.code === 'Space') {
    this.keys.Space = false;
}

        // =====================================
        // VELOCIDADE MAIS RÁPIDA
        // =====================================
        this.inputAcceleration = 0.22;

        this.inputSmoothness = 0.18;

        this.currentX = 0;
        this.currentY = 0;

        this.joystickActive = false;

        this._initKeyboard();

        this._initJoystick();
    }

    // =====================================
    // TECLADO
    // =====================================
    _initKeyboard() {

        window.addEventListener(
            'keydown',
            (e) => {

                if (e.code in this.keys) {

                    e.preventDefault();

                    this.keys[e.code] = true;
                }
            }
        );

        window.addEventListener(
            'keyup',
            (e) => {

                if (e.code in this.keys) {

                    this.keys[e.code] = false;
                }
            }
        );

    window.addEventListener(
    'blur',
    () => {

        for (let key in this.keys) {
            this.keys[key] = false;
        }

        this.currentX = 0;
        this.currentY = 0;

        this.moveInput.x = 0;
        this.moveInput.y = 0;
    }
);
    }

    // =====================================
    // JOYSTICK MOBILE
    // =====================================
    _initJoystick() {

        const joystickArea =
            document.getElementById(
                'joystick-area'
            );

        const stick =
            document.getElementById(
                'stick'
            );

        if (!joystickArea || !stick)
            return;

        let touchStartX = 0;
        let touchStartY = 0;

        // =====================================
        // MAIOR ALCANCE
        // =====================================
        const maxDistance = 65;

        joystickArea.addEventListener(
            'touchstart',
            (e) => {

                this.joystickActive = true;

                const touch =
                    e.targetTouches || e.touches;

                touchStartX =
                    touch[0].clientX;

                touchStartY =
                    touch[0].clientY;
            }
        );

        joystickArea.addEventListener(
            'touchmove',
            (e) => {

                if (!this.joystickActive)
                    return;

                const touch =
                    e.targetTouches || e.touches;

                const deltaX =
                    touch[0].clientX -
                    touchStartX;

                const deltaY =
                    touch[0].clientY -
                    touchStartY;

                const distance =
                    Math.min(
                        Math.sqrt(
                            deltaX * deltaX +
                            deltaY * deltaY
                        ),
                        maxDistance
                    );

                const angle =
                    Math.atan2(
                        deltaY,
                        deltaX
                    );

                const moveX =
                    Math.cos(angle) *
                    distance;

                const moveY =
                    Math.sin(angle) *
                    distance;

                // =====================================
                // JOYSTICK MAIS SOLTO
                // =====================================
                stick.style.transform =
                    `translate(${moveX}px, ${moveY}px) scale(1.15)`;

                this.moveInput.x =
                    moveX / maxDistance;

                this.moveInput.y =
                    -(moveY / maxDistance);
            }
        );

        joystickArea.addEventListener(
            'touchend',
            () => {

                this.joystickActive = false;

                stick.style.transform =
                    'translate(0px, 0px) scale(1)';

                this.moveInput.x = 0;
                this.moveInput.y = 0;
            }
        );
    }

    // =====================================
    // UPDATE
    // =====================================
    update() {

        // =====================================
        // TECLADO
        // =====================================
        if (!this.joystickActive) {

            let targetX = 0;
            let targetY = 0;

            // =====================================
            // DIREÇÕES
            // =====================================
            if (this.keys.ArrowLeft)
                targetX = -1;

            if (this.keys.ArrowRight)
                targetX = 1;

            if (this.keys.ArrowUp)
                targetY = 1;

            if (this.keys.ArrowDown)
                targetY = -1;

            // =====================================
            // ACELERAÇÃO SUAVE
            // =====================================
            this.currentX =
                this.currentX +
                (
                    targetX -
                    this.currentX
                ) * this.inputAcceleration;

            this.currentY =
                this.currentY +
                (
                    targetY -
                    this.currentY
                ) * this.inputAcceleration;

            return {
                x: this.currentX,
                y: this.currentY
            };
        }

        // =====================================
        // MOBILE
        // =====================================
        return {
            x: this.moveInput.x * 1.7,
            y: this.moveInput.y * 1.7
        };
    }
}