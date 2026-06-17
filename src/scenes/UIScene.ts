import Phaser from 'phaser'
import { GAME_WIDTH, FONT, POWER_ICONS, SAFE_MARGIN } from '../config/constants'
import type { PowerType } from '../config/constants'
import { save } from '../systems/SaveManager'
import { audio } from '../systems/AudioManager'
import type { GameScene } from './GameScene'
import { makeButton } from '../ui/helpers'

/**
 * HUD overlay running in parallel with the Game scene (§24).
 * It polls the game scene every frame — no shared mutable state.
 */
export class UIScene extends Phaser.Scene {
  private game_!: GameScene
  private depthTxt!: Phaser.GameObjects.Text
  private bestTxt!: Phaser.GameObjects.Text
  private coinTxt!: Phaser.GameObjects.Text
  private gemTxt!: Phaser.GameObjects.Text
  private coinIcon!: Phaser.GameObjects.Image
  private gemIcon!: Phaser.GameObjects.Image
  private fuelIcon!: Phaser.GameObjects.Image
  private comboTxt!: Phaser.GameObjects.Text
  private goalTxt!: Phaser.GameObjects.Text
  private fuelFill!: Phaser.GameObjects.Rectangle
  private fuelW = 250
  private hearts: Phaser.GameObjects.Image[] = []
  private chips: { c: Phaser.GameObjects.Container; icon: Phaser.GameObjects.Image; txt: Phaser.GameObjects.Text }[] = []

  // previous-frame values so the HUD can react to changes
  private lastCoins = 0
  private lastGems = 0
  private lastHp = 0
  private lastMilestone = 0
  private lowFuelTween: Phaser.Tweens.Tween | null = null
  private lowFuelBeep: Phaser.Time.TimerEvent | null = null

  constructor() {
    super('UI')
  }

  create(): void {
    this.game_ = this.scene.get('Game') as GameScene

    // Phaser reuses this scene instance across launch/stop cycles, so drop any
    // references to GameObjects from a previous run before rebuilding the HUD.
    // (Touching a stale object in update() throws and kills the render loop.)
    this.chips = []
    this.hearts = []
    this.lastCoins = 0
    this.lastGems = 0
    this.lastHp = this.game_.maxHp
    this.lastMilestone = 0
    this.lowFuelTween = null
    this.lowFuelBeep = null

    // top strip: soft gradient instead of a hard-edged rectangle
    this.add.image(GAME_WIDTH / 2, 85, 'hudGrad').setDisplaySize(GAME_WIDTH, 170)

    // depth (top-left) — held inside the ENVELOP crop margin on tall phones
    this.depthTxt = this.add.text(SAFE_MARGIN, 22, '0m', {
      fontFamily: FONT, fontSize: '44px', color: '#ffffff', stroke: '#000000', strokeThickness: 6,
    })
    // best depth is an endless stat — in level mode show the level instead
    this.bestTxt = this.add.text(SAFE_MARGIN, 76, this.game_.level ? `LEVEL ${this.game_.level.id}` : `BEST ${save.profile.bestDepth}m`, {
      fontFamily: FONT, fontSize: '22px',
      color: this.game_.level ? '#aef3ff' : '#ffd84d',
      stroke: '#000000', strokeThickness: 4,
    })

    // fuel bar (top-center)
    const barX = GAME_WIDTH / 2
    this.fuelIcon = this.add.image(barX - this.fuelW / 2 - 34, 46, 'fuelcan').setScale(0.55)
    this.add.rectangle(barX, 46, this.fuelW + 8, 36, 0x000000, 0.55).setStrokeStyle(3, 0xffffff, 0.5)
    this.fuelFill = this.add.rectangle(barX - this.fuelW / 2, 46, this.fuelW, 26, 0x6ddb6a).setOrigin(0, 0.5)

    // hearts under the fuel bar (§12)
    this.buildHearts()

    // coins / gems (top-right) — shifted in so the numbers clear the crop
    const rightInset = SAFE_MARGIN - 22 // = 48
    this.coinIcon = this.add.image(GAME_WIDTH - 180 - rightInset, 36, 'coin').setScale(0.55)
    this.coinTxt = this.add.text(GAME_WIDTH - 152 - rightInset, 22, '0', {
      fontFamily: FONT, fontSize: '30px', color: '#ffd84d', stroke: '#000000', strokeThickness: 5,
    })
    this.gemIcon = this.add.image(GAME_WIDTH - 180 - rightInset, 86, 'gemGreen').setScale(0.5)
    this.gemTxt = this.add.text(GAME_WIDTH - 152 - rightInset, 72, '0', {
      fontFamily: FONT, fontSize: '30px', color: '#7dffea', stroke: '#000000', strokeThickness: 5,
    })

    // combo indicator
    this.comboTxt = this.add
      .text(GAME_WIDTH / 2, 118, '', {
        fontFamily: FONT, fontSize: '26px', color: '#ffe06a', stroke: '#000000', strokeThickness: 5,
      })
      .setOrigin(0.5, 0)

    // level goal banner
    this.goalTxt = this.add
      .text(GAME_WIDTH / 2, 158, '', {
        fontFamily: FONT, fontSize: '26px', color: '#aef3ff', stroke: '#000000', strokeThickness: 5,
      })
      .setOrigin(0.5, 0)

    // pause (small corner button, §24)
    makeButton(this, GAME_WIDTH - 52, 190, 72, 72, 'II', 0x5d4037, () => {
      if (!this.game_.runActive) return
      this.scene.pause('Game')
      this.scene.launch('Pause')
    }, 28)

    // power-up timer chips (bottom-left)
    for (let i = 0; i < 4; i++) {
      const c = this.add.container(86, 0).setVisible(false)
      const bg = this.add.rectangle(0, 0, 150, 56, 0x000000, 0.45).setStrokeStyle(2, 0xffffff, 0.4)
      const icon = this.add.image(-48, 0, 'pwShield').setScale(0.55)
      const txt = this.add.text(-16, -14, '', { fontFamily: FONT, fontSize: '26px', color: '#ffffff' })
      c.add([bg, icon, txt])
      this.chips.push({ c, icon, txt })
    }
  }

