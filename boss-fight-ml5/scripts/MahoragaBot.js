/**
 * MahoragaBot hereda el movimiento base del Bot original pero intercepta 
 * el daño y físicas con lógica de reducción adaptativa.
 */
class MahoragaBot extends Bot {
  constructor(x, y, adaptationManager) {
    super(x, y);
    this.adaptationManager = adaptationManager;
    
    // Propiedades sobredimensionadas
    this.w = 80;
    this.h = 80;
    this.maxHp = 1000;
    this.hp = this.maxHp;
    this.speedX = 3.5; // Un poco más veloz por defecto
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
