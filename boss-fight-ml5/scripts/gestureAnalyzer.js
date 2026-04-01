/**
 * Motor de heurísticas matemáticas para inferir gestos físicos evaluando 
 * distancias euclidianas 2D entre los nodos clave (keypoints) de la mano.
 * 
 * @class GestureAnalyzer
 */
class GestureAnalyzer {
  /**
   * Inicializa el analizador estableciendo los umbrales de confianza y el 
   * buffer temporal de estabilización (evita falsos positivos por parpadeo de ML5).
   */
  constructor() {
    this.buffer = [];
    this.lastInput = 'NONE';
    this.comboReady = false;
    this.currentGesture = 'NONE';
    this.cooldown = 0;

    // Temporal Filtering (HCI Pattern)
    this.candidateGesture = 'NONE';
    this.candidateFrames = 0;
    this.requiredFrames = 6; // Frames manteniendo el gesto para activarlo
  }

  /**
   * Clasifica un array de keypoints de ML5 en un gesto discreto ('FIST', 'PEACE', etc.).
   * Requiere confirmación sostenida de frames consecutivos antes de despachar el estado.
   * 
   * @param {Object} hand - Objeto de predicción de ML5 Handpose (debe contener el array `keypoints`).
   * @param {boolean} [isSecondary=false] - Indica si evalúa la segunda mano detectada (para combos).
   * @returns {string} El identificador constante del gesto detectado (ej. 'BLUE', 'RED', 'NONE').
   */
  analyze(hand, isSecondary = false) {
    if (!hand || !hand.keypoints) {
      this.currentGesture = 'NONE';
      return this.currentGesture;
    }

    let k = hand.keypoints;
    let wrist = k[0];
    let thumbTip = k[4];
    let indexTip = k[8];
    let middleTip = k[12];
    let ringTip = k[16];
    let pinkyTip = k[20];

    // Calcular distancias euclidianas (relativas al marco de 400x300 de video)
    let dIndex = dist(wrist.x, wrist.y, indexTip.x, indexTip.y);
    let dMiddle = dist(wrist.x, wrist.y, middleTip.x, middleTip.y);
    let dRing = dist(wrist.x, wrist.y, ringTip.x, ringTip.y);
    let dPinky = dist(wrist.x, wrist.y, pinkyTip.x, pinkyTip.y);

    let tipDist = dist(thumbTip.x, thumbTip.y, indexTip.x, indexTip.y);
    let indexMiddleDist = dist(indexTip.x, indexTip.y, middleTip.x, middleTip.y);

    // 0. FIST (Puño) - Estado Basal / Navegación (Todos los dedos encogidos hacia la palma)
    let isFist = dIndex < 90 && dMiddle < 90 && dRing < 90 && dPinky < 90;

    // Reglas de heurística (Rituales)
    // 1. AZUL (Pinch): Pulgar e índice tocándose, los demás no importan (o estirados)
    let isPinch = tipDist < 30 && dMiddle > 90; // Exigimos que el medio esté libre para no confundir con puño

    // 2. ROJO (Palma abierta): Todos los dedos extendidos lejos de la muñeca.
    let isOpenPalm = dIndex > 100 && dMiddle > 100 && dRing > 100 && dPinky > 100 && !isPinch;

    // 3. PÚRPURA (Signo de Paz / Intento): Índice y medio levantados, anular y meñique encogidos.
    let isPeace = dIndex > 100 && dMiddle > 100 && dRing < 85 && dPinky < 85 && !isFist;

    // 4. EXPANSIÓN DE DOMINIO: Dedos cruzados (Paz + Medio e Índice muy juntos).
    let isCrossed = isPeace && indexMiddleDist < 25;

    // 5. ATAQUE BÁSICO (Karate Chop / Mano de Canto Abierta)
    // Validamos que los dedos estén extendidos pero muy juntos, simulando un "canto"
    let dIndexMiddle = dist(indexTip.x, indexTip.y, middleTip.x, middleTip.y);
    let dMiddleRing = dist(middleTip.x, middleTip.y, ringTip.x, ringTip.y);
    let topToBottomDist = dist(indexTip.x, indexTip.y, pinkyTip.x, pinkyTip.y);
    let isBasicAttack = isOpenPalm && dIndexMiddle < 40 && dMiddleRing < 40 && topToBottomDist < 100;

    let rawDetection = 'NONE';
    
    // Switch de Prioridad: El Puño tiene máxima prioridad para evitar spam al mover la mano
    if (isFist) rawDetection = 'FIST';
    else if (isCrossed) rawDetection = 'DOMAIN';
    else if (isPeace) rawDetection = 'PURPLE_ATTEMPT';
    else if (isBasicAttack) rawDetection = 'BASIC_ATTACK';
    else if (isPinch) rawDetection = 'BLUE';
    else if (isOpenPalm) rawDetection = 'RED';

    // ----------------------------------------------------
    // TEMPORAL FILTERING (Evitar ráfagas por glitch de ML5)
    // ----------------------------------------------------
    if (rawDetection === this.candidateGesture) {
        this.candidateFrames++;
    } else {
        this.candidateGesture = rawDetection;
        this.candidateFrames = 1;
    }

    // El PUÑO (Fist) responde rápido para no perder fluidez en el tracking del arma/movimiento
    if (this.candidateGesture === 'FIST') {
        this.currentGesture = 'FIST';
        return 'FIST';
    }

    // Los rituales necesitan confirmación temporal (ej: 6 frames)
    if (this.candidateFrames >= this.requiredFrames && this.candidateGesture !== 'NONE') {
        if (millis() > this.cooldown) {
            let evaluated = this.evaluate(this.candidateGesture);
            this.currentGesture = evaluated;
            
            if (evaluated !== 'NONE') {
                this.updateBuffer(evaluated);
                this.cooldown = millis() + 500; // Cooldown post-ataque
            }
        } else {
            this.currentGesture = 'COOLDOWN'; // Silenciamos durante el cooldown
        }
    } else {
        // Mientras carga el buffer o navega con la mano abierta sin decisión firme
        this.currentGesture = 'NONE'; 
    }

    return this.currentGesture;
  }

