import Phaser from 'phaser'
import { GAME_WIDTH, FONT, POWER_ICONS } from '../config/constants'
import type { PowerType } from '../config/constants'
import { save } from '../systems/SaveManager'
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
  private comboTxt!: Phaser.GameObjects.Text
  private goalTxt!: Phaser.GameObjects.Text
  private fuelFill!: Phaser.GameObjects.Rectangle
  private fuelW = 250
  private hearts: Phaser.GameObjects.Image[] = []
  private chips: { c: Phaser.GameObjects.Container; icon: Phaser.GameObjects.Image; txt: Phaser.GameObjects.Text }[] = []

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

    // top translucent strip
    this.add.rectangle(GAME_WIDTH / 2, 70, GAME_WIDTH, 140, 0x000000, 0.32)

    // depth (top-left)
    this.depthTxt = this.add.text(22, 22, '0m', {
      fontFamily: FONT, fontSize: '44px', color: '#ffffff', stroke: '#000000', strokeThickness: 6,
    })
    this.bestTxt = this.add.text(22, 76, `BEST ${save.profile.bestDepth}m`, {
      fontFamily: FONT, fontSize: '22px', color: '#ffd84d', stroke: '#000000', strokeThickness: 4,
    })

    // fuel bar (top-center)
    const barX = GAME_WIDTH / 2
    this.add.image(barX - this.fuelW / 2 - 34, 46, 'fuelcan').setScale(0.55)
    this.add.rectangle(barX, 46, this.fuelW + 8, 36, 0x000000, 0.55).setStrokeStyle(3, 0xffffff, 0.5)
    this.fuelFill = this.add.rectangle(barX - this.fuelW / 2, 46, this.fuelW, 26, 0x6ddb6a).setOrigin(0, 0.5)

    // hearts under the fuel bar (§12)
    this.buildHearts()

    // coins / gems (top-right)
    this.add.image(GAME_WIDTH - 180, 36, 'coin').setScale(0.55)
    this.coinTxt = this.add.text(GAME_WIDTH - 152, 22, '0', {
      fontFamily: FONT, fontSize: '30px', color: '#ffd84d', stroke: '#000000', strokeThickness: 5,
    })
    this.add.image(GAME_WIDTH - 180, 86, 'gemGreen').setScale(0.5)
    this.gemTxt = this.add.text(GAME_WIDTH - 152, 72, '0', {
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
      this.hearts.push(this.add.image(startX + i * 40, 92, 'heart').setScale(0.8))
    }
  }

  update(): void {
    const g = this.game_
    // Safety net: never let a stray tick (fired between stop() and the next
    // create()) dereference a half-built or destroyed HUD and kill the loop.
    if (!g || this.chips.length === 0 || !this.depthTxt) return
    if (!g.scene.isActive() && !g.scene.isPaused()) return

    this.depthTxt.setText(`${Math.floor(g.depthM)}m`)
    this.bestTxt.setText(`BEST ${save.profile.bestDepth}m`)
    this.coinTxt.setText(`${g.coinsRun}`)
    this.gemTxt.setText(`${g.gemsRun}`)

    if (this.hearts.length !== g.maxHp) this.buildHearts()
    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setTint(i < g.hp ? 0xff5a79 : 0x4a4a4a)
    }

    const pct = Phaser.Math.Clamp(g.fuel / g.maxFuel, 0, 1)
    this.fuelFill.width = this.fuelW * pct
    this.fuelFill.fillColor = pct > 0.5 ? 0x6ddb6a : pct > 0.25 ? 0xffd166 : 0xff5e2b

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
