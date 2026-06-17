import Phaser from 'phaser'
import { FONT, GAME_WIDTH, GAME_HEIGHT } from '../config/constants'
import { save } from '../systems/SaveManager'
import { playables } from '../systems/Playables'

type G = Phaser.GameObjects.Graphics

/**
 * Generates every texture in the game procedurally (bright cartoon style,
 * §27) so no external assets are required, then starts the menu.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    // a real loading frame: Playables cert requires firstFrameReady to be
    // called while a loading/splash frame is being rendered
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LOADING...', {
        fontFamily: FONT, fontSize: '40px', color: '#ffe9b0', stroke: '#3a200b', strokeThickness: 8,
      })
      .setOrigin(0.5)

    const g = this.make.graphics({ x: 0, y: 0 }, false)

    this.makeBlocks(g)
    this.makeCollectibles(g)
    this.makeFossils(g)
    this.makeDrillParts(g)
    this.makePowerBadges(g)
    this.makeParticlesAndUi(g)

    g.destroy()
    this.makeGradientTextures()
    this.bakeMysteryBlock()

    playables.firstFrameReady()
    void this.finishBoot()
  }

  /** Await the (possibly cloud) save before entering the menu. */
  private async finishBoot(): Promise<void> {
    await save.init()
    this.scene.start('Menu')
  }

  // ── helpers ────────────────────────────────────────────────────────────
  private blockBase(g: G, fill: number, edge: number): void {
    g.fillStyle(fill, 1)
    g.fillRoundedRect(4, 4, 124, 124, 16)
    g.fillStyle(edge, 0.28)
    g.fillRoundedRect(4, 88, 124, 40, { tl: 0, tr: 0, bl: 16, br: 16 })
    g.lineStyle(6, edge, 1)
    g.strokeRoundedRect(7, 7, 118, 118, 14)
  }

  private speckle(g: G, color: number, count: number, alpha = 1): void {
    g.fillStyle(color, alpha)
    for (let i = 0; i < count; i++) {
      g.fillCircle(Phaser.Math.Between(20, 112), Phaser.Math.Between(20, 112), Phaser.Math.Between(3, 6))
    }
  }

  private crack(g: G, width: number, color: number, alpha: number, pts: number[][]): void {
    g.lineStyle(width, color, alpha)
    g.beginPath()
    g.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1])
    g.strokePath()
  }

  // ── blocks ─────────────────────────────────────────────────────────────
  private makeBlocks(g: G): void {
    // soft dirt
    this.blockBase(g, 0x8b5a2b, 0x5d3a18)
    this.speckle(g, 0x6e4520, 8)
    this.speckle(g, 0xa9743c, 6)
    g.generateTexture('dirt', 132, 132)
    g.clear()

    // gold block
    this.blockBase(g, 0x8b5a2b, 0x5d3a18)
    this.speckle(g, 0x6e4520, 5)
    g.fillStyle(0xffd84d, 1)
    for (const [x, y, r] of [[40, 44, 11], [86, 36, 8], [64, 80, 13], [98, 92, 9], [30, 96, 7]]) {
      g.fillCircle(x, y, r)
    }
    g.fillStyle(0xfff3b0, 1)
    for (const [x, y, r] of [[37, 41, 4], [62, 76, 5], [95, 89, 3]]) g.fillCircle(x, y, r)
    g.generateTexture('gold', 132, 132)
    g.clear()

    // hard rock
    this.blockBase(g, 0x6d6d78, 0x44444e)
    this.speckle(g, 0x8b8b97, 6)
    this.crack(g, 5, 0x33333b, 0.9, [[30, 20], [52, 46], [44, 70], [66, 96]])
    this.crack(g, 4, 0x33333b, 0.9, [[96, 28], [80, 52], [94, 74]])
    g.generateTexture('rock', 132, 132)
    g.clear()

    // lava crack
    this.blockBase(g, 0x332222, 0x1c1010)
    this.crack(g, 12, 0xff5e2b, 1, [[24, 24], [56, 50], [44, 78], [76, 104]])
    this.crack(g, 12, 0xff5e2b, 1, [[100, 30], [78, 60], [102, 88]])
    this.crack(g, 5, 0xffd166, 1, [[24, 24], [56, 50], [44, 78], [76, 104]])
    this.crack(g, 5, 0xffd166, 1, [[100, 30], [78, 60], [102, 88]])
    g.fillStyle(0xff5e2b, 0.35)
    g.fillCircle(56, 52, 22)
    g.fillCircle(80, 88, 18)
    g.generateTexture('lava', 132, 132)
    g.clear()

    // bomb stone
    this.blockBase(g, 0x4a4a52, 0x2c2c34)
    g.fillStyle(0x23232b, 1)
    g.fillCircle(66, 72, 36)
    g.fillStyle(0x3c3c46, 1)
    g.fillCircle(56, 62, 12)
    g.lineStyle(6, 0x8a6a3a, 1)
    g.beginPath()
    g.moveTo(66, 36)
    g.lineTo(78, 22)
    g.strokePath()
    g.fillStyle(0xffd166, 1)
    g.fillCircle(80, 19, 7)
    this.crack(g, 4, 0xff4040, 0.95, [[44, 86], [60, 74], [56, 96]])
    g.generateTexture('bomb', 132, 132)
    g.clear()

    // boss rock (giant wall segment)
    this.blockBase(g, 0x4a4046, 0x282025)
    g.fillStyle(0x8a7340, 1)
    g.fillRect(8, 30, 116, 14)
    g.fillRect(8, 88, 116, 14)
    g.fillStyle(0xc9a55a, 1)
    for (const x of [20, 66, 112]) {
      g.fillCircle(x, 37, 5)
      g.fillCircle(x, 95, 5)
    }
    this.crack(g, 5, 0x1d171b, 0.9, [[40, 50], [62, 66], [52, 84]])
    g.generateTexture('bossRock', 132, 132)
    g.clear()

    // mystery base (the "?" gets baked on top afterwards)
    this.blockBase(g, 0x7a4fbf, 0x4d2e85)
    this.speckle(g, 0xb591ee, 6, 0.9)
    g.generateTexture('mysteryBase', 132, 132)
    g.clear()
  }

  // ── collectibles ───────────────────────────────────────────────────────
  private makeCollectibles(g: G): void {
    // coin
    g.fillStyle(0xc9941a, 1)
    g.fillCircle(28, 30, 26)
    g.fillStyle(0xffd84d, 1)
    g.fillCircle(28, 26, 26)
    g.fillStyle(0xffea8a, 1)
    g.fillCircle(28, 26, 17)
    g.fillStyle(0xfff7cf, 1)
    g.fillCircle(20, 18, 6)
    g.generateTexture('coin', 56, 60)
    g.clear()

    const gem = (key: string, main: number, light: number, dark: number) => {
      g.fillStyle(dark, 1)
      g.fillPoints([{ x: 32, y: 8 }, { x: 58, y: 27 }, { x: 32, y: 60 }, { x: 6, y: 27 }] as Phaser.Geom.Point[], true)
      g.fillStyle(main, 1)
      g.fillPoints([{ x: 32, y: 10 }, { x: 54, y: 27 }, { x: 32, y: 56 }, { x: 10, y: 27 }] as Phaser.Geom.Point[], true)
      g.fillStyle(light, 1)
      g.fillPoints([{ x: 32, y: 10 }, { x: 44, y: 27 }, { x: 20, y: 27 }] as Phaser.Geom.Point[], true)
      g.fillStyle(0xffffff, 0.9)
      g.fillRect(24, 16, 6, 3)
      g.fillRect(26, 13, 3, 9)
      g.generateTexture(key, 64, 66)
      g.clear()
    }
    gem('gemBlue', 0x4fc3f7, 0xa8e7ff, 0x1976d2)
    gem('gemGreen', 0x66e07a, 0xb8f5c1, 0x1f9d4d)
    gem('gemPurple', 0xb066ff, 0xd9b3ff, 0x6a1fbf)
    gem('gemRed', 0xff5a6e, 0xffb3bd, 0xc2152e)

    // fuel can
    g.fillStyle(0xb71c1c, 1)
    g.fillRoundedRect(10, 22, 44, 50, 8)
    g.fillStyle(0xe53935, 1)
    g.fillRoundedRect(8, 18, 44, 50, 8)
    g.fillStyle(0xffffff, 1)
    g.fillRoundedRect(16, 34, 28, 18, 4)
    g.fillStyle(0xe53935, 1)
    g.fillRect(24, 38, 12, 10)
    g.lineStyle(7, 0xb71c1c, 1)
    g.strokeRoundedRect(18, 6, 24, 12, 5)
    g.fillStyle(0x8d6e63, 1)
    g.fillRect(46, 8, 10, 14)
    g.generateTexture('fuelcan', 64, 76)
    g.clear()

    // treasure chest
    g.fillStyle(0x5d3a18, 1)
    g.fillRoundedRect(6, 40, 104, 48, 8)
    g.fillStyle(0x8d5524, 1)
    g.fillRoundedRect(4, 36, 104, 48, 8)
    g.fillStyle(0x6e3f14, 1)
    g.fillRoundedRect(4, 8, 104, 34, { tl: 16, tr: 16, bl: 4, br: 4 })
    g.fillStyle(0xffd34d, 1)
    g.fillRect(4, 36, 104, 10)
    g.fillRect(48, 8, 16, 76)
    g.fillStyle(0xc9941a, 1)
    g.fillRoundedRect(46, 44, 20, 22, 5)
    g.fillStyle(0x3a2208, 1)
    g.fillCircle(56, 53, 4)
    g.generateTexture('chest', 112, 92)
    g.clear()
  }

  // ── fossils (drawn pale so rarity tints colour them) ───────────────────
  private makeFossils(g: G): void {
    const W = 0xf0ead6
    const D = 0x474038

    // bone
    g.fillStyle(W, 1)
    g.fillRect(18, 26, 28, 12)
    g.fillCircle(16, 24, 8)
    g.fillCircle(16, 38, 8)
    g.fillCircle(48, 24, 8)
    g.fillCircle(48, 38, 8)
    g.generateTexture('fosBone', 64, 64)
    g.clear()

    // old coin (square hole)
    g.fillStyle(W, 1)
    g.fillCircle(32, 32, 22)
    g.fillStyle(D, 1)
    g.fillRect(25, 25, 14, 14)
    g.generateTexture('fosCoin', 64, 64)
    g.clear()

    // spiral shell
    g.lineStyle(7, W, 1)
    g.strokeCircle(32, 32, 18)
    g.strokeCircle(36, 30, 10)
    g.fillStyle(W, 1)
    g.fillCircle(39, 29, 4)
    g.lineStyle(5, W, 1)
    g.beginPath()
    g.moveTo(14, 44)
    g.lineTo(4, 56)
    g.strokePath()
    g.generateTexture('fosShell', 64, 64)
    g.clear()

    // tooth
    g.fillStyle(W, 1)
    g.fillPoints([{ x: 18, y: 12 }, { x: 46, y: 12 }, { x: 40, y: 34 }, { x: 32, y: 54 }, { x: 26, y: 34 }] as Phaser.Geom.Point[], true)
    g.generateTexture('fosTooth', 64, 64)
    g.clear()

    // cup
    g.fillStyle(W, 1)
    g.fillPoints([{ x: 16, y: 12 }, { x: 48, y: 12 }, { x: 42, y: 42 }, { x: 22, y: 42 }] as Phaser.Geom.Point[], true)
    g.fillRect(24, 42, 16, 6)
    g.fillRect(20, 48, 24, 6)
    g.lineStyle(5, W, 1)
    g.strokeCircle(50, 24, 8)
    g.generateTexture('fosCup', 64, 64)
    g.clear()

    // bug
    g.fillStyle(W, 1)
    g.fillEllipse(32, 36, 28, 34)
    g.fillCircle(32, 14, 9)
    g.lineStyle(4, W, 1)
    for (const [x1, y1, x2, y2] of [[18, 28, 6, 22], [18, 38, 5, 38], [18, 46, 7, 54], [46, 28, 58, 22], [46, 38, 59, 38], [46, 46, 57, 54]]) {
      g.beginPath()
      g.moveTo(x1, y1)
      g.lineTo(x2, y2)
      g.strokePath()
    }
    g.fillStyle(D, 1)
    g.fillCircle(27, 32, 3)
    g.fillCircle(37, 40, 3)
    g.generateTexture('fosBug', 64, 64)
    g.clear()

    // skull
    g.fillStyle(W, 1)
    g.fillCircle(32, 26, 20)
    g.fillRoundedRect(22, 38, 20, 16, 4)
    g.fillStyle(D, 1)
    g.fillCircle(25, 26, 6)
    g.fillCircle(39, 26, 6)
    g.fillRect(27, 44, 3, 8)
    g.fillRect(34, 44, 3, 8)
    g.generateTexture('fosSkull', 64, 64)
    g.clear()

    // egg
    g.fillStyle(W, 1)
    g.fillEllipse(32, 34, 32, 44)
    g.fillStyle(D, 0.5)
    g.fillCircle(26, 28, 4)
    g.fillCircle(38, 40, 5)
    g.fillCircle(30, 46, 3)
    g.generateTexture('fosEgg', 64, 64)
    g.clear()

    // idol
    g.fillStyle(W, 1)
    g.fillRoundedRect(20, 8, 24, 20, 6)
    g.fillRoundedRect(14, 28, 36, 26, 6)
    g.fillRect(22, 54, 20, 6)
    g.fillStyle(D, 1)
    g.fillCircle(27, 17, 3)
    g.fillCircle(37, 17, 3)
    g.fillRect(24, 38, 16, 4)
    g.generateTexture('fosIdol', 64, 64)
    g.clear()

    // crystal shards
    g.fillStyle(W, 1)
    g.fillPoints([{ x: 22, y: 56 }, { x: 14, y: 30 }, { x: 24, y: 12 }, { x: 30, y: 34 }] as Phaser.Geom.Point[], true)
    g.fillPoints([{ x: 34, y: 56 }, { x: 34, y: 20 }, { x: 44, y: 6 }, { x: 48, y: 32 }] as Phaser.Geom.Point[], true)
    g.fillStyle(D, 0.35)
    g.fillPoints([{ x: 22, y: 56 }, { x: 20, y: 32 }, { x: 26, y: 40 }] as Phaser.Geom.Point[], true)
    g.generateTexture('fosCrystal', 64, 64)
    g.clear()

    // crown
    g.fillStyle(W, 1)
    g.fillPoints([{ x: 10, y: 18 }, { x: 22, y: 32 }, { x: 32, y: 14 }, { x: 42, y: 32 }, { x: 54, y: 18 }, { x: 52, y: 46 }, { x: 12, y: 46 }] as Phaser.Geom.Point[], true)
    g.fillRect(12, 46, 40, 8)
    g.fillStyle(D, 1)
    g.fillCircle(22, 44, 3)
    g.fillCircle(32, 44, 3)
    g.fillCircle(42, 44, 3)
    g.generateTexture('fosCrown', 64, 64)
    g.clear()
  }

  // ── drill parts (white/grey so skins can tint them) ────────────────────
  private makeDrillParts(g: G): void {
    // body
    g.fillStyle(0x9a9a9a, 1)
    g.fillRoundedRect(10, 14, 76, 80, 22)
    g.fillStyle(0xf2f2f2, 1)
    g.fillRoundedRect(8, 8, 76, 80, 22)
    g.fillStyle(0xc4c4c4, 0.8)
    g.fillRoundedRect(8, 62, 76, 26, { tl: 0, tr: 0, bl: 22, br: 22 })
    g.lineStyle(5, 0x6b6b6b, 1)
    g.strokeRoundedRect(10, 10, 72, 76, 20)
    g.fillStyle(0xd6d6d6, 1)
    g.fillCircle(18, 50, 4)
    g.fillCircle(74, 50, 4)
    g.generateTexture('drillBody', 96, 100)
    g.clear()

    // cockpit window (eyes are separate sprites so they can blink and glance)
    g.fillStyle(0x4a7a99, 1)
    g.fillRoundedRect(2, 2, 52, 40, 14)
    g.fillStyle(0xbfeaff, 1)
    g.fillRoundedRect(5, 5, 46, 34, 11)
    g.generateTexture('drillWindow', 56, 44)
    g.clear()

    // pupil with baked glint (two of these become the drill's eyes)
    g.fillStyle(0x1c2e3a, 1)
    g.fillCircle(8, 8, 7)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(5.5, 5.5, 2.5)
    g.generateTexture('pupil', 16, 16)
    g.clear()

    // drill bit
    g.fillStyle(0x8a8a8a, 1)
    g.fillPoints([{ x: 8, y: 8 }, { x: 76, y: 8 }, { x: 42, y: 62 }] as Phaser.Geom.Point[], true)
    g.fillStyle(0xe8e8e8, 1)
    g.fillPoints([{ x: 6, y: 4 }, { x: 78, y: 4 }, { x: 42, y: 58 }] as Phaser.Geom.Point[], true)
    g.lineStyle(4, 0x9a9a9a, 1)
    for (const [y, x1, x2] of [[16, 14, 70], [30, 22, 62], [44, 31, 53]]) {
      g.beginPath()
      g.moveTo(x1, y)
      g.lineTo(x2, y)
      g.strokePath()
    }
    g.generateTexture('drillBit', 84, 64)
    g.clear()

    // side fin / tread
    g.fillStyle(0xb9b9b9, 1)
    g.fillRoundedRect(2, 2, 20, 48, 9)
    g.fillStyle(0x8c8c8c, 1)
    g.fillRoundedRect(5, 8, 14, 36, 6)
    g.generateTexture('drillFin', 24, 52)
    g.clear()

    // damage crack overlay
    this.crack(g, 4, 0x16100a, 0.85, [[20, 18], [38, 40], [30, 58], [46, 80]])
    this.crack(g, 3, 0x16100a, 0.85, [[70, 24], [56, 44], [68, 64]])
    this.crack(g, 3, 0x16100a, 0.7, [[34, 86], [44, 70]])
    g.generateTexture('crackOverlay', 96, 100)
    g.clear()

    // shield bubble
    g.fillStyle(0x9fe8ff, 0.16)
    g.fillCircle(75, 75, 70)
    g.lineStyle(6, 0x6fd8ff, 0.9)
    g.strokeCircle(75, 75, 70)
    g.lineStyle(4, 0xffffff, 0.7)
    g.beginPath()
    g.arc(75, 75, 56, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(250))
    g.strokePath()
    g.generateTexture('shieldBubble', 150, 150)
    g.clear()
  }

  // ── power-up badges ────────────────────────────────────────────────────
  private makePowerBadges(g: G): void {
    const badge = (key: string, bg: number, draw: () => void) => {
      g.fillStyle(0x000000, 0.25)
      g.fillCircle(38, 42, 34)
      g.fillStyle(bg, 1)
      g.fillCircle(38, 38, 34)
      g.lineStyle(5, 0xffffff, 0.85)
      g.strokeCircle(38, 38, 30)
      draw()
      g.generateTexture(key, 76, 80)
      g.clear()
    }

    badge('pwMega', 0xffb300, () => {
      g.fillStyle(0xffffff, 1)
      g.fillPoints([{ x: 22, y: 24 }, { x: 54, y: 24 }, { x: 38, y: 54 }] as Phaser.Geom.Point[], true)
    })
    badge('pwMagnet', 0xe53935, () => {
      g.lineStyle(11, 0xffffff, 1)
      g.beginPath()
      g.arc(38, 36, 14, Math.PI, 0)
      g.strokePath()
      g.fillStyle(0xffffff, 1)
      g.fillRect(18, 36, 11, 14)
      g.fillRect(47, 36, 11, 14)
    })
    badge('pwShield', 0x29b6f6, () => {
      g.fillStyle(0xffffff, 1)
      g.fillPoints([{ x: 38, y: 18 }, { x: 56, y: 26 }, { x: 52, y: 46 }, { x: 38, y: 58 }, { x: 24, y: 46 }, { x: 20, y: 26 }] as Phaser.Geom.Point[], true)
    })
    badge('pwFuel', 0x43a047, () => {
      g.fillStyle(0xffffff, 1)
      g.fillRoundedRect(24, 26, 28, 28, 5)
      g.lineStyle(5, 0xffffff, 1)
      g.strokeRoundedRect(30, 18, 14, 8, 3)
    })
    badge('pwBomb', 0x37474f, () => {
      g.fillStyle(0xffffff, 1)
      g.fillCircle(38, 42, 16)
      g.lineStyle(4, 0xffffff, 1)
      g.beginPath()
      g.moveTo(44, 28)
      g.lineTo(52, 18)
      g.strokePath()
      g.fillStyle(0xffd166, 1)
      g.fillCircle(53, 16, 4)
    })
    badge('pwSlow', 0x7e57c2, () => {
      g.lineStyle(6, 0xffffff, 1)
      g.strokeCircle(38, 38, 17)
      g.beginPath()
      g.moveTo(38, 38)
      g.lineTo(38, 26)
      g.moveTo(38, 38)
      g.lineTo(47, 42)
      g.strokePath()
    })
  }

  // ── particles, UI bits, background tile ────────────────────────────────
  private makeParticlesAndUi(g: G): void {
    g.fillStyle(0xffffff, 1)
    g.fillRect(0, 0, 8, 8)
    g.generateTexture('px', 8, 8)
    g.clear()

    for (let i = 0; i < 8; i++) {
      g.fillStyle(0xffffff, 0.16 * (1 - i / 9))
      g.fillCircle(32, 32, 30 - i * 3.2)
    }
    g.generateTexture('glow', 64, 64)
    g.clear()

    g.fillStyle(0xffffff, 1)
    g.fillPoints([{ x: 8, y: 0 }, { x: 10, y: 6 }, { x: 16, y: 8 }, { x: 10, y: 10 }, { x: 8, y: 16 }, { x: 6, y: 10 }, { x: 0, y: 8 }, { x: 6, y: 6 }] as Phaser.Geom.Point[], true)
    g.generateTexture('spark', 16, 16)
    g.clear()

    // expanding ring (magnet waves, shockwaves)
    g.lineStyle(6, 0xffffff, 1)
    g.strokeCircle(48, 48, 42)
    g.generateTexture('ring', 96, 96)
    g.clear()

    // bubble (for the bubble trail)
    g.lineStyle(3, 0xffffff, 0.9)
    g.strokeCircle(10, 10, 8)
    g.fillStyle(0xffffff, 0.85)
    g.fillCircle(7, 7, 2.5)
    g.generateTexture('bubble', 20, 20)
    g.clear()

    // rounded button (white → tinted everywhere)
    g.fillStyle(0xffffff, 1)
    g.fillRoundedRect(0, 0, 64, 64, 20)
    g.fillStyle(0xd9d9d9, 0.6)
    g.fillRoundedRect(0, 38, 64, 26, { tl: 0, tr: 0, bl: 20, br: 20 })
    g.generateTexture('btn', 64, 64)
    g.clear()

    // heart (white → tinted red / grey)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(13, 14, 11)
    g.fillCircle(31, 14, 11)
    g.fillPoints([{ x: 3, y: 19 }, { x: 41, y: 19 }, { x: 22, y: 40 }] as Phaser.Geom.Point[], true)
    g.generateTexture('heart', 44, 42)
    g.clear()

    // home icon (white house glyph — roof + body)
    g.fillStyle(0xffffff, 1)
    g.fillPoints([{ x: 20, y: 3 }, { x: 39, y: 19 }, { x: 1, y: 19 }] as Phaser.Geom.Point[], true) // roof
    g.fillRect(7, 18, 26, 19) // body
    g.generateTexture('iconHome', 40, 40)
    g.clear()

    // restart icon (white circular arrow)
    g.lineStyle(6, 0xffffff, 1)
    g.beginPath()
    g.arc(20, 21, 13, Phaser.Math.DegToRad(60), Phaser.Math.DegToRad(330))
    g.strokePath()
    // arrowhead at the arc's start (~60°, lower-right)
    const ax = 20 + 13 * Math.cos(Phaser.Math.DegToRad(60))
    const ay = 21 + 13 * Math.sin(Phaser.Math.DegToRad(60))
    g.fillStyle(0xffffff, 1)
    g.fillPoints([
      { x: ax + 9, y: ay + 2 },
      { x: ax - 6, y: ay + 6 },
      { x: ax + 2, y: ay - 8 },
    ] as Phaser.Geom.Point[], true)
    g.generateTexture('iconRestart', 40, 42)
    g.clear()

    // background wall tile (greyscale → tinted per zone)
    g.fillStyle(0x8c8c8c, 1)
    g.fillRect(0, 0, 144, 144)
    g.fillStyle(0x767676, 1)
    for (let i = 0; i < 10; i++) {
      g.fillCircle(Phaser.Math.Between(8, 136), Phaser.Math.Between(8, 136), Phaser.Math.Between(4, 9))
    }
    g.fillStyle(0xa2a2a2, 0.8)
    for (let i = 0; i < 6; i++) {
      g.fillCircle(Phaser.Math.Between(8, 136), Phaser.Math.Between(8, 136), Phaser.Math.Between(3, 6))
    }
    // strata kept whisper-faint and no vertical seam — avoids a visible grid
    g.fillStyle(0x7a7a7a, 0.16)
    g.fillRect(0, 70, 144, 3)
    g.generateTexture('bgTile', 144, 144)
    g.clear()
  }

  /** Soft gradients (vignette, HUD strip) need canvas gradients, not Graphics. */
  private makeGradientTextures(): void {
    // vignette: edges darken radially — adds depth/mood over any scene
    const vt = this.textures.createCanvas('vignette', 360, 640)
    if (vt) {
      const ctx = vt.getContext()
      const grad = ctx.createRadialGradient(180, 320, 150, 180, 320, 420)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.6)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 360, 640)
      vt.refresh()
    }
    // HUD strip: black fading downward to transparent
    const ht = this.textures.createCanvas('hudGrad', 8, 170)
    if (ht) {
      const ctx = ht.getContext()
      const grad = ctx.createLinearGradient(0, 0, 0, 170)
      grad.addColorStop(0, 'rgba(0,0,0,0.6)')
      grad.addColorStop(0.65, 'rgba(0,0,0,0.35)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 8, 170)
      ht.refresh()
    }
  }

  /** Stamp a "?" onto the mystery block base using a RenderTexture. */
  private bakeMysteryBlock(): void {
    const rt = this.make.renderTexture({ x: 0, y: 0, width: 132, height: 132 }, false)
    const base = this.make.image({ x: 66, y: 66, key: 'mysteryBase' }, false)
    const q = this.make.text(
      {
        x: 66,
        y: 62,
        text: '?',
        style: { fontFamily: FONT, fontSize: '64px', color: '#ffe9ff', stroke: '#3a1a66', strokeThickness: 8 },
      },
      false,
    ).setOrigin(0.5)
    rt.draw(base)
    rt.draw(q)
    rt.saveTexture('mystery')
    base.destroy()
    q.destroy()
    rt.destroy()
    this.textures.remove('mysteryBase')
  }
}
