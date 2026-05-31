export class SoundManager {
    constructor() {
        this.sounds = {};
        this.volumes = {
            laser: 0.3,
            enemyLaser: 0.25,
            nave: 0.15,
            explosion: 0.6,
            enemyPass: 0.4
        };
        this.overlapSounds = ['laser', 'enemyLaser', 'explosion', 'enemyPass'];
        this._loadInitialSounds();
    }

    _loadInitialSounds() {
        this._createAudio('laser', '/assets/sounds/laser.mp3');
        this._createAudio('nave', '/assets/sounds/nave.mp3');
         this._createAudio('nave', '/assets/sounds/inimiga_passando.mp3');
    }

    init() {
        this._createAudio('explosion', '/assets/sounds/explosao_inimiga.mp3');
        this._createAudio('enemyPass', '/assets/sounds/inimiga_passando.mp3');
        this._createAudio('enemyLaser', '/assets/sounds/laser_inimigo.mp3');
    }

    _createAudio(name, path) {
        const audio = new Audio(path);
        audio.volume = this.volumes[name] || 0.5;
        audio.preload = 'auto';
        audio.onerror = () => console.error("Erro ao carregar:", path);
        audio.load();
        this.sounds[name] = audio;
    }

    play(name) {
        const sound = this.sounds[name];
        if (!sound) return;

        if (name === 'nave') {
            if (sound.paused) {
                sound.loop = true;
                sound.play().catch(e => console.warn("Erro nave:", e));
            }
        } else if (this.overlapSounds.includes(name)) {
            const clone = sound.cloneNode(true);
            clone.volume = sound.volume;
            clone.play().catch(() => {});
        } else {
            sound.currentTime = 0;
            sound.play().catch(() => {});
        }
    }
}