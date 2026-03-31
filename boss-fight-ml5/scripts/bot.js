class Bot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 50;
    this.h = 50;
    this.hp = 100;
    
    // Cinemática
    this.vx = 0;
    this.vy = 0;
    this.gravity = 0.8;
    this.jumpForce = -15;
    this.friction = 0.9;
    this.onGround = false;
    
    // Máquina de Estados
    this.state = 'IDLE'; // IDLE, JUMPING, HIT
    this.hitFrame = 0; // Temporizador nativo del motor de juego
    
    // Jugo
    this.squash = 1.0;
    this.stretch = 1.0;
  }

  applyPhysics(platform) {
    // ELIMINADO el early return de 'HIT' para permitir que el bot sufra knockback y caiga

    // Aplicar Gravedad
    this.vy += this.gravity;
    
    // Fricción horizontal: Deslizamiento (Knockback friction)
    this.vx *= this.friction;

    // Edge Guarding (IA Preventiva): Invertir dirección si intenta caminar fuera del borde
    // Ignorar protección de bordes si está siendo empujado por un golpe (estado HIT)
    if (this.state !== 'HIT' && this.onGround && frameCount % 60 !== 0) { 
        if (this.x + this.vx < platform.x || this.x + this.w + this.vx > platform.x + platform.w) {
            this.vx *= -1;
        }
    }

    // Actualizar posición
    this.x += this.vx;
    this.y += this.vy;

    // Colisión AABB de Suelo (Isla Central)
    let isOverPlatform = (this.x + this.w > platform.x) && (this.x < platform.x + platform.w);

    if (this.vy >= 0 && isOverPlatform && (this.y + this.h >= platform.y) && (this.y + this.h - this.vy <= platform.y + 20)) {
      this.y = platform.y - this.h;
      this.vy = 0;
      
      if (!this.onGround) {
          // Aterrizaje!
          this.squash = 0.6;
          this.stretch = 1.4;
          this.state = 'IDLE';
      }
      this.onGround = true;
    } else {
      this.onGround = false;
      if (this.state !== 'HIT') {
          this.state = 'JUMPING';
      }
    }

    // Reseteo Failsafe: Si cae al vacío (Knockback victoria instantánea o reset)
    if (this.y > height + 100) {
        this.respawn(platform);
    }
  }

  respawn(platform) {
      this.x = platform.x + platform.w / 2 - this.w / 2;
      this.y = platform.y - 150;
      this.vy = 0;
      this.vx = 0;
      this.hp -= 20; // Penalización por caer
      this.state = 'JUMPING';
  }

  jump() {
    if (this.onGround && this.state !== 'HIT') {
      this.vy = this.jumpForce;
      this.onGround = false;
      this.state = 'JUMPING';
      // Stretch on jump
      this.squash = 1.4;
      this.stretch = 0.6;
    }
  }

  update(fxManager, platform, timeMod = 1.0) {
    // Expansión de Dominio: Ralentizar el update drásticamente (Efecto stop-motion)
    if (timeMod < 1.0 && frameCount % Math.floor(1 / timeMod) !== 0) return;

    // Si hay un hitstop activo, congelamos todo el bot
    if (fxManager.isHitstopActive() || this.hp <= 0) return;

    this.applyPhysics(platform);

    // Recuperación del Squash/Stretch (Lerp hacia 1.0)
    this.squash = lerp(this.squash, 1.0, 0.15);
    this.stretch = lerp(this.stretch, 1.0, 0.15);

    // Sistema robusto de recuperación de estado basado en frameCount
    if (this.state === 'HIT' && (frameCount - this.hitFrame > 15)) {
        this.state = 'IDLE';
    }

    // IA reactiva: Movimiento horizontal y saltos si NO está en HIT
    if (this.onGround && this.state !== 'HIT' && frameCount % 60 === 0 && random() > 0.4) {
      // Intenta mantenerse central, o saltar si lo empujan
      let toCenter = (platform.x + platform.w / 2) - this.x;
      this.vx = (toCenter > 0 ? 1 : -1) * random(5, 12);
      if (random() > 0.5) {
          this.jump();
      }
    }
  }

  draw(platform) {
    if (this.hp <= 0) return; // Muerto
    
    push();
    
    // JUICE: Sombra dinámica de la Isla
    if (this.onGround) {
        fill(0, 0, 0, 80);
        noStroke();
        ellipse(this.x + this.w / 2, platform.y, this.w * 1.5, 10);
    }

    // Transladar al centro inferior del bot para el escalado (squash/stretch)
    translate(this.x + this.w / 2, this.y + this.h);
    
    // Aplicar deformación visual
    scale(this.stretch, this.squash);
    
    fill(this.state === 'HIT' ? color(255, 0, 0) : (this.state === 'JUMPING' ? color(0, 150, 255) : color(0, 200, 100)));
    stroke(255);
    strokeWeight(2);
    
    // Dibujar referenciando el nuevo centro (-w/2, -h)
    rect(-this.w / 2, -this.h, this.w, this.h, 5);
    pop();

    // HP Bar (sin deformación)
    push();
    fill(255, 0, 0);
    noStroke();
    rect(this.x, this.y - 15, this.w, 5);
    fill(0, 255, 0);
    rect(this.x, this.y - 15, map(this.hp, 0, 100, 0, this.w), 5);
    pop();
  }

  takeDamage(amount, attackX, fxManager, attackType = 'NORMAL') {
    // PROTECCIÓN (Guard Clause): Evitar solapamiento de daño o aplicar impacto sobre un bot muerto
    if (this.hp <= 0 || this.state === 'HIT') return;
    
    this.hp -= amount;
    this.state = 'HIT';
    this.hitFrame = frameCount; // Registrar foto del tiempo actual
    
    // JUICE: Knockback basado en la técnica
    let attackCenterRelativeX = attackX - (this.x + this.w / 2);
    let knockbackDir = (attackCenterRelativeX < 0) ? 1 : -1; // Empuje normal (lejos del ataque)
    
    if (attackType === 'BLUE') {
        // AZUL (Atracción): El bot es sacudido HACIA el ataque
        this.vx = -knockbackDir * 18; 
        this.vy = -3;
    } else if (attackType === 'RED') {
        // ROJO (Repulsión): El bot es empujado lejos con fuerza tremenda
        this.vx = knockbackDir * 25;
        this.vy = -8;
    } else if (attackType === 'PURPLE') {
        // PÚRPURA (Nuke): El bot sale volando para atrás sin salvación
        this.vx = knockbackDir * 40;
        this.vy = -15;
    } else {
        // NORMAL
        this.vx = knockbackDir * 12;
        this.vy = -5;
    }
    
    // "Juice" trigger
    fxManager.triggerHitstop(60); 
    fxManager.triggerScreenshake(attackType === 'PURPLE' ? 35 : 20, 15);
    fxManager.spawnParticles(this.x + this.w/2, this.y + this.h/2, attackType === 'PURPLE' ? 60 : 30, attackType);
  }

  checkCollision(attackRect) {
    // AABB pura - Mandatorio
    return (attackRect.x < this.x + this.w) && 
           (attackRect.x + attackRect.w > this.x) && 
           (attackRect.y < this.y + this.h) && 
           (attackRect.y + attackRect.h > this.y);
  }
}
