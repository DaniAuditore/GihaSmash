class Bot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 50;
    this.h = 50;
    this.hp = 100;
    this.state = 'IDLE'; // IDLE, EVADING, HIT
    this.speed = 3;
    this.targetX = x;
    this.targetY = y;
  }

  update(fxManager) {
    // Si hay un hitstop activo, congelamos la lógica del bot
    if (fxManager.isHitstopActive() || this.hp <= 0) return;

    // Lógica básica de evasión/movimiento errático
    if (frameCount % 45 === 0 && this.state !== 'HIT') {
        this.targetX = random(100, width - 100);
        this.targetY = random(100, height - 100);
        this.state = 'EVADING';
    }

    if (this.state === 'EVADING') {
        this.x = lerp(this.x, this.targetX, 0.08);
        this.y = lerp(this.y, this.targetY, 0.08);
        if (abs(this.x - this.targetX) < 5 && abs(this.y - this.targetY) < 5) {
            this.state = 'IDLE';
        }
    }
  }

  draw() {
    if (this.hp <= 0) return; // Muerto
    
    push();
    fill(this.state === 'HIT' ? color(255, 0, 0) : color(0, 200, 100));
    stroke(255);
    strokeWeight(2);
    rect(this.x, this.y, this.w, this.h, 5);
    
    // HP Bar
    fill(255, 0, 0);
    noStroke();
    rect(this.x, this.y - 15, this.w, 5);
    fill(0, 255, 0);
    rect(this.x, this.y - 15, map(this.hp, 0, 100, 0, this.w), 5);
    pop();

    if (this.state === 'HIT') {
        this.state = 'IDLE'; // Reseteamos visualmente rápido, el hitstop maneja la pausa lógica
    }
  }

  takeDamage(amount, fxManager) {
    if (this.hp <= 0) return;
    
    this.hp -= amount;
    this.state = 'HIT';
    
    // "Juice" trigger
    fxManager.triggerHitstop(60); 
    fxManager.triggerScreenshake(20, 12);
    fxManager.spawnParticles(this.x + this.w/2, this.y + this.h/2, 30);
  }

  checkCollision(attackRect) {
    // AABB pura - Mandatorio
    return (attackRect.x < this.x + this.w) && 
           (attackRect.x + attackRect.w > this.x) && 
           (attackRect.y < this.y + this.h) && 
           (attackRect.y + attackRect.h > this.y);
  }
}
