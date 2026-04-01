/**
 * MahoragaBot hereda el movimiento base del Bot original pero intercepta 
 * el daño y físicas con lógica de reducción adaptativa.
 */
class MahoragaBot extends Bot {
  constructor(x, y, adaptationManager, waveMultiplier = 1) {
    super(x, y, waveMultiplier);
    this.adaptationManager = adaptationManager;
    
    // Propiedades sobredimensionadas
    this.w = 80;
    this.h = 80;
    this.maxHp = 1000 * waveMultiplier;
    this.hp = this.maxHp;
    this.speedX = 3.5 + (waveMultiplier * 0.2); // Un poco más veloz
    
    // IA Avanzada
    this.hasDoubleJumped = false;
    this.isDashing = false;
    this.dashTimer = 0;
  }

  update(fxManager, platform, timeMod = 1.0, targetBox = null) {
    // 1. Ejecutar físicas y lógica base
    super.update(fxManager, platform, timeMod, targetBox);
    
    // 2. IA de Mahoraga (Boss Behavior)
    if (this.state !== 'HIT' && fxManager && !fxManager.isHitstopActive()) {
        
        let targetX = targetBox ? targetBox.x + targetBox.w / 2 : platform.x + platform.w / 2;

        // --- DOBLE SALTO DE RECUPERACIÓN ---
        // Si está cayendo (vy > 0), no está en el suelo, y ya pasó la altura de la plataforma
        if (!this.onGround && this.vy > 0 && this.y > platform.y - 50 && !this.hasDoubleJumped) {
            this.vy = -22; // Salto explosivo
            this.hasDoubleJumped = true;
            
            // Dirigirse agresivamente hacia LA MANO del jugador o el centro
            this.vx = (targetX > this.x ? 1 : -1) * 15;
            
            // Juice de salto
            this.squash = 1.5;
            this.stretch = 0.5;
            fxManager.triggerScreenshake(15, 10);
        }
        
        // Resetear doble salto al tocar suelo
        if (this.onGround) {
            this.hasDoubleJumped = false;
        }

        // --- DASH ATTACK (Cleave) ---
        if (this.onGround && !this.isDashing && frameCount % 60 === 0 && random() > 0.4) {
            this.isDashing = true;
            this.dashTimer = frameCount;
            this.vx = 0; // Congelarse para avisar
            this.squash = 0.8;
            this.stretch = 1.2;
        }

        if (this.isDashing) {
            let framesElapsed = frameCount - this.dashTimer;
            if (framesElapsed === 20) {
                // Ejecutar Dash hacia la mano actual
                this.vx = (targetX > this.x ? 1 : -1) * 45; // Dash mucho más rápido y brutal
                this.vy = -3; // Ligeramente despegado del suelo para evitar fricción masiva
                fxManager.triggerScreenshake(20, 10);
            } else if (framesElapsed > 40) {
                // Fin del Dash
                this.isDashing = false;
            }
        } else if (this.onGround && targetBox && frameCount % 30 === 0) {
            // CONSTANT PURSUIT: Si no está haciendo dash, camina agresivamente hacia la mano
            let speed = 8 + (this.waveMultiplier * 0.5 || 0);
            this.vx = (targetX > this.x ? 1 : -1) * speed;
            if (random() > 0.7) {
                this.jump();
            }
        }
    }
  }

  // Override del dibujado para estética "Blanco Intenso"
  draw(platform) {
    push();
    if (this.state === "HIT") {
      fill(255, 0, 0); // Blink rojo al daño
    } else {
      fill(255); // Blanco puro, aura amenazante
      stroke(200, 200, 255);
      strokeWeight(4);
    }
    
    rect(this.x, this.y, this.w, this.h, 10);
    
    // Draw de HP adaptativo (Mahoraga Wheel Base UI)
    let hpPercent = this.hp / this.maxHp;
    fill(255, 50, 50);
    rect(this.x, this.y - 15, this.w, 8);
    fill(50, 255, 50);
    rect(this.x, this.y - 15, this.w * hpPercent, 8);
    pop();
  }

  // Intercepción del Hit para escalado de físicas
  takeDamage(amount, sourceX, fx, type) {
    // 1. Obtener la inmunidad actual (1.0 = Daño total, 0.1 = Casi inmune)
    let effectiveness = this.adaptationManager.getModifier(type);
    
    // El daño puro y el empuje se ven afectados
    let finalDamage = type === "BASIC" ? amount : (amount * effectiveness);
    super.takeDamage(finalDamage, sourceX, fx, type);

    // Si es técnica maldita, el empuje (físicas) disminuye severamente
    if (type === "RED") {
        this.velocityX *= effectiveness; 
    } else if (type === "BLUE") {
        // En azul, contrarrestamos en tiempo real con una fuerza opuesta temporal
        this.velocityX += (sourceX > this.x ? -2 : 2) * (1 - effectiveness);
    }

    // Registrar para la rueda de adaptación
    if (type !== "BASIC") {
        this.adaptationManager.recordImpact(type);
    }
  }
}
