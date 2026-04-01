let video;
let handHandler;
let gestureAnalyzer;
let bot;
let fx;
let platform;
let uiManager;
let attackManager;

// Sistema de Domain Expansion (Vacío Infinito)
let domainActive = false;
let domainEndTime = 0;
let stars = [];
let lastTechniqueText = "";
let techniqueTextTimer = 0;
// --- Nuevas Definiciones y Estado Global ---
let adaptationManager;
let isMahoragaActive = false;
let invocationTimer = 0;

// Variables Riesgo Real (Player HP)
let playerHP = 100;
let playerHitbox;
let gameState = 'PLAYING'; // 'PLAYING', 'DEFEAT'
let lastHitTime = 0; // Cooldown de invulnerabilidad jugador iFrames

/**
 * Estructura estática principal que representa el suelo donde se asienta la física del Bot.
 * @class Platform
 */
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

/**
 * Motor Central P5 instanciado a 60fps.
 * @performance Este frame ha sido blindado desvinculando la cámara (`constraints` manuales) 
 * impidiendo que las dependencias asíncronas de la GPU recorten la interpolación a 30fps máximos.
 */
function setup() {
  createCanvas(1280, 720);
  pixelDensity(1); // 🔧 EL TRUCO DEL ARQUITECTO: Forzar densidad de píxeles para pantallas Retina/4K
  frameRate(60); // 🔧 Forzar al engine a no rendirse ante los Hz de la cámara
  
  // Floating Island
  platform = new Platform(width/2 - 300, height - 150, 600, 30);
  
  // 🔧 Reducir la resolución de captura REAL del hardware de la cámara
  let constraints = {
    video: {
      width: { ideal: 400 },
      height: { ideal: 300 },
      frameRate: { ideal: 60 } // Quitamos el max: 30 que asfixiaba el hardware
    }
  };
  
  video = createCapture(constraints, () => {
    console.log("Cámara inicializada.");
  });
  video.size(400, 300);
  video.hide();

  handHandler = new HandHandler(video);
  gestureAnalyzer = new GestureAnalyzer();
  bot = new Bot(platform.x + platform.w / 2 - 25, platform.y - 50);
  fx = new FXManager();
  uiManager = new UIManager();
  attackManager = new AttackManager();
  adaptationManager = new AdaptationManager();
  
  // Establecer zona de castigo del jugador (Centro Abajo)
  playerHitbox = { x: width/2 - 100, y: height - 50, w: 200, h: 50 };

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

function updateGameState() {
  if (gameState === 'DEFEAT') return;

  // IA y Jugador AABB vs Hitbox Vulnerable
  let activeBot = getCurrentBot();
  if (activeBot) {
      if (
          activeBot.x < playerHitbox.x + playerHitbox.w &&
          activeBot.x + activeBot.w > playerHitbox.x &&
          activeBot.y < playerHitbox.y + playerHitbox.h &&
          activeBot.y + activeBot.h > playerHitbox.y
      ) {
          // El Bot toca la barrera del jugador. 
          // Administramos iFrames (ej: daño 1 vez cada 500ms)
          if (millis() - lastHitTime > 500) {
              playerHP -= 20; 
              lastHitTime = millis();
              fx.triggerScreenshake(20, 20); // Juice: Shake al ser golpeado
              
              if (playerHP <= 0) {
                  gameState = 'DEFEAT';
              }
          }
      }
  }
}

function draw() {
  if (gameState === 'DEFEAT') {
      background(50, 0, 0);
      fill(255);
      textSize(80);
      textAlign(CENTER, CENTER);
      text("DEFEAT", width/2, height/2);
      textSize(30);
      text("La Adapatación de Mahoraga fue absoluta.", width/2, height/2 + 60);
      return; 
  }

  if (domainActive && millis() > domainEndTime) {
      domainActive = false;
  }

  if (domainActive) {
      drawDomain(); // Shader ligero de estrellas para no perder FPS
  } else {
      background(20, 20, 25);
  }

  // Pre-analizar la mano para saber el gesto antes de mover el cursor
  let currentHand = null;
  let confidentHands = handHandler.predictions.filter(hand => hand && hand.confidence >= 0.8);
  if (confidentHands.length > 0) {
      currentHand = confidentHands[0];
  }
  
  // Procesamos la primera mano para combate regular/navegación
  let gesture = gestureAnalyzer.analyze(currentHand);
  
  // Procesamos la segunda mano si existe para ver si *ambas* son puños
  let secondGesture = 'NONE';
  if (confidentHands.length >= 2) {
      secondGesture = gestureAnalyzer.analyze(confidentHands[1], true); // bool parametrizado opcional en caso de que modifiques el analizer
  }

  // Lógica de invocación (Doble puño cerrado simulado por ML5 + Timer)
  if (confidentHands.length >= 2 && gesture === 'FIST' && secondGesture === 'FIST' && !isMahoragaActive) {
      // Input buff para evitar reinicio por ruido de frames (Hold)
      if (invocationTimer === 0) invocationTimer = millis();
      
      if (millis() - invocationTimer > 2000) {
          // Trigger Invocación: Megumi pose
          isMahoragaActive = true;
          fx.triggerScreenshake(50, 40); // Max Shake
          bot = new MahoragaBot(width/2 - 40, 100, adaptationManager); // Reemplaza
      }
  } else if (confidentHands.length < 2 || gesture !== 'FIST') {
      invocationTimer = 0; // Cancelar si suelta
  }

  // Actualizar Estados Centrales (Física + Combate)
  updateGameState(); 
  
  // 1. Inputs y Actualizaciones (Le pasamos el gesto para el bloqueo de navegación)
  handHandler.update(width, height, gesture);
  
  if (gesture !== 'NONE' && gesture !== 'FIST' && gesture !== 'COOLDOWN') {
      let attackBox = handHandler.getAttackBounds();
      let didFire = false;

      // Centralized attack triggering (ignoring AABB target to allow global ritual hits)
      if (gesture === 'DOMAIN') {
          domainActive = true;
          domainEndTime = millis() + 5000;
          fx.triggerScreenshake(10, 30);
          didFire = true;
      }
      else if (gesture === 'BASIC_ATTACK') {
          didFire = attackManager.tryAttack('BASIC', attackBox.x + attackBox.w/2, attackBox.y + attackBox.h/2, getCurrentBot(), fx);
      }
      else if (gesture === 'BLUE' || gesture === 'RED' || gesture === 'PURPLE') {
          didFire = attackManager.tryAttack(gesture, attackBox.x + attackBox.w/2, attackBox.y + attackBox.h/2, getCurrentBot(), fx, uiManager);
      }

      if (didFire) {
          lastTechniqueText = gesture;
          techniqueTextTimer = millis() + 1000;
      }
  }

  attackManager.update(uiManager);
  // Ralentización del bot por Expansión de Dominio
  let currentDomainMod = domainActive ? 0.1 : 1.0;
  getCurrentBot().update(fx, platform, currentDomainMod);

  // 3. Render
  push();
  fx.applyScreenshake(); // Juice: Shake global del lienzo
  
  // Dibujar zona de juego
  platform.draw();
  getCurrentBot().draw(platform);
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

  if (getCurrentBot().hp <= 0) {
      textSize(60);
      fill(0, 255, 0);
      textAlign(CENTER);
      text("BOT DESTRUIDO", width/2, height/2);
  }
  pop();
  
  // HUD Diagnóstico (Consola del Arquitecto)
  gestureAnalyzer.drawDebug(10, 10);
  uiManager.draw(attackManager);
  
  // HUD Player HP (Riesgo Real) y Timer de Invocación
  drawRiesgoReal();
}

function drawRiesgoReal() {
  push();
  // Player HP
  fill(255);
  textSize(20);
  text(`HP JUGADOR: ${playerHP}`, 20, 30);
  
  // Dibujar hitbox real jugador semitransparente
  fill(255, 0, 0, 40);
  stroke(255, 0, 0, 150);
  rect(playerHitbox.x, playerHitbox.y, playerHitbox.w, playerHitbox.h);

  // Barra de progreso invisible si el usuario sostiene la pose
  if (invocationTimer > 0 && !isMahoragaActive) {
      let progress = map(millis() - invocationTimer, 0, 2000, 0, width);
      fill(255, 255, 255, 100);
      rect(0, 0, progress, 10);
  }
  pop();
}

function getCurrentBot() {
  return bot; // Gracias al polimorfismo, `bot` puede ser `Bot` normal o `MahoragaBot`
}
