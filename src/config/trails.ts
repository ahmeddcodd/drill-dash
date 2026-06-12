import Phaser from 'phaser'

export interface TrailDef {
  id: string
  name: string
  cost: number
  currency: 'coins' | 'gems'
  texture: string
  tints: number[]
  blendAdd: boolean
  scaleStart: number
  lifespan: number
  speedMin: number
  speedMax: number
  frequency: number
  gravityY: number
  alphaStart: number
}

// Dig-trail effects (design doc §20). "dust" is the default everyone owns —
// it matches the original hardcoded dig-dust look exactly.
export const TRAILS: TrailDef[] = [
  {
    id: 'dust', name: 'DUST', cost: 0, currency: 'coins',
    texture: 'px', tints: [0x8b5a2b, 0x6e4520], blendAdd: false,
    scaleStart: 1.1, lifespan: 420, speedMin: 100, speedMax: 240, frequency: 45, gravityY: 500, alphaStart: 1,
  },
  {
    id: 'sparkle', name: 'SPARKLE', cost: 800, currency: 'coins',
    texture: 'spark', tints: [0xfff7b0, 0xffe06a, 0xffffff], blendAdd: true,
    scaleStart: 0.9, lifespan: 500, speedMin: 60, speedMax: 200, frequency: 40, gravityY: 250, alphaStart: 1,
  },
  {
    id: 'bubble', name: 'BUBBLE', cost: 1000, currency: 'coins',
    texture: 'bubble', tints: [0x9fe8ff, 0xd3f6ff], blendAdd: false,
    scaleStart: 0.8, lifespan: 750, speedMin: 50, speedMax: 140, frequency: 55, gravityY: -180, alphaStart: 0.85,
  },
  {
    id: 'smoke', name: 'SMOKE', cost: 1200, currency: 'coins',
    texture: 'glow', tints: [0x777777, 0x9a9a9a], blendAdd: false,
    scaleStart: 0.7, lifespan: 700, speedMin: 40, speedMax: 120, frequency: 60, gravityY: -220, alphaStart: 0.45,
  },
  {
    id: 'fire', name: 'FIRE', cost: 1800, currency: 'coins',
    texture: 'glow', tints: [0xff5e2b, 0xffd166, 0xff8c42], blendAdd: true,
    scaleStart: 0.8, lifespan: 480, speedMin: 60, speedMax: 180, frequency: 35, gravityY: -260, alphaStart: 0.9,
  },
  {
    id: 'crystal', name: 'CRYSTAL', cost: 2500, currency: 'coins',
    texture: 'spark', tints: [0x9be7ff, 0xb066ff, 0x7df9ff], blendAdd: true,
    scaleStart: 1, lifespan: 550, speedMin: 60, speedMax: 200, frequency: 38, gravityY: 200, alphaStart: 1,
  },
  {
    id: 'rainbow', name: 'RAINBOW', cost: 40, currency: 'gems',
    texture: 'px', tints: [0xff4d4d, 0xff9f43, 0xffe06a, 0x6ddb6a, 0x4fc3f7, 0xb066ff], blendAdd: false,
    scaleStart: 1.3, lifespan: 520, speedMin: 80, speedMax: 220, frequency: 30, gravityY: 350, alphaStart: 1,
  },
]

export function getTrail(id: string): TrailDef {
  return TRAILS.find((t) => t.id === id) ?? TRAILS[0]
}

/** Particle emitter config for a trail (shared by GameScene, MenuScene, previews). */
export function trailEmitterConfig(def: TrailDef, frequency = def.frequency): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
  return {
    speed: { min: def.speedMin, max: def.speedMax },
    angle: { min: 245, max: 295 },
    scale: { start: def.scaleStart, end: 0 },
    alpha: { start: def.alphaStart, end: 0 },
    lifespan: def.lifespan,
    gravityY: def.gravityY,
    tint: def.tints,
    frequency,
    blendMode: def.blendAdd ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
  }
}
