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

        // Sons que podem tocar várias vezes simultaneamente (Pool)
        this.overlapSounds = ['laser', 'enemyLaser', 'explosion'];
        
        this._loadInitialSounds();
    }

    _loadInitialSounds() {
        // Sons básicos carregados imediatamente
        this._createAudio('laser', './assets/sounds/laser.mp3');
        this._createAudio('nave', './assets/sounds/nave.mp3');
    }

    init() {
        // Carrega o restante dos sons após interação do usuário
        this._createAudio('explosion', './assets/sounds/explosao_inimiga.mp3');
        this._createAudio('enemyPass', './assets/sounds/inimiga_passando.mp3');
        this._createAudio('enemyLaser', './assets/sounds/laser_inimigo.mp3');

        console.log("🔊 SoundManager: Todos os sistemas de áudio prontos.");
    }

    _createAudio(name, path) {
        const audio = new Audio(path);
        audio.volume = this.volumes[name] || 0.5;
        audio.preload = 'auto';
        audio.load(); // Força o buffer
        this.sounds[name] = audio;
    }

    /**
     * Toca um som.
     * @param {string} name - Nome do som
     * @param {boolean} loop - Se deve repetir
     */
    play(name, loop = false) {
        const sound = this.sounds[name];
        if (!sound) return;

        // Lógica para o som do motor (Nave)
        if (name === 'nave') {
            if (sound.paused) {
                sound.loop = true;
                sound.play().catch(() => {});
            }
            return;
        }

        // Para sons de efeito rápido, usamos clones se o original estiver tocando
        // Isso resolve o problema do som "cortado" quando se atira muito rápido
        if (this.overlapSounds.includes(name)) {
            if (!sound.paused) {
                const clone = sound.cloneNode();
                clone.volume = sound.volume;
                clone.play().catch(() => {});
                
                // Limpeza automática do clone após tocar para não vazar memória
                clone.onended = () => {
                    clone.remove();
                };
            } else {
                sound.currentTime = 0;
                sound.play().catch(() => {});
            }
        } else {
            // Sons normais (ex: enemyPass) apenas reiniciam
            sound.currentTime = 0;
            sound.play().catch(() => {});
        }
    }

    stop(name) {
        const sound = this.sounds[name];
        if (sound) {
            sound.pause();
            sound.currentTime = 0;
        }
    }

    // Útil para quando o jogo vai para a tela de Game Over ou Pause
    stopAll() {
        Object.keys(this.sounds).forEach(name => this.stop(name));
    }
}