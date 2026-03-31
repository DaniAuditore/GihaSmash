class UIManager {
  constructor() {
    this.icons = {
      'BLUE': { x: width - 150, y: height - 100, color: color(0, 150, 255), readyPulse: 0, shakeFrames: 0 },
      'RED': { x: width - 70, y: height - 100, color: color(255, 50, 50), readyPulse: 0, shakeFrames: 0 }
    };
  }

  // Se llama si intentas atacar pero el ataque está en cooldown
  triggerDenial(type) {
    if (this.icons[type]) {
      this.icons[type].shakeFrames = 15; // 15 frames de vibración
    }
  }

  // Destello visual cuando una habilidad vuelve a estar lista
  triggerReady(type) {
    if (this.icons[type]) {
      this.icons[type].readyPulse = 255;
    }
  }

  draw(attackManager) {
    push();
    
    for (let type of ['BLUE', 'RED']) {
      let icon = this.icons[type];
      let skill = attackManager.skills[type];
      
      let cdTotal = skill.cooldownDuration;
      let cdRemaining = Math.max(0, cdTotal - (millis() - skill.lastTime));
      
      // Chequear transición de Enfriamiento -> Listo para disparar el evento visual
      if (cdRemaining === 0 && icon.wasOnCooldown) {
          this.triggerReady(type);
      }
      icon.wasOnCooldown = cdRemaining > 0;

      // Calcular posiciones con posible Shake 
      let dx = icon.x;
      let dy = icon.y;
      if (icon.shakeFrames > 0) {
          dx += random(-4, 4);
          dy += random(-4, 4);
          icon.shakeFrames--;
      }

      // Fondo oscuro
      fill(30, 30, 45, 200);
      stroke(100);
      strokeWeight(2);
      if (cdRemaining === 0) stroke(icon.color); // Ilumina el borde si está listo
      circle(dx, dy, 60);

      // Progreso Radial (Cooldown Máscara)
      if (cdRemaining > 0) {
        let angle = map(cdRemaining, cdTotal, 0, 0, TWO_PI);
        fill(50, 0, 0, 150); // Oscurecido
        noStroke();
        arc(dx, dy, 60, 60, -HALF_PI, -HALF_PI + angle, PIE);
        
        // Texto de segundos restantes
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16);
        text((cdRemaining / 1000).toFixed(1), dx, dy);
      } else {
        // Icono sólido cuando está listo
        fill(icon.color);
        noStroke();
        circle(dx, dy, 45);
      }

      // Glow (Destello reactivo al terminar el cooldown)
      if (icon.readyPulse > 0) {
        noFill();
        stroke(red(icon.color), green(icon.color), blue(icon.color), icon.readyPulse);
        strokeWeight(4);
        let pulseSize = map(icon.readyPulse, 255, 0, 60, 100);
        circle(dx, dy, pulseSize);
        icon.readyPulse -= 10;
      }
      
      // Letra central
      fill(255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(18);
      textStyle(BOLD);
      text(type === 'BLUE' ? 'Ao' : 'Aka', dx, dy - 45);
    }
    pop();
  }
}
