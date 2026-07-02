import Phaser from 'phaser'
import { LANES, laneX } from '../config/constants'
import type { SkinDef } from '../config/skins'
import { audio } from '../systems/AudioManager'

/**
 * The player's drilling machine: a container of tintable parts with snappy
 * lane-to-lane tweens, one queued input (§7), damage states (§12) and
 * shield / mega-drill visuals.
 */
export class Drill extends Phaser.GameObjects.Container {
  lane: number
  moving = false
  dead = false
  /** Fired when a lane move actually starts (used for dust kicks etc.). */
  onMoveStart?: (dir: -1 | 1) => void
  /** Lane the drill is steering toward when following the pointer/cursor. */
  targetLane: number
  private queued: -1 | 0 | 1 = 0

  private bitSpr: Phaser.GameObjects.Image
  private bodySpr: Phaser.GameObjects.Image
  private windowSpr: Phaser.GameObjects.Image
  private finL: Phaser.GameObjects.Image
  private finR: Phaser.GameObjects.Image
  private crackSpr: Phaser.GameObjects.Image
  private shieldSpr: Phaser.GameObjects.Image
  private megaGlow: Phaser.GameObjects.Image
  private pupilL: Phaser.GameObjects.Image
  private pupilR: Phaser.GameObjects.Image

  constructor(scene: Phaser.Scene, lane: number, y: number) {
    super(scene, laneX(lane), y)
    this.lane = lane
    this.targetLane = lane

    this.megaGlow = scene.add.image(0, 10, 'glow').setScale(4.2).setTint(0xfff176).setAlpha(0)
    this.finL = scene.add.image(-46, -8, 'drillFin')
    this.finR = scene.add.image(46, -8, 'drillFin').setFlipX(true)
    this.bodySpr = scene.add.image(0, -18, 'drillBody')
    this.windowSpr = scene.add.image(0, -34, 'drillWindow')
    this.pupilL = scene.add.image(-9, -34, 'pupil')
    this.pupilR = scene.add.image(9, -34, 'pupil')
    this.bitSpr = scene.add.image(0, 44, 'drillBit')
    this.crackSpr = scene.add.image(0, -18, 'crackOverlay').setAlpha(0)
    this.shieldSpr = scene.add.image(0, 0, 'shieldBubble').setAlpha(0)

    this.add([
      this.megaGlow, this.finL, this.finR, this.bitSpr, this.bodySpr,
      this.crackSpr, this.windowSpr, this.pupilL, this.pupilR, this.shieldSpr,
    ])
    scene.add.existing(this)
    this.setDepth(50)

    // blink every few seconds (cartoon squash of the pupils)
    scene.time.addEvent({
      delay: 2600, loop: true,
      callback: () => {
        if (this.dead || Math.random() < 0.3) return
        scene.tweens.add({ targets: [this.pupilL, this.pupilR], scaleY: 0.12, duration: 70, yoyo: true })
      },
    })
  }

  applySkin(skin: SkinDef): void {
    this.bodySpr.setTint(skin.body)
    this.finL.setTint(skin.body)
    this.finR.setTint(skin.body)
    this.bitSpr.setTint(skin.bit)
  }

