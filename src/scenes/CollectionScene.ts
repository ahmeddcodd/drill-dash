import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../config/constants'
import { FOSSILS, RARITY_COLORS } from '../config/fossils'
import { save } from '../systems/SaveManager'
import { makeHeader, makePanel, fadeIn, goTo, staggerIn } from '../ui/helpers'

/** The fossil collection book (§21) — found items in colour, the rest as silhouettes. */
export class CollectionScene extends Phaser.Scene {
  constructor() {
    super('Collection')
  }

  create(): void {
    fadeIn(this)
    this.data.set('navigating', false)
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bgTile').setOrigin(0).setTint(0x59313a)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45)
    makeHeader(this, 'COLLECTION', () => goTo(this, 'Menu'))

    const found = save.profile.fossilsFound
    this.add
      .text(GAME_WIDTH / 2, 170, `${found.length} / ${FOSSILS.length} DISCOVERED`, {
        fontFamily: FONT, fontSize: '28px', color: '#ffe9b0', stroke: '#000000', strokeThickness: 5,
      })
      .setOrigin(0.5)

    const cards: Phaser.GameObjects.Container[] = []
    FOSSILS.forEach((fossil, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = GAME_WIDTH / 2 + (col - 1) * 226
      const y = 320 + row * 248
      const isFound = found.includes(fossil.id)

      const card = this.add.container(x, y)
      card.add(makePanel(this, 0, 0, 206, 224, 0x2c2018))
      card.add(
        this.add
          .nineslice(0, 0, 'btn', undefined, 206, 224, 22, 22, 22, 22)
          .setTint(RARITY_COLORS[fossil.rarity])
          .setAlpha(isFound ? 0.22 : 0.08),
      )

      const icon = this.add.image(0, -46, fossil.texture).setScale(1.5)
      if (isFound) icon.setTint(fossil.tint)
      else icon.setTintFill(0x191310)
      card.add(icon)

      card.add(
        this.add
          .text(0, 38, isFound ? fossil.name : '? ? ?', {
            fontFamily: FONT, fontSize: '19px', color: isFound ? '#ffffff' : '#6a5d50',
            wordWrap: { width: 190 }, align: 'center',
          })
          .setOrigin(0.5, 0),
      )
      card.add(
        this.add
          .text(0, 86, fossil.rarity.toUpperCase(), {
            fontFamily: FONT, fontSize: '15px',
            color: `#${RARITY_COLORS[fossil.rarity].toString(16).padStart(6, '0')}`,
          })
          .setOrigin(0.5, 0),
      )
      cards.push(card)
    })

    staggerIn(this, cards, 30)
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'vignette')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setAlpha(0.55)
      .setDepth(50)
  }
}
