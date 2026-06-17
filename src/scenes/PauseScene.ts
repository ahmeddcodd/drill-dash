import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../config/constants'
import { makePanel, popIn } from '../ui/helpers'

/**
 * Minimal halt screen shown ONLY when YouTube fires the system pause event
 * (launched from main.ts onPause; stopped on onResume). The player has no way
 * to open it manually — in-game Home/Restart live in the HUD instead. It is
 * intentionally buttonless: YouTube owns resume.
 */
export class PauseScene extends Phaser.Scene {
  /** System pause halts the loop right after one frame — the panel must be
   *  fully visible on that frame, so the entrance animation is skipped. */
  private instant = false

  constructor() {
    super('Pause')
  }

  init(data?: { instant?: boolean }): void {
    this.instant = data?.instant ?? false
  }

  create(): void {
    const cx = GAME_WIDTH / 2
    const cy = GAME_HEIGHT / 2

    const panel = this.add.container(cx, cy).setDepth(10)
    panel.add(makePanel(this, 0, 0, 460, 240))
    panel.add(
      this.add
        .text(0, 0, 'PAUSED', {
          fontFamily: FONT, fontSize: '56px', color: '#ffe9b0', stroke: '#3a200b', strokeThickness: 10,
        })
        .setOrigin(0.5),
    )

    const dim = popIn(this, panel)
    if (this.instant) {
      this.tweens.killTweensOf([panel, dim])
      panel.setScale(1).setAlpha(1)
      dim.setAlpha(1)
    }
  }
}
