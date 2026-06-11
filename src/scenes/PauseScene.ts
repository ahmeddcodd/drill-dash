import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../config/constants'
import { makeButton, makePanel } from '../ui/helpers'
import { save } from '../systems/SaveManager'
import { audio } from '../systems/AudioManager'
import type { GameScene } from './GameScene'

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause')
  }

  create(): void {
    // full-screen blocker so taps can't reach the (paused) game
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setInteractive()

    makePanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 480, 560)

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 210, 'PAUSED', {
        fontFamily: FONT, fontSize: '56px', color: '#ffe9b0', stroke: '#3a200b', strokeThickness: 10,
      })
      .setOrigin(0.5)

    const cx = GAME_WIDTH / 2
    makeButton(this, cx, GAME_HEIGHT / 2 - 90, 380, 96, 'RESUME', 0x43a047, () => {
      this.scene.stop()
      this.scene.resume('Game')
    })
    makeButton(this, cx, GAME_HEIGHT / 2 + 28, 380, 96, 'RESTART', 0xffb300, () => {
      const game = this.scene.get('Game') as GameScene
      const cfg = { mode: game.runCfg.mode, levelId: game.runCfg.levelId }
      this.scene.stop()
      this.scene.resume('Game')
      game.scene.restart(cfg)
    })
    makeButton(this, cx, GAME_HEIGHT / 2 + 146, 380, 96, 'HOME', 0x8d6e63, () => {
      this.scene.stop()
      this.scene.stop('Game')
      this.scene.start('Menu')
    })

    const muteLabel = () => (save.profile.muted ? 'SOUND: OFF' : 'SOUND: ON')
    const muteBtn = makeButton(this, cx, GAME_HEIGHT / 2 + 250, 300, 70, muteLabel(), 0x546e7a, () => {
      save.profile.muted = !save.profile.muted
      save.save()
      audio.setMuted(save.profile.muted)
      const txt = muteBtn.list[2] as Phaser.GameObjects.Text
      txt.setText(muteLabel())
    }, 26)
  }
}
