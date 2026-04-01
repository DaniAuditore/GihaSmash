/**
 * Manages procedural sound effects using Web Audio API.
 * @class AudioManager
 */
class AudioManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // YouTube Player BGM Logic
    this.ytPlayer = null;
    this.isYtReady = false;

    // IDs de las canciones (Sacados de la URL de YouTube)
    this.trackNormal = 'dlRHA9zFFYA';
    this.trackMahoraga = 'A8nvFFfsUrA';
    this.currentTrack = null;

    // Iniciar Reproductor
    const initYouTubePlayer = () => {
      console.log('YouTube API Ready');
      this.ytPlayer = new YT.Player('youtube-player', {
        height: '10', // Oculto visualmente
        width: '10',
        videoId: this.trackNormal,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            console.log('YouTube Player Loaded');
            this.isYtReady = true;
            this.ytPlayer.setVolume(40); // 40% volumen para dejar respirar a los SFX

            // Si el jugador ya le dio a START antes de que cargara la API, iniciar música ahora
            if (typeof gameState !== 'undefined' && gameState !== 'START') {
              this.playNormalBGM();
            }
          },
          onError: (event) => {
            console.error('YouTube Error Code:', event.data);
            if (event.data === 101 || event.data === 150) {
              console.error('EL VIDEO NO PERMITE SER INCRUSTADO (Derechos de Autor).');
              // Fallback a la música normal si la de Mahoraga está bloqueada
              if (this.currentTrack === this.trackMahoraga) {
                console.log('Activando Plan B: Tema principal en el minuto 2:52...');
                this.currentTrack = 'mahoraga_fallback'; // Estado especial para poder volver a la normal después
                this.ytPlayer.loadVideoById({ videoId: this.trackNormal, startSeconds: 172 }); // 172s = 2:52
              }
            }
          },
          onStateChange: this.onPlayerStateChange.bind(this),
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initYouTubePlayer();
    } else {
      window.onYouTubeIframeAPIReady = initYouTubePlayer;
    }
  }

  onPlayerStateChange(event) {
    // YT.PlayerState.ENDED == 0 -> Hacer Loop manual
    if (event.data === 0) {
      this.ytPlayer.seekTo(0);
      this.ytPlayer.playVideo();
    }
  }

  /**
   * Resumes AudioContext on first user interaction to comply with autoplay policies.
   */
  init() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Iniciar la música de YouTube si la API cargó
    if (this.isYtReady && this.currentTrack !== this.trackNormal) {
      this.playNormalBGM();
    }
  }

  /**
   * Cambia la música de fondo al tema base
   */
  playNormalBGM() {
    if (!this.isYtReady) return;
    if (this.currentTrack !== this.trackNormal) {
      this.ytPlayer.loadVideoById({ videoId: this.trackNormal });
      this.currentTrack = this.trackNormal;
    }
    this.ytPlayer.playVideo();
  }

  /**
   * Cambia la música de fondo al tema de Mahoraga
   */
  playMahoragaBGM() {
    if (!this.isYtReady) return;
    if (this.currentTrack !== this.trackMahoraga) {
      this.ytPlayer.loadVideoById({ videoId: this.trackMahoraga });
      this.currentTrack = this.trackMahoraga;
    }
    this.ytPlayer.playVideo();
  }

  /**
   * Plays a short, sharp hit sound.
   */
  playHit() {
    if (this.ctx.state !== 'running') return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  /**
   * Plays a sweeping swoosh sound.
   */
  playSwoosh() {
    if (this.ctx.state !== 'running') return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  /**
   * Plays a high-pitched warning beep.
   */
  playWarning() {
    if (this.ctx.state !== 'running') return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }
}
