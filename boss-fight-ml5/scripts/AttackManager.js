/**
 * Controla el flujo de ataques y tiempos de espera (Cooldown).
 * Implementa la lógica de 'Input Buffering' para la ventana de tolerancia.
 * @class AttackManager
 */
class AttackManager {
  /**
   * Instancia contadores base e inicializa duraciones (en milisegundos).
   */
  constructor() {
    this.skills = {
      'BASIC': { lastTime: 0, cooldownDuration: 500, bufferTimer: 0 },
      'BLUE': { lastTime: 0, cooldownDuration: 2000, bufferTimer: 0 },
      'RED': { lastTime: 0, cooldownDuration: 5000, bufferTimer: 0 },
      'PURPLE': { lastTime: 0, cooldownDuration: 10000, bufferTimer: 0 } // Extra p/ futuro
    };
    this.bufferWindow = 200; // 200ms de ventana para "Input Buffer"
  }

  /**
   * Intenta disparar gestionando el Input-Buffer si el usuario anticipó la recuperación.
   * @param {string} type - Tipo de magia de combate ('RED', 'BLUE', 'PURPLE').
   * @param {number} x - Abscisa donde detonará el efecto físico.
   * @param {number} y -  Coordenada paralela a x.
   * @param {Object} bot - Receptor de la fuerza física y daño en memoria.
   * @param {Object} fx - Gestor de renderizado Juice.
   * @param {Object} uiManager - Responsable del parpadeo visual en pantalla tras cooldown fallido.
   * @param {Object} audioManager - Responsable del sonido.
   * @returns {boolean} Emisión limpia sin fallo técnico o temporal.
   */
  tryAttack(type, x, y, bot, fx, uiManager, audioManager) {
    if (!this.skills[type]) return false;
    
    let skill = this.skills[type];
    let now = millis();
    let timeSinceLast = now - skill.lastTime;

    // 1. Está listo para disparar AHORA
    if (timeSinceLast >= skill.cooldownDuration) {
        this.executeAttack(type, x, y, bot, fx, audioManager);
        return true;
    } 
    // 2. INPUT BUFFER: Está a punto de recargarse (ej: > 95% completado)
    else if (skill.cooldownDuration - timeSinceLast <= this.bufferWindow) {
        // Guardamos la intención para detonarla en update()
        skill.bufferTimer = now + (skill.cooldownDuration - timeSinceLast);
        skill.bufferedData = { x, y, bot, fx, audioManager };
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
  update(uiManager, audioManager) {
    let now = millis();
    for (let type in this.skills) {
      let skill = this.skills[type];
      // Si hay un buffer pendiente y ya hemos superado el tiempo de bloqueo
      if (skill.bufferTimer > 0 && now >= skill.bufferTimer) {
         // Disparamos con la data almacenada y limpiamos el buffer
         this.executeAttack(type, skill.bufferedData.x, skill.bufferedData.y, skill.bufferedData.bot, skill.bufferedData.fx, skill.bufferedData.audioManager);
         skill.bufferTimer = 0;
         skill.bufferedData = null;
      }
    }
  }

  executeAttack(type, x, y, bot, fx, audioManager) {
    let now = millis();
    this.skills[type].lastTime = now; // Reiniciar cooldown

    // Lógica de daño según la técnica
    if (type === 'BASIC') {
        bot.takeDamage(5, x, fx, 'BASIC');
        if (audioManager) audioManager.playHit();
    } else if (type === 'BLUE') {
        bot.takeDamage(10, x, fx, 'BLUE');
        if (audioManager) audioManager.playSwoosh();
    } else if (type === 'RED') {
        bot.takeDamage(20, x, fx, 'RED');
        if (audioManager) audioManager.playSwoosh();
    } else if (type === 'PURPLE') {
        fx.triggerScreenshake(30, 40);
        bot.takeDamage(50, x, fx, 'PURPLE');
        if (audioManager) audioManager.playSwoosh();
    }

    // Retorno global para mostrar texto
    return type;
  }
}
