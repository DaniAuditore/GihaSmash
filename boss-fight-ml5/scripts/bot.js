/**
 * Representa la entidad enemiga controlada por IA.
 * Maneja físicas básicas, colisiones AABB y estado de daño.
 * @class Bot
 */
class Bot {
  /**
   * Instancia al Bot enemigo.
   * @param {number} x - Posición inicial en X.
   * @param {number} y - Posición inicial en Y.
   * @param {number} waveMultiplier - Multiplicador de dificultad.
   */
  constructor(x, y, waveMultiplier = 1) {
    this.x = x;
    this.y = y;
    this.w = 50;
    this.h = 50;
    this.maxHp = 100 * waveMultiplier;
    this.hp = this.maxHp;

    // Cinemática escalada por dificultad
    this.vx = 0;
    this.vy = 0;
    this.gravity = 0.8 + waveMultiplier * 0.05; // Cae ligeramente más rápido en olas altas
    this.jumpForce = -15 - waveMultiplier * 0.5; // Salta más alto
    this.friction = 0.9;
    this.onGround = false;

    // Máquina de Estados
    this.state = 'IDLE'; // IDLE, JUMPING, HIT
    this.hitFrame = 0; // Temporizador nativo del motor de juego

    // IA Agresiva
    this.isLunging = false;
    this.lungeWaitFrame = 0;

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
    // Se ignora si está ejecutando un ataque en picada
    let isOverPlatform = this.x + this.w > platform.x && this.x < platform.x + platform.w;

    if (
      this.vy >= 0 &&
      isOverPlatform &&
      this.y + this.h >= platform.y &&
      this.y + this.h - this.vy <= platform.y + 20
    ) {
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

    // Reseteo Failsafe: Si cae al vacío (muerte instantánea)
    if (this.y > height + 100) {
      this.hp = 0; // Muere al caer al vacío
    }
  }

  respawn(platform) {
    this.x = platform.x + platform.w / 2 - this.w / 2;
    this.y = platform.y - 150;
    this.vy = 0;
    this.vx = 0;
    this.hp -= 20; // Penalización por caer
    this.state = 'JUMPING';
    this.isLunging = false;
  }

  /**
   * Resuelve el salto sumando gravedad explícita al delta inercial negativo.
   */
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

  update(fxManager, platform, timeMod = 1.0, targetBox = null) {
    // Expansión de Dominio: Ralentizar el update drásticamente (Efecto stop-motion)
    if (timeMod < 1.0 && frameCount % Math.floor(1 / timeMod) !== 0) return;

    // Si hay un hitstop activo, congelamos todo el bot
    if (fxManager.isHitstopActive() || this.hp <= 0) return;

    this.applyPhysics(platform);

    // Recuperación del Squash/Stretch (Lerp hacia 1.0)
    this.squash = lerp(this.squash, 1.0, 0.15);
    this.stretch = lerp(this.stretch, 1.0, 0.15);

    // Sistema robusto de recuperación de estado basado en frameCount
    if (this.state === 'HIT' && frameCount - this.hitFrame > 15) {
      this.state = 'IDLE';
    }

    if (!this.onGround) {
      // En el aire
    } else {
      this.isLunging = false; // Reset lunge al tocar suelo
    }

    // IA reactiva: Movimiento horizontal y saltos si NO está en HIT
    if (this.onGround && this.state !== 'HIT' && !this.isLunging) {
      // Lógica de ataque "Lunge" / Anti-Air contra la Mano
      if (targetBox) {
        let botCenterX = this.x + this.w / 2;
        let targetCenterX = targetBox.x + targetBox.w / 2;
        let targetCenterY = targetBox.y + targetBox.h / 2;

        let distX = Math.abs(botCenterX - targetCenterX);
        let distY = this.y - targetCenterY; // Positivo si la mano está ARRIBA del bot

        // Si la mano está cerca horizontalmente y por encima del bot
        if (distX < 150 && distY > 0 && distY < 300) {
          if (this.lungeWaitFrame === 0) {
            this.lungeWaitFrame = frameCount; // Iniciar "telegraph"
            if (typeof audioManager !== 'undefined') audioManager.playWarning();
            this.vx = 0; // Detenerse
            this.squash = 0.7; // Agacharse para saltar
            this.stretch = 1.3;
          } else if (frameCount - this.lungeWaitFrame > 20) {
            // 0.3 seg de aviso
            this.isLunging = true;
            this.vy = -18; // Gran salto hacia la mano
            this.vx = (targetCenterX > botCenterX ? 1 : -1) * 8; // Perseguir la mano
            this.onGround = false;
            this.lungeWaitFrame = 0;
          }
          return; // Bloquear patrullaje mientras planea el ataque
        } else {
          this.lungeWaitFrame = 0; // Cancelar ataque si la mano huye
        }
      }

      // Movimiento normal errático
      if (frameCount % 60 === 0 && random() > 0.4) {
        let toCenter = platform.x + platform.w / 2 - this.x;
        this.vx = (toCenter > 0 ? 1 : -1) * random(5, 12);
        if (random() > 0.5) {
          this.jump();
        }
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

    // Si imgBot existe en variables globales (sketch.js preloads)
    if (typeof imgBot !== 'undefined' && imgBot) {
      if (this.state === 'HIT') {
        tint(255, 100, 100); // Tinte rojizo al recibir daño
      } else if (this.isLunging || this.lungeWaitFrame > 0) {
        tint(255, 150, 150); // Tinte anaranjado/rojo en ataque
      } else {
        noTint();
      }
      imageMode(CENTER);
      // Dibujamos con origen modificado y un poco más grande (overdraw)
      image(imgBot, 0, -this.h / 2, this.w * 1.5, this.h * 1.5);
      noTint();
    } else {
      // Fallback al cuadrado si la imagen falla
      let botColor;
      if (this.state === 'HIT') {
        botColor = color(255, 0, 0);
      } else if (this.isLunging || this.lungeWaitFrame > 0) {
        botColor = color(255, 100, 0); // Color de aviso/peligro
      } else if (this.state === 'JUMPING') {
        botColor = color(0, 150, 255);
      } else {
        botColor = color(0, 200, 100);
      }

      fill(botColor);
      stroke(255);
      strokeWeight(2);
      rect(-this.w / 2, -this.h, this.w, this.h, 5);
    }

    pop();

    // HP Bar (sin deformación)
    push();
    fill(255, 0, 0);
    noStroke();
    rect(this.x, this.y - 15, this.w, 5);
    fill(0, 255, 0);
    rect(this.x, this.y - 15, map(this.hp, 0, this.maxHp, 0, this.w), 5);
    pop();
  }

  /**
   * Dispara el desacoplamiento lógico tras herir al bot e insta el juice de cámara.
   * @param {number} amount - Magnitud del HP a deducir.
   * @param {number} attackX - Origen bidimensional explícito del ataque AABB para el vector de rebote.
   * @param {Object} fxManager - Instancia compartida externa para llamar las rutinas de Juice.
   * @param {string} attackType - Modificador direccional ('BLUE' chupa, 'RED' expulsa).
   */
  takeDamage(amount, attackX, fxManager, attackType = 'NORMAL') {
    // PROTECCIÓN (Guard Clause): Evitar solapamiento de daño o aplicar impacto sobre un bot muerto
    if (this.hp <= 0 || this.state === 'HIT') return;

    this.hp -= amount;

    // Sumar puntos por infligir daño (solo si gameScore está inicializado)
    if (typeof gameScore !== 'undefined') gameScore += Math.floor(amount * 10);

    this.state = 'HIT';
    this.hitFrame = frameCount; // Registrar foto del tiempo actual

    // JUICE: Knockback basado en la técnica
    let attackCenterRelativeX = attackX - (this.x + this.w / 2);
    let knockbackDir = attackCenterRelativeX < 0 ? 1 : -1; // Empuje normal (lejos del ataque)

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
    if (typeof audioManager !== 'undefined') audioManager.playHit();
    fxManager.triggerHitstop(60);
    fxManager.triggerScreenshake(attackType === 'PURPLE' ? 35 : 20, 15);
    fxManager.spawnParticles(
      this.x + this.w / 2,
      this.y + this.h / 2,
      attackType === 'PURPLE' ? 60 : 30,
      attackType
    );
  }

  checkCollision(attackRect) {
    // AABB pura - Mandatorio
    return (
      attackRect.x < this.x + this.w &&
      attackRect.x + attackRect.w > this.x &&
      attackRect.y < this.y + this.h &&
      attackRect.y + attackRect.h > this.y
    );
  }
}
