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
    }

    init() {
        // Garantir que os sons extras sejam carregados
        this._createAudio('explosion', '/assets/sounds/explosao_inimiga.mp3');
        this._createAudio('enemyPass', '/assets/sounds/inimiga_passando.mp3');
        this._createAudio('enemyLaser', '/assets/sounds/laser_inimigo.mp3');
    }

    _createAudio(name, path) {
        const audio = new Audio(path);
        audio.volume = this.volumes[name] || 0.5;
        // preload="auto" é essencial para o som tocar instantaneamente
        audio.preload = 'auto'; 
        
        audio.onerror = () => console.error(`❌ Erro: Som não encontrado em ${path}`);
        
        // Força o carregamento no buffer do navegador
        audio.load();
        this.sounds[name] = audio;
    }

    play(name) {
        const sound = this.sounds[name];
        if (!sound) return;

        // Se for a nave (som ambiente em loop)
        if (name === 'nave') {
            if (sound.paused) {
                sound.loop = true;
                sound.play().catch(e => console.warn("Bloqueio de áudio:", e));
            }
            return;
        }

        // Para sons de impacto/disparo (que podem sobrepor)
        if (this.overlapSounds.includes(name)) {
            // Cria uma instância nova sempre que disparar para evitar latência
            const clone = sound.cloneNode(true);
            clone.volume = sound.volume;
            // Remove o clone do DOM/Memória ao terminar para não vazar
            clone.onended = () => {
                clone.src = ""; // Limpa a memória
                clone.remove();
            };
            clone.play().catch(e => console.warn("Bloqueio de overlap:", e));
        } else {
            // Sons únicos que não sobrepõem
            sound.currentTime = 0;
            sound.play().catch(() => {});
        }
    }
}