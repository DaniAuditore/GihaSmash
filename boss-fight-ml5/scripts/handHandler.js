/**
 * Interfaz con ML5 Handpose.
 * Gestiona la detección, interpolación y filtrado por confianza.
 * @class HandHandler
 */
class HandHandler {
  /**
   * Inicializa el modelo ML5 y fuerza el backend WebGL para estabilidad.
   * @param {Object} videoElement - Instancia p5.MediaElement (createCapture).
   * @performance La instanciación de video ocurre desacoplada de la predicción
   *              para evadir latencia y tirones de GPU.
   */
  constructor(videoElement) {
    this.video = videoElement;
    
    // Inicialización ML5 Handpose Next-Gen
    const options = { 
        maxHands: 2,
        flipped: false
    };

    ml5.setBackend("webgl");

    // Instanciación limpia: SOLAMENTE options y callback
    this.handpose = ml5.handPose(options, () => {
        console.log('HandPose Ready (WebGL Backend)');
        this.isLoaded = true;
        // El video se inyecta estrictamente aquí:
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

  update(gameWidth, gameHeight, currentGesture) {
    this.isTracking = false;
    this.currentHand = null;

    if (this.predictions.length > 0) {
      const hand = this.predictions[0];
      
      if (hand.confidence > 0.8) {
         this.currentHand = hand;
         this.isTracking = true;

         // SOLO actualiza su objetivo ("navegar") si el gesto es FIST o NONE
         if (currentGesture === 'FIST' || currentGesture === 'NONE' || currentGesture === undefined) {
             const indexFinger = hand.keypoints[8];
             this.targetPos.x = map(indexFinger.x, 0, 400, gameWidth, 0);
             this.targetPos.y = map(indexFinger.y, 0, 300, 0, gameHeight);
         }
      }
    }

    // LERP smoothing
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
