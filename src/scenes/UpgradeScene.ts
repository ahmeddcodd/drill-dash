import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../config/constants'
import { UPGRADES, UPGRADE_MAX_LEVEL } from '../config/upgrades'
import { save } from '../systems/SaveManager'
import { audio } from '../systems/AudioManager'
import { makeHeader, makePanel, makeCurrencyBar } from '../ui/helpers'

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('Upgrade')
  }

  create(): void {
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bgTile').setOrigin(0).setTint(0x6e5a44)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45)
    makeHeader(this, 'UPGRADES', () => this.scene.start('Menu'))
    makeCurrencyBar(this, save.profile.coins, save.profile.gems)

    UPGRADES.forEach((up, i) => {
      const y = 300 + i * 158
      const level = save.profile.upgrades[up.id]
      const cost = save.upgradeCost(up.id)
      const cx = GAME_WIDTH / 2

      makePanel(this, cx, y, 660, 140, 0x33241a)
      this.add.image(cx - 270, y, up.icon).setScale(0.85)
      this.add.text(cx - 210, y - 52, up.name, { fontFamily: FONT, fontSize: '26px', color: '#ffe9b0' })
      this.add.text(cx - 210, y - 16, up.desc, { fontFamily: FONT, fontSize: '17px', color: '#c9b89a' })
      this.add.text(cx - 210, y + 14, up.valueText(level), { fontFamily: FONT, fontSize: '17px', color: '#7dffea' })

      // level pips
      for (let p = 0; p < UPGRADE_MAX_LEVEL; p++) {
        this.add
          .rectangle(cx - 210 + p * 34, y + 48, 26, 12, p < level ? 0x7dff8a : 0x4a4038)
          .setOrigin(0, 0.5)
          .setStrokeStyle(2, 0x000000, 0.4)
      }

      // buy button / MAX
      if (cost === null) {
        this.add
          .text(cx + 240, y, 'MAX', { fontFamily: FONT, fontSize: '30px', color: '#7dff8a', stroke: '#000000', strokeThickness: 5 })
          .setOrigin(0.5)
      } else {
        const afford = save.profile.coins >= cost
        const btn = this.add.container(cx + 240, y)
        const bg = this.add
          .nineslice(0, 0, 'btn', undefined, 150, 86, 22, 22, 22, 22)
          .setTint(afford ? 0x43a047 : 0x5a5a5a)
        const ic = this.add.image(-36, -16, 'coin').setScale(0.42)
        const txt = this.add
          .text(10, -16, `${cost}`, { fontFamily: FONT, fontSize: '24px', color: afford ? '#ffffff' : '#9a9a9a' })
          .setOrigin(0.5)
        const lbl = this.add
          .text(0, 22, 'UPGRADE', { fontFamily: FONT, fontSize: '15px', color: afford ? '#d8ffd8' : '#9a9a9a' })
          .setOrigin(0.5)
        btn.add([bg, ic, txt, lbl])
        btn.setSize(150, 86)
        btn.setInteractive({ useHandCursor: true })
        btn.on('pointerdown', () => {
          audio.unlock()
          if (save.buyUpgrade(up.id)) {
            audio.play('powerup')
            this.scene.restart()
          } else {
            audio.play('click')
            this.cameras.main.shake(100, 0.004)
          }
        })
      }
    })
  }
}