  private buildHearts(): void {
    for (const h of this.hearts) h.destroy()
    this.hearts = []
    const max = this.game_.maxHp
    const startX = GAME_WIDTH / 2 - ((max - 1) * 40) / 2
    for (let i = 0; i < max; i++) {
      this.hearts.push(this.add.image(startX + i * 40, 92, 'heart').setScale(0.8).setTint(0xff5a79))
    }
    this.lastHp = max
  }

  /** Quick attention pop for a HUD icon + value pair (base scales preserved
   *  so rapid consecutive bumps can't drift the size). */
  private bump(items: Array<{ obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text; base: number }>): void {
    for (const { obj, base } of items) {
      this.tweens.killTweensOf(obj)
      obj.setScale(base)
      this.tweens.add({ targets: obj, scale: base * 1.25, duration: 70, yoyo: true, ease: 'Quad.easeOut' })
    }
  }

  update(): void {
    const g = this.game_
    // Safety net: never let a stray tick (fired between stop() and the next
    // create()) dereference a half-built or destroyed HUD and kill the loop.
    if (!g || this.chips.length === 0 || !this.depthTxt) return
    if (!g.scene.isActive() && !g.scene.isPaused()) return

    const depth = Math.floor(g.depthM)
    this.depthTxt.setText(`${depth}m`)
    if (!g.level) this.bestTxt.setText(`BEST ${save.profile.bestDepth}m`)
    this.coinTxt.setText(`${g.coinsRun}`)
    this.gemTxt.setText(`${g.gemsRun}`)

    // counter bumps when value increases
    if (g.coinsRun > this.lastCoins) this.bump([{ obj: this.coinIcon, base: 0.55 }, { obj: this.coinTxt, base: 1 }])
    if (g.gemsRun > this.lastGems) this.bump([{ obj: this.gemIcon, base: 0.5 }, { obj: this.gemTxt, base: 1 }])
    this.lastCoins = g.coinsRun
    this.lastGems = g.gemsRun

    // depth milestone pop every 100m with a brief gold flash
    const milestone = Math.floor(depth / 100)
    if (milestone > this.lastMilestone && depth > 0) {
      this.lastMilestone = milestone
      this.depthTxt.setTint(0xffd84d)
      this.tweens.add({
        targets: this.depthTxt, scale: 1.3, duration: 120, yoyo: true, ease: 'Quad.easeOut',
        onComplete: () => this.depthTxt.clearTint(),
      })
    }

    // hearts: animate the loss instead of an instant tint swap
    if (this.hearts.length !== g.maxHp) this.buildHearts()
    if (g.hp < this.lastHp) {
      for (let i = g.hp; i < Math.min(this.lastHp, this.hearts.length); i++) {
        const heart = this.hearts[i]
        this.tweens.add({
          targets: heart, scale: 1.4, angle: 12, duration: 110, yoyo: true,
          onComplete: () => {
            heart.setTint(0x4a4a4a).setAngle(0)
          },
        })
      }
    } else {
      for (let i = 0; i < this.hearts.length; i++) {
        this.hearts[i].setTint(i < g.hp ? 0xff5a79 : 0x4a4a4a)
      }
    }
    this.lastHp = g.hp

    // fuel bar + low-fuel warning pulse below 25%
    const pct = Phaser.Math.Clamp(g.fuel / g.maxFuel, 0, 1)
    this.fuelFill.width = this.fuelW * pct
    this.fuelFill.fillColor = pct > 0.5 ? 0x6ddb6a : pct > 0.25 ? 0xffd166 : 0xff5e2b
    const low = pct <= 0.25 && g.runActive
    if (low && !this.lowFuelTween) {
      this.lowFuelTween = this.tweens.add({
        targets: [this.fuelFill, this.fuelIcon], alpha: 0.35, duration: 280, yoyo: true, repeat: -1,
      })
      audio.play('fuelLow')
      this.lowFuelBeep = this.time.addEvent({ delay: 3200, loop: true, callback: () => audio.play('fuelLow') })
    } else if (!low && this.lowFuelTween) {
      this.lowFuelTween.stop()
      this.lowFuelTween = null
      this.fuelFill.setAlpha(1)
      this.fuelIcon.setAlpha(1)
      this.lowFuelBeep?.remove()
      this.lowFuelBeep = null
    }

    this.comboTxt.setText(g.comboMult > 1 ? `COMBO x${g.comboMult}  (${g.comboCount})` : '')

    const goal = g.goalHud()
    this.goalTxt.setText(goal ?? '')

    // power-up chips
    let i = 0
    for (const [type, remaining] of g.activePowers) {
      if (i >= this.chips.length) break
      const chip = this.chips[i]
      chip.c.setVisible(true).setY(1180 - i * 66)
      chip.icon.setTexture(POWER_ICONS[type as PowerType])
      chip.txt.setText(`${Math.ceil(remaining)}s`)
      i++
    }
    for (; i < this.chips.length; i++) this.chips[i].c.setVisible(false)
  }
}