  /** Move one lane left (-1) or right (+1). Queues one input while tweening. */
  tryMove(dir: -1 | 1): void {
    if (this.dead) return
    if (this.moving) {
      this.queued = dir
      return
    }
    const target = Phaser.Math.Clamp(this.lane + dir, 0, LANES - 1)
    if (target === this.lane) return
    this.lane = target
    this.moving = true
    audio.play('laneMove')
    this.onMoveStart?.(dir)
    this.glance(dir)
    this.scene.tweens.add({
      targets: this,
      x: laneX(target),
      angle: dir * 7,
      duration: 110,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.moving = false
        this.scene.tweens.add({ targets: this, angle: 0, duration: 90, ease: 'Quad.easeOut' })
        // little landing squash so the move has weight
        this.scene.tweens.add({ targets: this.bodySpr, scaleY: 0.92, duration: 60, yoyo: true })
        if (this.queued !== 0) {
          const q = this.queued
          this.queued = 0
          this.tryMove(q)
        }
      },
    })
  }

  /** Point the drill at a lane (from the pointer/cursor position). */
  steerTo(lane: number): void {
    this.targetLane = Phaser.Math.Clamp(Math.round(lane), 0, LANES - 1)
  }

  /**
   * Step one lane toward targetLane each frame the drill is idle. Combined with
   * the pointer→lane mapping this makes the drill reliably follow the cursor,
   * while reusing tryMove so the tween/queue/animation behaviour is identical
   * to a tap. Call every frame.
   */
  followStep(): void {
    if (this.dead || this.moving) return
    if (this.targetLane > this.lane) this.tryMove(1)
    else if (this.targetLane < this.lane) this.tryMove(-1)
  }

  /** Pupils dart toward the movement direction, then drift back. */
  private glance(dir: -1 | 1): void {
    this.scene.tweens.killTweensOf([this.pupilL, this.pupilR])
    this.pupilL.setScale(1)
    this.pupilR.setScale(1)
    this.scene.tweens.add({ targets: this.pupilL, x: -9 + dir * 4, duration: 80 })
    this.scene.tweens.add({ targets: this.pupilR, x: 9 + dir * 4, duration: 80 })
    this.scene.time.delayedCall(400, () => {
      if (this.dead) return
      this.scene.tweens.add({ targets: this.pupilL, x: -9, duration: 150 })
      this.scene.tweens.add({ targets: this.pupilR, x: 9, duration: 150 })
    })
  }

  /** Crack overlay appears as health drops (first hit: cracks, later: heavier). */
  setDamageVisual(hp: number, maxHp: number): void {
    const frac = maxHp <= 1 ? 1 : 1 - (hp - 1) / (maxHp - 1)
    this.crackSpr.setAlpha(hp >= maxHp ? 0 : 0.35 + frac * 0.55)
  }

  flashHit(): void {
    if (this.dead) return
    this.scene.tweens.addCounter({
      from: 0, to: 3, duration: 280,
      onUpdate: (tw) => {
        const on = Math.floor(tw.getValue() ?? 0) % 2 === 0
        this.bodySpr.setTintFill(on ? 0xffffff : 0)
        if (!on) this.bodySpr.clearTint()
      },
      onComplete: () => {
        const skinTint = this.bodySpr.tintTopLeft
        this.bodySpr.clearTint()
        this.bodySpr.setTint(skinTint)
      },
    })
  }

  setShield(on: boolean): void {
    this.scene.tweens.killTweensOf(this.shieldSpr)
    if (on) {
      this.shieldSpr.setAlpha(0.85).setScale(0.6)
      this.scene.tweens.add({ targets: this.shieldSpr, scale: 1, duration: 200, ease: 'Back.easeOut' })
      this.scene.tweens.add({ targets: this.shieldSpr, alpha: 0.55, yoyo: true, repeat: -1, duration: 500 })
    } else {
      this.scene.tweens.add({ targets: this.shieldSpr, alpha: 0, scale: 1.4, duration: 180 })
    }
  }

  setMega(on: boolean): void {
    this.scene.tweens.killTweensOf(this.megaGlow)
    if (on) {
      this.scene.tweens.add({ targets: this.megaGlow, alpha: 0.8, duration: 150 })
      this.scene.tweens.add({ targets: this, scale: 1.18, duration: 200, ease: 'Back.easeOut' })
    } else {
      this.scene.tweens.add({ targets: this.megaGlow, alpha: 0, duration: 250 })
      this.scene.tweens.add({ targets: this, scale: 1, duration: 200 })
    }
  }

  /** Fake the spinning bit + a gentle dig bob. Call every frame. */
  spinUpdate(time: number): void {
    if (this.dead) return
    this.bitSpr.setFlipX(Math.floor(time / 55) % 2 === 0)
    this.bitSpr.y = 44 + Math.sin(time / 90) * 2
  }

  die(onDone: () => void): void {
    if (this.dead) return
    this.dead = true
    this.scene.tweens.killTweensOf(this)
    this.setShield(false)
    this.setMega(false)
    const parts = [this.bitSpr, this.bodySpr, this.windowSpr, this.pupilL, this.pupilR, this.finL, this.finR]
    for (const p of parts) {
      this.scene.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-130, 130),
        y: p.y + Phaser.Math.Between(-150, 60),
        angle: Phaser.Math.Between(-220, 220),
        alpha: 0,
        duration: 650,
        ease: 'Quad.easeOut',
      })
    }
    this.crackSpr.setAlpha(0)
    this.scene.time.delayedCall(700, onDone)
  }
}
