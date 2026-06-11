import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../config/constants'
import { makeButton, makePanel, popIn } from '../ui/helpers'
import { save } from '../systems/SaveManager'
import { audio } from '../systems/AudioManager'
import type { GameScene } from './GameScene'

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause')
  }

  create(): void {
    const cx = GAME_WIDTH / 2
    const cy = GAME_HEIGHT / 2

    const panel = this.add.container(cx, cy).setDepth(10)
    panel.add(makePanel(this, 0, 0, 480, 560))
    panel.add(
      this.add
        .text(0, -210, 'PAUSED', {
          fontFamily: FONT, fontSize: '56px', color: '#ffe9b0', stroke: '#3a200b', strokeThickness: 10,
        })
        .setOrigin(0.5),
    )

    panel.add(
      makeButton(this, 0, -90, 380, 96, 'RESUME', 0x43a047, () => {
        this.scene.stop()
        this.scene.resume('Game')
      }),
    )
    panel.add(
      makeButton(this, 0, 28, 380, 96, 'RESTART', 0xffb300, () => {
        const game = this.scene.get('Game') as GameScene
        const cfg = { mode: game.runCfg.mode, levelId: game.runCfg.levelId }
        this.scene.stop()
        this.scene.resume('Game')
        game.scene.restart(cfg)
      }),
    )
    panel.add(
      makeButton(this, 0, 146, 380, 96, 'HOME', 0x8d6e63, () => {
        this.scene.stop()
        this.scene.stop('Game')
        this.scene.start('Menu')
      }),
    )

    const muteLabel = () => (save.profile.muted ? 'SOUND: OFF' : 'SOUND: ON')
    const muteBtn = makeButton(this, 0, 250, 300, 70, muteLabel(), 0x546e7a, () => {
      save.profile.muted = !save.profile.muted
      save.save()
      audio.setMuted(save.profile.muted)
      const txt = muteBtn.list[2] as Phaser.GameObjects.Text
      txt.setText(muteLabel())
    }, 26)
    panel.add(muteBtn)

    popIn(this, panel)
  }
}
