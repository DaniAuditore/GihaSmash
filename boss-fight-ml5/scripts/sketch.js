let video;
let handHandler;
let gestureAnalyzer;
let bot;
let fx;
let platform;

// Sistema de Domain Expansion (Vacío Infinito)
let domainActive = false;
let domainEndTime = 0;
let stars = [];
let lastTechniqueText = "";
let techniqueTextTimer = 0;

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
  gestureAnalyzer = new GestureAnalyzer();
  bot = new Bot(platform.x + platform.w / 2 - 25, platform.y - 50);
  fx = new FXManager();

  // Precargar estrellas para la Expansión de Dominio
  for (let i = 0; i < 150; i++) {
      stars.push({ x: random(-width, width), y: random(-height, height), z: random(width) });
  }
}

function drawDomain() {
  push();
  fill(5, 5, 10, 80); // Rastro (Trails)
  rect(0, 0, width, height);

  translate(width / 2, height / 2);
  for (let s of stars) {
    s.z -= 15; // Velocidad del hiperespacio
    if (s.z < 1) {
      s.z = width;
      s.x = random(-width, width);
      s.y = random(-height, height);
    }
    let sx = map(s.x / s.z, 0, 1, 0, width);
    let sy = map(s.y / s.z, 0, 1, 0, height);
    let r = map(s.z, 0, width, 8, 0); // Más grande si está más cerca
    fill(255);
    noStroke();
    circle(sx, sy, r);
  }
  pop();
}

function draw() {
  if (domainActive && millis() > domainEndTime) {
      domainActive = false;
  }

  if (domainActive) {
      drawDomain(); // Shader ligero de estrellas para no perder FPS
  } else {
      background(20, 20, 25);
  }

  // 1. Inputs y Actualizaciones
  handHandler.update(width, height);
  
  // Analizar rituales
  let gesture = gestureAnalyzer.analyze(handHandler.currentHand);
  
  if (gesture !== 'NONE') {
      lastTechniqueText = gesture;
      techniqueTextTimer = millis() + 1000;
      
      // Aplicar técnicas si detectamos colisión principal
      let attackBox = handHandler.getAttackBounds();
      let isColliding = bot.checkCollision(attackBox);
      
      if (gesture === 'DOMAIN') {
          domainActive = true;
          domainEndTime = millis() + 5000; // 5 segundos de expansión
          fx.triggerScreenshake(10, 30);
      } 
      else if (gesture === 'BLUE') {
          if (isColliding && !fx.isHitstopActive()) {
               bot.takeDamage(10, attackBox.x + attackBox.w/2, fx, 'BLUE');
          }
      } 
      else if (gesture === 'RED') {
          if (isColliding && !fx.isHitstopActive()) {
               bot.takeDamage(20, attackBox.x + attackBox.w/2, fx, 'RED');
          }
      } 
      else if (gesture === 'PURPLE') {
          fx.triggerScreenshake(30, 40); // Gran impacto
          if (isColliding && !fx.isHitstopActive()) {
               bot.takeDamage(50, attackBox.x + attackBox.w/2, fx, 'PURPLE');
          }
      }
  }

  // Ralentización del bot por Expansión de Dominio
  let currentDomainMod = domainActive ? 0.1 : 1.0;
  bot.update(fx, platform, currentDomainMod);

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

  // UI - Feedback texto
  if (millis() < techniqueTextTimer) {
      push();
      textSize(80);
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      fill(255, 255, 255, map(techniqueTextTimer - millis(), 0, 1000, 0, 255));
      text(lastTechniqueText, width/2, height/2 - 100);
      pop();
  }

  // UI (No afectada por el shake)
  push();
  fill(255);
  textSize(20);
  text(`FPS: ${floor(frameRate())}`, width - 150, 30);
  
  if (!handHandler.isLoaded) {
      fill(255, 200, 0);
      text("Cargando modelo ML5 Handpose...", width - 350, 60);
  } else if (!handHandler.isTracking) {
      fill(255, 100, 100);
      text("Cámara: Buscando mano", width - 250, 60);
  } else {
      fill(0, 255, 100);
      text("Objetivo detectado.", width - 200, 60);
  }

  if (bot.hp <= 0) {
      textSize(60);
      fill(0, 255, 0);
      textAlign(CENTER);
      text("BOT DESTRUIDO", width/2, height/2);
  }
  pop();
  
  // HUD Diagnóstico (Consola del Arquitecto)
  gestureAnalyzer.drawDebug(10, 10);
}
