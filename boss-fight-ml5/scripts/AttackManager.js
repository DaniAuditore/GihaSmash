class AttackManager {
  constructor() {
    this.skills = {
      'BLUE': { lastTime: 0, cooldownDuration: 2000, bufferTimer: 0 },
      'RED': { lastTime: 0, cooldownDuration: 5000, bufferTimer: 0 },
      'PURPLE': { lastTime: 0, cooldownDuration: 10000, bufferTimer: 0 } // Extra p/ futuro
    };
    this.bufferWindow = 200; // 200ms de ventana para "Input Buffer"
  }

  // Intento de disparo cuando el usuario hace el gesto
  tryAttack(type, x, y, bot, fx, uiManager) {
    if (!this.skills[type]) return false;
    
    let skill = this.skills[type];
    let now = millis();
    let timeSinceLast = now - skill.lastTime;

    // 1. Está listo para disparar AHORA
    if (timeSinceLast >= skill.cooldownDuration) {
        this.executeAttack(type, x, y, bot, fx);
        return true;
    } 
    // 2. INPUT BUFFER: Está a punto de recargarse (ej: > 95% completado)
    else if (skill.cooldownDuration - timeSinceLast <= this.bufferWindow) {
        // Guardamos la intención para detonarla en update()
        skill.bufferTimer = now + (skill.cooldownDuration - timeSinceLast);
        skill.bufferedData = { x, y, bot, fx };
        return true; // Se acepta implícitamente
    } 
    // 3. DENEGADO: Cooldown activo
    else {
        // Feedback visual de error
        if (uiManager) uiManager.triggerDenial(type);
        return false;
    }
  }

  // Verifica el buffer cada frame en el main loop
  update(uiManager) {
    let now = millis();
    for (let type in this.skills) {
      let skill = this.skills[type];
      // Si hay un buffer pendiente y ya hemos superado el tiempo de bloqueo
      if (skill.bufferTimer > 0 && now >= skill.bufferTimer) {
         // Disparamos con la data almacenada y limpiamos el buffer
         this.executeAttack(type, skill.bufferedData.x, skill.bufferedData.y, skill.bufferedData.bot, skill.bufferedData.fx);
         skill.bufferTimer = 0;
         skill.bufferedData = null;
      }
    }
  }

  executeAttack(type, x, y, bot, fx) {
    let now = millis();
    this.skills[type].lastTime = now; // Reiniciar cooldown

    // Lógica de daño según la técnica
    if (type === 'BLUE') {
        bot.takeDamage(10, x, fx, 'BLUE');
    } else if (type === 'RED') {
        bot.takeDamage(20, x, fx, 'RED');
    } else if (type === 'PURPLE') {
        fx.triggerScreenshake(30, 40);
        bot.takeDamage(50, x, fx, 'PURPLE');
    }

    // Retorno global para mostrar texto
    return type;
  }
}
