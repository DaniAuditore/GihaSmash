class HandHandler {
  constructor(videoElement) {
    this.video = videoElement;
    
    // Inicialización ML5 Handpose Next-Gen (v1.3.1)
    this.handpose = ml5.handPose(this.video, { maxContinuousChecks: 1, detectionConfidence: 0.8 }, () => {
        console.log('HandPose Ready');
        this.isLoaded = true;
        // Iniciar detección continua en ML5 v1.x
        this.handpose.detectStart(this.video, (results) => {
           this.predictions = results;
        });
    });
    
    this.predictions = [];
    this.currentPos = { x: 0, y: 0 };
    this.targetPos = { x: 0, y: 0 };
    this.isTracking = false;
    this.isLoaded = false;
    this.currentHand = null;
  }

  update(gameWidth, gameHeight) {
    this.isTracking = false;
    this.currentHand = null;

    if (this.predictions.length > 0) {
      const hand = this.predictions[0];
      
      // Strict rule: validamos confianza de la inferencia si está disponible.
      if (hand.confidence > 0.8) {
         this.currentHand = hand;
         // Data structure change in v1.x: usamos keypoints directos. 
         // El índice 8 corresponde a index_finger_tip
         const indexFinger = hand.keypoints[8];

         // Mapear de las coordenadas de la cámara (400x300) al canvas completo invirtiendo X (espejo)
         this.targetPos.x = map(indexFinger.x, 0, 400, gameWidth, 0);
         this.targetPos.y = map(indexFinger.y, 0, 300, 0, gameHeight);
         this.isTracking = true;
      }
    }

    // LERP smoothing estricto (0.15)
    this.currentPos.x = lerp(this.currentPos.x, this.targetPos.x, 0.15);
    this.currentPos.y = lerp(this.currentPos.y, this.targetPos.y, 0.15);
  }

  drawCursor() {
    if (!this.isTracking) return;
    push();
    fill(255, 0, 255, 150);
    noStroke();
    circle(this.currentPos.x, this.currentPos.y, 40);
    
    // Crosshair para visualización agresiva de objetivo
    stroke(255);
    strokeWeight(3);
    line(this.currentPos.x - 25, this.currentPos.y, this.currentPos.x + 25, this.currentPos.y);
    line(this.currentPos.x, this.currentPos.y - 25, this.currentPos.x, this.currentPos.y + 25);
    
    fill(255);
    textSize(12);
    noStroke();
    text("LOCKED", this.currentPos.x + 15, this.currentPos.y - 15);
    pop();
  }
  
  getAttackBounds() {
      // Retorna el hitbox del ataque AABB (alineado al centro del cursor)
      let size = 50;
      return {
          x: this.currentPos.x - size/2,
          y: this.currentPos.y - size/2,
          w: size,
          h: size
      }
  }
}
