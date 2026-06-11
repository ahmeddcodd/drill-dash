import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../config/constants'
import { LEVELS } from '../config/levels'
import { save } from '../systems/SaveManager'
import { audio } from '../systems/AudioManager'
import { makeHeader, makePanel } from '../ui/helpers'

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect')
  }

  create(): void {
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bgTile').setOrigin(0).setTint(0x76695c)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45)
    makeHeader(this, 'LEVELS', () => this.scene.start('Menu'))

    const unlocked = save.profile.levelsCompleted + 1

    LEVELS.forEach((lvl, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = GAME_WIDTH / 2 + (col === 0 ? -170 : 170)
      const y = 280 + row * 196
      const done = lvl.id <= save.profile.levelsCompleted
      const locked = lvl.id > unlocked

      const card = this.add.container(x, y)
      const panel = makePanel(this, 0, 0, 320, 172, locked ? 0x3a322a : done ? 0x2e4a2e : 0x4a3208)
      const num = this.add
        .text(-130, -56, `${lvl.id}`, {
          fontFamily: FONT, fontSize: '44px', color: locked ? '#7a7268' : '#ffd84d', stroke: '#000000', strokeThickness: 6,
        })
        .setOrigin(0.5)
      const name = this.add
        .text(14, -56, locked ? 'LOCKED' : lvl.name, {
          fontFamily: FONT, fontSize: '24px', color: locked ? '#7a7268' : '#ffffff',
        })
        .setOrigin(0.5)
      const desc = this.add
        .text(0, 6, locked ? '???' : lvl.desc, {
          fontFamily: FONT, fontSize: '20px', color: locked ? '#6a6258' : '#c9b89a',
          wordWrap: { width: 290 }, align: 'center',
        })
        .setOrigin(0.5)
      const status = this.add
        .text(0, 56, done ? 'COMPLETE ✓' : locked ? '' : `REWARD: ${lvl.reward} COINS`, {
          fontFamily: FONT, fontSize: '20px', color: done ? '#7dff8a' : '#ffd84d',
        })
        .setOrigin(0.5)
      card.add([panel, num, name, desc, status])

      if (!locked) {
        card.setSize(320, 172)
        card.setInteractive({ useHandCursor: true })
        card.on('pointerdown', () => {
          audio.unlock()
          audio.play('click')
          this.scene.start('Game', { mode: 'level', levelId: lvl.id })
        })
      }
    })
  }
}
