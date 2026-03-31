/**
 * Analiza gestos discretos a partir de la geometría de Handpose.
 * Utiliza distancias euclidianas y filtros de rebote (debounce).
 * @class GestureAnalyzer
 */
class GestureAnalyzer {
  /**
   * Crea el analizador con un buffer temporal y estado de cooldown.
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
   * Procesa la malla de handpose evaluando heurísticas euclidianas.
   * Filtra latencia utilizando frames continuos para evitar ráfagas falsas.
   * @param {Object} hand - Predicción en crudo devuelta por MediaPipe/TFJS.
   * @returns {string} ID del Gesto dominante ('FIST', 'BLUE', 'RED', 'NONE')
   * @performance Ejecución síncrona a 60hz, sujeta directamente a la integridad de los tensores de ML5.
   */
  analyze(hand) {
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

    let rawDetection = 'NONE';
    
    // Switch de Prioridad: El Puño tiene máxima prioridad para evitar spam al mover la mano
    if (isFist) rawDetection = 'FIST';
    else if (isCrossed) rawDetection = 'DOMAIN';
    else if (isPeace) rawDetection = 'PURPLE_ATTEMPT';
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

    if (gesture === 'PURPLE_ATTEMPT') {
        if (this.comboReady) {
            this.buffer = []; // Vaciar memoria al ejecutar Púrpura
            this.lastInput = 'PURPLE';
            return 'PURPLE';
        }
        return 'NONE'; // Intento fallido
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