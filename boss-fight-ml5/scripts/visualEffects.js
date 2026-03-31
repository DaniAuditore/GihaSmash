class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-8, 8);
    this.vy = random(-8, 8);
    this.life = 255;
    this.color = color(random(200, 255), random(50, 150), 0);
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
  constructor() {
    this.particles = [];
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.hitstopTimer = 0;
  }

  triggerScreenshake(intensity, durationFrames) {
    this.shakeIntensity = intensity;
    this.shakeDuration = durationFrames;
  }

  triggerHitstop(durationMs) {
    this.hitstopTimer = millis() + durationMs;
  }

  spawnParticles(x, y, count = 20) {
    for (let i = 0; i < count; i++) {
        this.particles.push(new Particle(x, y));
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
