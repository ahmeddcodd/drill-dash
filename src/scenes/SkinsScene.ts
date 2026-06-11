import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../config/constants'
import { SKINS } from '../config/skins'
import { save } from '../systems/SaveManager'
import { audio } from '../systems/AudioManager'
import { makeHeader, makePanel, makeCurrencyBar } from '../ui/helpers'

export class SkinsScene extends Phaser.Scene {
  constructor() {
    super('Skins')
  }

  create(): void {
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bgTile').setOrigin(0).setTint(0x5e5a8f)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45)
    makeHeader(this, 'SKINS', () => this.scene.start('Menu'))
    makeCurrencyBar(this, save.profile.coins, save.profile.gems)

    SKINS.forEach((skin, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = GAME_WIDTH / 2 + (col === 0 ? -170 : 170)
      const y = 320 + row * 200
      const owned = save.profile.skinsOwned.includes(skin.id)
      const equipped = save.profile.skinEquipped === skin.id

      const card = this.add.container(x, y)
      const panel = makePanel(this, 0, 0, 320, 180, equipped ? 0x2e4a2e : owned ? 0x3a3226 : 0x2c241c)
      card.add(panel)
      if (equipped) {
        card.add(this.add.nineslice(0, 0, 'btn', undefined, 320, 180, 22, 22, 22, 22).setTint(0x7dff8a).setAlpha(0.18))
      }

      // mini drill preview
      const preview = this.add.container(-90, -4).setScale(0.62)
      const bit = this.add.image(0, 44, 'drillBit').setTint(skin.bit)
      const body = this.add.image(0, -18, 'drillBody').setTint(skin.body)
      const win = this.add.image(0, -34, 'drillWindow')
      preview.add([bit, body, win])
      card.add(preview)
      if (!owned) preview.setAlpha(0.55)

      card.add(
        this.add
          .text(50, -50, skin.name, { fontFamily: FONT, fontSize: '21px', color: owned ? '#ffffff' : '#9a8d78', wordWrap: { width: 190 } })
          .setOrigin(0, 0.5),
      )

      let statusStr: string
      let statusColor: string
      if (equipped) {
        statusStr = 'EQUIPPED'
        statusColor = '#7dff8a'
      } else if (owned) {
        statusStr = 'TAP TO EQUIP'
        statusColor = '#aef3ff'
      } else {
        statusStr = `${skin.cost} ${skin.currency.toUpperCase()}`
        statusColor = skin.currency === 'gems' ? '#7dffea' : '#ffd84d'
      }
      card.add(
        this.add
          .text(50, 20, statusStr, { fontFamily: FONT, fontSize: '20px', color: statusColor })
          .setOrigin(0, 0.5),
      )

      card.setSize(320, 180)
      card.setInteractive({ useHandCursor: true })
      card.on('pointerdown', () => {
        audio.unlock()
        if (equipped) return
        if (owned) {
          save.equipSkin(skin.id)
          audio.play('click')
          this.scene.restart()
        } else if (save.buySkin(skin.id, skin.cost, skin.currency)) {
          audio.play('chest')
          this.scene.restart()
        } else {
          audio.play('click')
          this.cameras.main.shake(100, 0.004)
        }
      })
    })
  }
}
