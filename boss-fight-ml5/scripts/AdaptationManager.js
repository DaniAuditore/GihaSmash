/**
 * Gestor de Estado Evolutivo (Adaptación).
 * Desacoplado del Render y de las físicas puras.
 */
class AdaptationManager {
  constructor() {
    this.adaptationState = {
      "BLUE": 0, // Veces impactado por Atracción
      "RED": 0   // Veces impactado por Repulsión
    };
    
    // Configuración de diminishing returns (Curva de escalado)
    // Cada impacto reduce la eficacia en un porcentaje fijo, capado a un 90% (0.1).
    this.adaptationConfig = {
      "BLUE": { reductionPerHit: 0.25, minEffectiveness: 0.1 },
      "RED": { reductionPerHit: 0.30, minEffectiveness: 0.1 }
    };
  }

  recordImpact(type) {
    if (this.adaptationState[type] !== undefined) {
      this.adaptationState[type]++;
    }
  }

  getModifier(type) {
    if (this.adaptationState[type] === undefined) return 1.0;
    
    let stats = this.adaptationConfig[type];
    let hits = this.adaptationState[type];
    
    // Modificador de 1.0 (100%) cayendo hacia minEffectiveness.
    let modifier = 1.0 - (stats.reductionPerHit * hits);
    return Math.max(modifier, stats.minEffectiveness);
  }
  
  reset() {
    this.adaptationState["BLUE"] = 0;
    this.adaptationState["RED"] = 0;
  }
}
