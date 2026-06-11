import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../config/constants'
import { LEVELS } from '../config/levels'
import { makeButton, makePanel } from '../ui/helpers'
import type { GameScene, RunSummary } from './GameScene'

/**
 * Run-summary overlay (§38). Doubles as the Level Complete screen.
 * Retry is the biggest button — the game lives on its retry loop.
 */
export class GameOverScene extends Phaser.Scene {
  private summary!: RunSummary

  constructor() {
    super('GameOver')
  }

  init(data: RunSummary): void {
    this.summary = data
  }

  create(): void {
    const s = this.summary
    const cx = GAME_WIDTH / 2

    this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setInteractive()

    makePanel(this, cx, GAME_HEIGHT / 2, 560, 860)

    const title = s.won ? 'LEVEL COMPLETE!' : 'GAME OVER'
    const titleColor = s.won ? '#7dff8a' : '#ff5e2b'
    const titleTxt = this.add
      .text(cx, GAME_HEIGHT / 2 - 360, title, {
        fontFamily: FONT, fontSize: '54px', color: titleColor, stroke: '#000000', strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setScale(0.3)
      .setAlpha(0)
    this.tweens.add({ targets: titleTxt, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' })

    // depth headline
    this.add
      .text(cx, GAME_HEIGHT / 2 - 270, `${s.depth}m`, {
        fontFamily: FONT, fontSize: '88px', color: '#ffffff', stroke: '#000000', strokeThickness: 10,
      })
      .setOrigin(0.5)

    if (s.newRecord) {
      const stamp = this.add
        .text(cx + 170, GAME_HEIGHT / 2 - 320, 'NEW\nRECORD!', {
          fontFamily: FONT, fontSize: '30px', color: '#ffd84d', stroke: '#b3541e', strokeThickness: 7, align: 'center',
        })
        .setOrigin(0.5)
        .setAngle(14)
        .setScale(0)
      this.tweens.add({ targets: stamp, scale: 1.1, duration: 350, delay: 350, ease: 'Back.easeOut' })
    }

    // stat rows
    const rows: Array<[string, string, string]> = [
      ['BEST DEPTH', `${s.best}m`, '#ffd84d'],
      ['SCORE', '0', '#ffffff'],
      ['COINS EARNED', `+${s.coins}`, '#ffd84d'],
      ['GEMS', `+${s.gems}`, '#7dffea'],
      ['BEST COMBO', `${s.bestCombo}`, '#ffe06a'],
    ]
    if (s.won && s.reward > 0) rows.splice(2, 0, ['LEVEL REWARD', `+${s.reward} coins`, '#7dff8a'])
    if (s.newFossils.length > 0) rows.push(['NEW FOSSIL', s.newFossils.join(', '), '#ffe9b0'])

    let y = GAME_HEIGHT / 2 - 190
    let scoreTxt: Phaser.GameObjects.Text | null = null
    for (const [label, value, color] of rows) {
      this.add.text(cx - 240, y, label, {
        fontFamily: FONT, fontSize: '26px', color: '#c9b89a',
      })
      const v = this.add
        .text(cx + 240, y, value, { fontFamily: FONT, fontSize: '26px', color })
        .setOrigin(1, 0)
      if (label === 'SCORE') scoreTxt = v
      y += 52
    }

    // score count-up (§25)
    if (scoreTxt) {
      const target = s.score
      this.tweens.addCounter({
        from: 0, to: target, duration: 800, delay: 250,
        onUpdate: (tw) => scoreTxt.setText(`${Math.floor(tw.getValue() ?? 0)}`),
      })
    }

    // ── buttons ───────────────────────────────────────────────────────
    const nextExists = s.won && s.levelId !== undefined && LEVELS.some((l) => l.id === (s.levelId ?? 0) + 1)
    const mainLabel = s.won ? (nextExists ? 'NEXT LEVEL' : 'PLAY ENDLESS') : 'RETRY'
    const mainColor = s.won ? 0x29b6f6 : 0x43a047

    makeButton(this, cx, GAME_HEIGHT / 2 + 190, 460, 120, mainLabel, mainColor, () => {
      const game = this.scene.get('Game') as GameScene
      this.scene.stop()
      if (s.won && nextExists) {
        game.scene.restart({ mode: 'level', levelId: (s.levelId ?? 0) + 1 })
      } else if (s.won && !nextExists) {
        game.scene.restart({ mode: 'endless' })
      } else {
        game.scene.restart({ mode: s.mode, levelId: s.levelId })
      }
    }, 44)

    makeButton(this, cx - 120, GAME_HEIGHT / 2 + 320, 220, 86, 'UPGRADES', 0xffb300, () => {
      this.scene.stop()
      this.scene.stop('Game')
      this.scene.start('Upgrade')
    }, 26)

    makeButton(this, cx + 120, GAME_HEIGHT / 2 + 320, 220, 86, 'HOME', 0x8d6e63, () => {
      this.scene.stop()
      this.scene.stop('Game')
      this.scene.start('Menu')
    }, 26)

    // retry also available on a quick tap anywhere after a moment (fast restart, §8)
    if (!s.won) {
      this.time.delayedCall(900, () => {
        this.input.keyboard?.once('keydown-SPACE', () => {
          const game = this.scene.get('Game') as GameScene
          this.scene.stop()
          game.scene.restart({ mode: s.mode, levelId: s.levelId })
        })
      })
    }
  }
}
