import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../config/constants'
import { LEVELS } from '../config/levels'
import { makeButton, makePanel, staggerIn } from '../ui/helpers'
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
    const cy = GAME_HEIGHT / 2

    const dim = this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setAlpha(0)
      .setInteractive()
    this.tweens.add({ targets: dim, alpha: 1, duration: 200 })

    // the whole summary lives in one container that slides up into place
    const panel = this.add.container(cx, cy + 36).setAlpha(0)
    this.tweens.add({ targets: panel, y: cy, alpha: 1, duration: 280, ease: 'Cubic.easeOut' })

    panel.add(makePanel(this, 0, 0, 560, 860))

    const title = s.won ? 'LEVEL COMPLETE!' : 'GAME OVER'
    const titleColor = s.won ? '#7dff8a' : '#ff5e2b'
    const titleTxt = this.add
      .text(0, -360, title, {
        fontFamily: FONT, fontSize: '54px', color: titleColor, stroke: '#000000', strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setScale(0.3)
    panel.add(titleTxt)
    this.tweens.add({ targets: titleTxt, scale: 1, duration: 320, delay: 120, ease: 'Back.easeOut' })

    // depth headline
    panel.add(
      this.add
        .text(0, -270, `${s.depth}m`, {
          fontFamily: FONT, fontSize: '88px', color: '#ffffff', stroke: '#000000', strokeThickness: 10,
        })
        .setOrigin(0.5),
    )

    if (s.newRecord) {
      const stamp = this.add
        .text(170, -320, 'NEW\nRECORD!', {
          fontFamily: FONT, fontSize: '30px', color: '#ffd84d', stroke: '#b3541e', strokeThickness: 7, align: 'center',
        })
        .setOrigin(0.5)
        .setAngle(14)
        .setScale(0)
      panel.add(stamp)
      this.tweens.add({ targets: stamp, scale: 1.1, duration: 350, delay: 450, ease: 'Back.easeOut' })
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
    if (s.newFossils.length > 0) {
      // a single name fits the row; several would overflow — show a count instead
      const fossilText = s.newFossils.length === 1 ? s.newFossils[0] : `${s.newFossils.length} new fossils!`
      rows.push(['NEW FOSSIL', fossilText, '#ffe9b0'])
    }

    const burst = this.add.particles(0, 0, 'spark', {
      speed: { min: 60, max: 220 }, scale: { start: 1, end: 0 }, lifespan: 450,
      tint: [0xffd84d, 0xfff3b0], emitting: false,
    }).setDepth(5)

    let y = -190
    let scoreTxt: Phaser.GameObjects.Text | null = null
    let rowIndex = 0
    for (const [label, value, color] of rows) {
      const labelTxt = this.add.text(-240, y, label, { fontFamily: FONT, fontSize: '26px', color: '#c9b89a' })
      const v = this.add
        .text(240, y, value, { fontFamily: FONT, fontSize: '26px', color })
        .setOrigin(1, 0)
      panel.add(labelTxt)
      panel.add(v)
      if (label === 'SCORE') scoreTxt = v

      // cascade the rows in, left and right halves sliding together
      const delay = 220 + rowIndex * 70
      labelTxt.setAlpha(0).setX(-264)
      v.setAlpha(0).setX(264)
      this.tweens.add({ targets: labelTxt, alpha: 1, x: -240, duration: 200, delay, ease: 'Cubic.easeOut' })
      this.tweens.add({ targets: v, alpha: 1, x: 240, duration: 200, delay, ease: 'Cubic.easeOut' })
      if (label === 'COINS EARNED' && s.coins > 0) {
        const burstY = cy + y + 14
        this.time.delayedCall(delay + 120, () => burst.explode(10, cx + 180, burstY))
      }
      y += 52
      rowIndex++
    }

    // score count-up (§25)
    if (scoreTxt) {
      const target = s.score
      const txt = scoreTxt
      this.tweens.addCounter({
        from: 0, to: target, duration: 800, delay: 350,
        onUpdate: (tw) => txt.setText(`${Math.floor(tw.getValue() ?? 0)}`),
      })
    }

    // ── buttons (stagger in after the panel lands) ────────────────────
    const nextExists = s.won && s.levelId !== undefined && LEVELS.some((l) => l.id === (s.levelId ?? 0) + 1)
    const mainLabel = s.won ? (nextExists ? 'NEXT LEVEL' : 'PLAY ENDLESS') : 'RETRY'
    const mainColor = s.won ? 0x29b6f6 : 0x43a047

    const mainBtn = makeButton(this, cx, cy + 190, 460, 120, mainLabel, mainColor, () => {
      const game = this.scene.get('Game') as GameScene
      this.scene.stop()
      if (s.won && nextExists) {
        game.scene.restart({ mode: 'level', levelId: (s.levelId ?? 0) + 1 })
      } else if (s.won && !nextExists) {
        game.scene.restart({ mode: 'endless' })
      } else {
        game.scene.restart({ mode: s.mode, levelId: s.levelId })
      }
    }, { fontSize: 44, pulse: true })

    const upgradesBtn = makeButton(this, cx - 120, cy + 320, 220, 86, 'UPGRADES', 0xffb300, () => {
      this.scene.stop()
      this.scene.stop('Game')
      this.scene.start('Upgrade')
    }, 26)

    const homeBtn = makeButton(this, cx + 120, cy + 320, 220, 86, 'HOME', 0x8d6e63, () => {
      this.scene.stop()
      this.scene.stop('Game')
      this.scene.start('Menu')
    }, 26)

    staggerIn(this, [mainBtn, upgradesBtn, homeBtn], 70)

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