  updateBuffer(gesture) {
    let now = millis();
    
    // Filtrar inputs más viejos de 3 segundos
    this.buffer = this.buffer.filter(b => now - b.time < 3000);

    // Solo guardar Rojo y Azul
    if (gesture === 'BLUE' || gesture === 'RED') {
        // Debounce para buffer: No lo agregues si es idéntico al último y pasó hace menos de 800ms
        let lastInBuf = this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
        if (!lastInBuf || lastInBuf.type !== gesture || (now - lastInBuf.time) > 800) {
            this.buffer.push({ type: gesture, time: now });
        }
    }

    // Verificar si el combo está listo (Azul + Rojo en el buffer)
    let hasBlue = this.buffer.some(b => b.type === 'BLUE');
    let hasRed = this.buffer.some(b => b.type === 'RED');
    this.comboReady = hasBlue && hasRed;
  }

  evaluate(gesture) {
    if (gesture === 'DOMAIN') {
        this.lastInput = 'DOMAIN';
        return 'DOMAIN';
    }

    if (gesture === 'BASIC_ATTACK') {
        this.lastInput = 'BASIC_ATTACK';
        return 'BASIC_ATTACK';
    }

    if (gesture === 'PURPLE_ATTEMPT') {
        if (this.comboReady) {
            this.buffer = []; // Vaciar memoria al ejecutar Púrpura
            this.lastInput = 'PURPLE';
            return 'PURPLE';
        }
        return 'PURPLE_ATTEMPT'; // Intento fallido o reinicio
    }
    
    if (gesture === 'RED' || gesture === 'BLUE') {
        this.lastInput = gesture;
        return gesture;
    }
    
    return 'NONE';
  }

  drawDebug(x, y) {
      push();
      fill(10, 15, 30, 220); // Fondo de consola
      stroke(0, 255, 255);
      strokeWeight(2);
      rect(x, y, 320, 100, 5);
      
      fill(255);
      noStroke();
      textSize(16);
      textFont('monospace');
      textAlign(LEFT, TOP);
      
      text(`[RITUAL CONSOLE]`, x + 10, y + 10);
      
      fill(0, 255, 255);
      text(`LAST INPUT:  ${this.lastInput}`, x + 10, y + 35);
      
      let buffStr = this.buffer.map(b => b.type).join(' + ');
      if (buffStr === '') buffStr = 'EMPTY';
      fill(255, 200, 0);
      text(`BUFFER:      [${buffStr}]`, x + 10, y + 55);
      
      let cColor = this.comboReady ? color(180, 0, 255) : color(100);
      fill(cColor);
      text(`COMBO READY: ${this.comboReady}`, x + 10, y + 75);
      pop();
  }
}