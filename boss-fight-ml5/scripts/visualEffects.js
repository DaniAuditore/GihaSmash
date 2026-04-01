/**
 * Motor mínimo de partículas.
 * @class Particle
 */
class Particle {
  constructor(x, y, type = 'NORMAL') {
    this.x = x;
    this.y = y;

    if (type === 'BLUE') {
      this.vx = random(-5, 5);
      this.vy = random(-5, 5);
      this.color = color(0, random(100, 200), random(200, 255));
    } else if (type === 'RED') {
      this.vx = random(-12, 12);
      this.vy = random(-12, 12);
      this.color = color(random(200, 255), 0, 0);
    } else if (type === 'PURPLE') {
      this.vx = random(-20, 20);
      this.vy = random(-20, 20);
      this.color = random() > 0.5 ? color(255, 0, 0) : color(0, 50, 255);
    } else {
      this.vx = random(-8, 8);
      this.vy = random(-8, 8);
      this.color = color(random(200, 255), random(50, 150), 0);
    }
    this.life = 255;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 15;
  }

  draw() {
    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), this.life);
    circle(this.x, this.y, random(4, 12));
  }
}

class FXManager {
  /**
   * Instancia el gestor de "Juice" base mediante las directrices de Game Feel de JW Nijman.
   */
  constructor() {
    this.particles = [];
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.hitstopTimer = 0;
  }

  /**
   * Distorsión forzada mediante "screenshake" global instanciada desde el origen (0,0).
   * @param {number} intensity - Modificador de la amplitud `dx,dy`.
   * @param {number} durationFrames - Contador regresivo de *Frames* afectados.
   */
  triggerScreenshake(intensity, durationFrames) {
    this.shakeIntensity = intensity;
    this.shakeDuration = durationFrames;
  }

  /**
   * Invoca el hitstop (congelación global).
   * Impide la interpolación natural del juego en el loop siguiente.
   * @param {number} durationMs - Milisegundos que el Game Loop principal debería ser suspendido (Normal: 60ms).
   */
  triggerHitstop(durationMs) {
    this.hitstopTimer = millis() + durationMs;
  }

  spawnParticles(x, y, count = 20, type = 'NORMAL') {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, type));
    }
  }

  isHitstopActive() {
    return millis() < this.hitstopTimer;
  }

  applyScreenshake() {
    if (this.shakeDuration > 0) {
      let dx = random(-this.shakeIntensity, this.shakeIntensity);
      let dy = random(-this.shakeIntensity, this.shakeIntensity);
      translate(dx, dy);
      this.shakeDuration--;
    }
  }

  updateAndDrawParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.update();
      p.draw();
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
}
