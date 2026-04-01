/**
 * Controlador lógico de las técnicas del jugador. Gestiona cooldowns de habilidades, 
 * combos dinámicos y la ventana de input buffering (200ms) para una respuesta fluida.
 * 
 * @class AttackManager
 */
class AttackManager {
  /**
   * Inicializa los diccionarios de cooldowns (ms) y los contadores de combo.
   */
  constructor() {
    this.skills = {
      'BASIC': { lastTime: 0, cooldownDuration: 200, bufferTimer: 0, comboCount: 0 },
      'BLUE': { lastTime: 0, cooldownDuration: 2000, bufferTimer: 0 },
      'RED': { lastTime: 0, cooldownDuration: 5000, bufferTimer: 0 },
      'PURPLE': { lastTime: 0, cooldownDuration: 10000, bufferTimer: 0 } // Extra p/ futuro
    };
    this.bufferWindow = 200; // 200ms de ventana para "Input Buffer"
  }

  /**
   * Intenta disparar un ataque verificando su disponibilidad de recarga. Si está 
   * a punto de recargarse, lo almacena temporalmente (Input Buffering).
   * 
   * @param {string} type - Tipo de ataque ('BASIC', 'RED', 'BLUE', 'PURPLE').
   * @param {number} x - Abscisa donde detonará el efecto físico.
   * @param {number} y - Coordenada paralela a X.
   * @param {Bot|MahoragaBot} bot - Instancia enemiga que recibirá el daño en memoria.
   * @param {FXManager} fx - Gestor de renderizado Juice (partículas/hitstop).
   * @param {UIManager} uiManager - Responsable de renderizar penalizaciones en UI (Denial).
   * @param {AudioManager} audioManager - Responsable de despachar el SFX correspondiente.
   * @returns {boolean} `true` si el ataque se ejecutó o se encoló en el buffer. `false` si hay cooldown activo.
   */
  tryAttack(type, x, y, bot, fx, uiManager, audioManager) {
    if (!this.skills[type]) return false;
    
    let skill = this.skills[type];
    let now = millis();
    let timeSinceLast = now - skill.lastTime;

    // Reset combo si pasó mucho tiempo sin atacar
    if (type === 'BASIC' && timeSinceLast > 1500) {
        skill.comboCount = 0;
        skill.cooldownDuration = 200; // Golpe rápido
    }

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

  /**
   * Bucle constante que revisa si existe una técnica en el Input Buffer lista para
   * despacharse automáticamente una vez vencido el bloqueo del cooldown.
   * 
   * @param {UIManager} uiManager - Referencia al gestor de UI.
   * @param {AudioManager} audioManager - Referencia al gestor de Audio.
   * @returns {void}
   */
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
        this.skills[type].comboCount++;
        // Si llegó al tercer golpe del combo
        if (this.skills[type].comboCount >= 3) {
             this.skills[type].cooldownDuration = 5000; // 5 segundos de Penalización/Cooldown por combo completado
             this.skills[type].comboCount = 0; // Reset para la próxima
        } else {
             this.skills[type].cooldownDuration = 200; // Golpes rápidos dentro del combo
        }
        
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
