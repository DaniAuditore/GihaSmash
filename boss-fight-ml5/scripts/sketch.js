let video;
let handHandler;
let bot;
let fx;
let platform;

class Platform {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
  
  draw() {
    push();
    // Diseño "pesado": Bloque con grosor tridimensional
    fill(40, 45, 60); // Cara frontal
    rect(this.x, this.y, this.w, this.h + 40, 8);
    fill(70, 75, 95); // Superficie
    rect(this.x, this.y, this.w, this.h, 8);
    pop();
  }
}

function setup() {
  createCanvas(1280, 720);
  
  // Floating Island
  platform = new Platform(width/2 - 300, height - 150, 600, 30);
  
  // Foco en FPS: Resolución de video pequeña (400x300) para no saturar ML5
  video = createCapture(VIDEO, () => {
    console.log("Cámara inicializada.");
  });
  video.size(400, 300);
  video.hide();

  handHandler = new HandHandler(video);
  bot = new Bot(platform.x + platform.w / 2 - 25, platform.y - 50);
  fx = new FXManager();
}

function draw() {
  background(20, 20, 25);

  // 1. Inputs y Actualizaciones
  handHandler.update(width, height);
  bot.update(fx, platform);

  // 2. Lógica de Juego y Colisiones AABB
  // Para esta prueba inicial: Si detecta la mano con confianza, ataca cíclicamente
  if (handHandler.isTracking) {
      let attackBox = handHandler.getAttackBounds();
      if (bot.checkCollision(attackBox)) {
          if (!fx.isHitstopActive()) {
              bot.takeDamage(15, attackBox.x + attackBox.w/2, fx);
          }
      }
  }

  // 3. Render
  push();
  fx.applyScreenshake(); // Juice: Shake global del lienzo
  
  // Dibujar zona de juego
  platform.draw();
  bot.draw(platform);
  fx.updateAndDrawParticles();
  
  // Dibujar el input del boss siempre por encima de las entidades
  handHandler.drawCursor(); 
  
  pop(); // Fin área afectada por screenshake

  // UI (No afectada por el shake)
  push();
  fill(255);
  textSize(20);
  text(`FPS: ${floor(frameRate())}`, 10, 30);
  
  if (!handHandler.isLoaded) {
      fill(255, 200, 0);
      text("Cargando modelo ML5 Handpose...", 10, 60);
  } else if (!handHandler.isTracking) {
      fill(255, 100, 100);
      text("Cámara: Buscando mano (Confianza > 0.8 requerida)", 10, 60);
  } else {
      fill(0, 255, 100);
      text("Objetivo detectado.", 10, 60);
  }

  if (bot.hp <= 0) {
      textSize(60);
      fill(0, 255, 0);
      textAlign(CENTER);
      text("BOT DESTRUIDO", width/2, height/2);
  }
  pop();
}
