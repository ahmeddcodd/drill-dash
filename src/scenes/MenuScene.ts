import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, FONT, DAILY_REWARDS } from '../config/constants'
import { getSkin } from '../config/skins'
import { getTrail, trailEmitterConfig } from '../config/trails'
import { save } from '../systems/SaveManager'
import { audio } from '../systems/AudioManager'
import { playables } from '../systems/Playables'
import { makeButton, makePanel, makeChip, fadeIn, goTo, popIn, staggerIn } from '../ui/helpers'

const SHAFT_W = 280
const SHAFT_TOP = 360

export class MenuScene extends Phaser.Scene {
  private bg!: Phaser.GameObjects.TileSprite

  constructor() {
    super('Menu')
  }

  create(): void {
    const cx = GAME_WIDTH / 2
    fadeIn(this)
    this.data.set('navigating', false)

    // ── backdrop: drifting wall + the mine entrance ───────────────────
    this.bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bgTile').setOrigin(0).setTint(0x8a623f)
    this.add.rectangle(cx, 130, GAME_WIDTH, 260, 0x000000, 0.35)
    this.drawShaft(cx)

    // gems twinkling down in the dark of the shaft
    this.add.particles(0, 0, 'spark', {
      x: { min: cx - SHAFT_W / 2 + 30, max: cx + SHAFT_W / 2 - 30 },
      y: { min: 640, max: GAME_HEIGHT - 60 },
      lifespan: 1400,
      speed: 0,
      scale: { start: 0, end: 0.9 },
      alpha: { start: 0.9, end: 0 },
      tint: [0x4fc3f7, 0x66e07a, 0xb066ff, 0xffd84d],
      frequency: 420,
    })

    // faint dust motes drifting down over everything
    this.add.particles(0, 0, 'px', {
      x: { min: 20, max: GAME_WIDTH - 20 },
      y: -10,
      lifespan: 9000,
      speedY: { min: 18, max: 45 },
      speedX: { min: -8, max: 8 },
      scale: { min: 0.3, max: 0.8 },
      alpha: { start: 0.22, end: 0 },
      tint: [0xc8a06c, 0x8a623f],
      frequency: 350,
    })

    // ── title with flanking gems + shine sweep ────────────────────────
    const title = this.add
      .text(cx, 110, 'DRILL DASH', {
        fontFamily: FONT, fontSize: '86px', color: '#ffd84d', stroke: '#7a4410', strokeThickness: 14,
      })
      .setOrigin(0.5)
    const subtitle = this.add
      .text(cx, 188, 'GEM TUNNEL', {
        fontFamily: FONT, fontSize: '44px', color: '#7dffea', stroke: '#0e4a44', strokeThickness: 10,
      })
      .setOrigin(0.5)
    const gemL = this.add.image(cx - 295, 105, 'gemGreen').setScale(0.9).setAngle(-14)
    const gemR = this.add.image(cx + 295, 105, 'gemPurple').setScale(0.9).setAngle(14)
    this.tweens.add({ targets: [title, subtitle], y: '+=6', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.tweens.add({ targets: [gemL, gemR], y: '+=10', duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    const shine = this.add
      .image(cx - 280, 110, 'glow')
      .setScale(2.6, 1.4)
      .setTint(0xffffff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
    this.time.addEvent({
      delay: 3800, loop: true, startAt: 3000,
      callback: () => {
        shine.setX(cx - 280).setAlpha(0.5)
        this.tweens.add({ targets: shine, x: cx + 280, alpha: 0, duration: 700, ease: 'Quad.easeIn' })
      },
    })

    // ── currency chips + best-depth ribbon ────────────────────────────
    makeChip(this, cx - 150, 252, 'coin', `${save.profile.coins}`, 0x4a3208)
    makeChip(this, cx + 150, 252, 'gemGreen', `${save.profile.gems}`, 0x103a2a)

    const ribbon = this.add.container(cx, 315)
    ribbon.add(this.add.nineslice(0, 0, 'btn', undefined, 380, 54, 22, 22, 22, 22).setTint(0x2b1c10).setAlpha(0.92))
    ribbon.add(this.add.nineslice(0, 0, 'btn', undefined, 380, 54, 22, 22, 22, 22).setTint(0xffd84d).setAlpha(0.14))
    ribbon.add(this.add.image(-150, 0, 'spark').setScale(1.2).setTint(0xffd84d))
    ribbon.add(this.add.image(150, 0, 'spark').setScale(1.2).setTint(0xffd84d))
    ribbon.add(
      this.add
        .text(0, 0, `BEST DEPTH  ${save.profile.bestDepth}m`, {
          fontFamily: FONT, fontSize: '26px', color: '#ffe9b0', stroke: '#000000', strokeThickness: 4,
        })
        .setOrigin(0.5),
    )

    // ── the hero drill, parked at the entrance ────────────────────────
    const skin = getSkin(save.profile.skinEquipped)
    this.add.image(cx, 480, 'glow').setScale(5.5).setTint(0xffc66a).setAlpha(0.22)

    const drill = this.add.container(cx, 470).setScale(1.22)
    const finL = this.add.image(-46, -8, 'drillFin').setTint(skin.body)
    const finR = this.add.image(46, -8, 'drillFin').setFlipX(true).setTint(skin.body)
    const bit = this.add.image(0, 44, 'drillBit').setTint(skin.bit)
    const body = this.add.image(0, -18, 'drillBody').setTint(skin.body)
    const win = this.add.image(0, -34, 'drillWindow')
    const pupL = this.add.image(-9, -34, 'pupil')
    const pupR = this.add.image(9, -34, 'pupil')
    drill.add([finL, finR, bit, body, win, pupL, pupR])
    this.time.addEvent({
      delay: 2600, loop: true,
      callback: () => this.tweens.add({ targets: [pupL, pupR], scaleY: 0.12, duration: 70, yoyo: true }),
    })
    this.tweens.add({ targets: drill, y: 482, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.time.addEvent({
      delay: 60, loop: true,
      callback: () => bit.setFlipX(!bit.flipX),
    })

    // equipped trail spraying from the bit
    const trail = getTrail(save.profile.trailEquipped)
    const trailEmit = this.add.particles(0, 0, trail.texture, trailEmitterConfig(trail, trail.frequency * 1.6))
    trailEmit.startFollow(drill, 0, 80)

    // ── menu buttons with icons — stagger in, PLAY pulses ─────────────
    const playBtn = makeButton(this, cx, 700, 470, 118, 'PLAY', 0x43a047, () => this.startGame('endless'), { fontSize: 52, pulse: true })
    const levelsBtn = makeButton(this, cx, 828, 470, 94, 'LEVELS', 0x29b6f6, () => goTo(this, 'LevelSelect'), { fontSize: 34, icon: 'chest', iconScale: 0.42 })
    const upgradesBtn = makeButton(this, cx, 936, 470, 94, 'UPGRADES', 0xffb300, () => goTo(this, 'Upgrade'), { fontSize: 34, icon: 'coin', iconScale: 0.62 })
    const skinsBtn = makeButton(this, cx - 120, 1042, 226, 88, 'SKINS', 0xab47bc, () => goTo(this, 'Skins'), { fontSize: 28, icon: 'gemPurple', iconScale: 0.55 })
    const collectionBtn = makeButton(this, cx + 120, 1042, 226, 88, 'COLLECTION', 0x8d6e63, () => goTo(this, 'Collection'), { fontSize: 20, icon: 'fosBone', iconScale: 0.5 })
    staggerIn(this, [playBtn, levelsBtn, upgradesBtn, skinsBtn, collectionBtn], 55)

    // mute toggle — hidden inside YouTube Playables (YouTube's own mute governs)
    if (!playables.active) {
      const muteLabel = () => (save.profile.muted ? 'SOUND OFF' : 'SOUND ON')
      const muteBtn = makeButton(this, cx, 1140, 260, 60, muteLabel(), 0x546e7a, () => {
        save.profile.muted = !save.profile.muted
        save.save()
        audio.setMuted(save.profile.muted)
        ;(muteBtn.list[2] as Phaser.GameObjects.Text).setText(muteLabel())
      }, 22)
    }

    const hint = this.add
      .text(cx, 1222, 'Move or tap left / right to steer the drill', {
        fontFamily: FONT, fontSize: '20px', color: '#c9b89a',
      })
      .setOrigin(0.5)
    this.tweens.add({ targets: hint, alpha: 0.45, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    // soft vignette over everything
    this.add.image(cx, GAME_HEIGHT / 2, 'vignette').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.7).setDepth(50)

    // audio boot + YT Playables ready signal
    audio.setMuted(save.profile.muted)
    audio.setMusicIntensity(0)
    this.input.once('pointerdown', () => {
      audio.unlock()
      audio.startMusic()
    })
    playables.gameReady()

    // daily reward popup (§22) — a bonus, never a gate
    if (save.canClaimDaily()) {
      this.time.delayedCall(500, () => this.showDailyPopup())
    }
  }

  /** The mine entrance: jagged-edged shaft with wooden support beams. */
  private drawShaft(cx: number): void {
    const left = cx - SHAFT_W / 2
    const right = cx + SHAFT_W / 2

    const g = this.add.graphics()
    // jagged-edged dark shaft
    g.fillStyle(0x140b06, 0.92)
    g.beginPath()
    g.moveTo(left, SHAFT_TOP)
    for (let y = SHAFT_TOP; y < GAME_HEIGHT; y += 70) {
      g.lineTo(left + ((y / 70) % 2 === 0 ? 10 : -6), y + 70)
    }
    g.lineTo(left, GAME_HEIGHT)
    g.lineTo(right, GAME_HEIGHT)
    for (let y = GAME_HEIGHT; y > SHAFT_TOP; y -= 70) {
      g.lineTo(right + ((y / 70) % 2 === 0 ? -10 : 6), y - 70)
    }
    g.closePath()
    g.fillPath()

    // depth gets darker: stack translucent bands toward the bottom
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0x000000, 0.12)
      g.fillRect(left - 10, 640 + i * 110, SHAFT_W + 20, GAME_HEIGHT)
    }

    // wooden support frame around the entrance
    const wood = 0x7a5230
    const woodDark = 0x4a3019
    g.fillStyle(woodDark, 1)
    g.fillRect(left - 30, SHAFT_TOP - 6, 26, 230)
    g.fillRect(right + 4, SHAFT_TOP - 6, 26, 230)
    g.fillRect(left - 44, SHAFT_TOP - 34, SHAFT_W + 88, 30)
    g.fillStyle(wood, 1)
    g.fillRect(left - 26, SHAFT_TOP - 10, 18, 226)
    g.fillRect(right + 8, SHAFT_TOP - 10, 18, 226)
    g.fillRect(left - 40, SHAFT_TOP - 38, SHAFT_W + 80, 24)
    // bolts on the crossbeam
    g.fillStyle(0xc9a55a, 1)
    g.fillCircle(left - 24, SHAFT_TOP - 26, 4)
    g.fillCircle(cx, SHAFT_TOP - 26, 4)
    g.fillCircle(right + 24, SHAFT_TOP - 26, 4)
  }

  update(): void {
    this.bg.tilePositionY += 0.18
  }

  private startGame(mode: 'endless' | 'level', levelId?: number): void {
    audio.unlock()
    goTo(this, 'Game', { mode, levelId })
  }

  private showDailyPopup(): void {
    const cx = GAME_WIDTH / 2
    const cy = GAME_HEIGHT / 2

    const nextDay = save.profile.daily.streak % 7 // day to be claimed (0-based)
    const reward = DAILY_REWARDS[nextDay]

    // everything lives in one container so it can pop in as a unit
    const panel = this.add.container(cx, cy).setDepth(101)
    panel.add(makePanel(this, 0, 0, 520, 520))
    panel.add(
      this.add.text(0, -190, 'DAILY REWARD', {
        fontFamily: FONT, fontSize: '44px', color: '#ffe9b0', stroke: '#3a200b', strokeThickness: 9,
      }).setOrigin(0.5),
    )
    panel.add(
      this.add.text(0, -120, `DAY ${nextDay + 1} of 7`, {
        fontFamily: FONT, fontSize: '28px', color: '#c9b89a',
      }).setOrigin(0.5),
    )
    panel.add(
      this.add.text(0, -30, reward.label, {
        fontFamily: FONT, fontSize: '48px', color: '#ffd84d', stroke: '#000000', strokeThickness: 8,
      }).setOrigin(0.5),
    )
    panel.add(
      this.add.text(0, 40, reward.shield || reward.magnet ? 'Boost auto-activates on your next run!' : '', {
        fontFamily: FONT, fontSize: '20px', color: '#7dc4ff',
      }).setOrigin(0.5),
    )
    panel.add(
      makeButton(this, 0, 140, 320, 100, 'CLAIM', 0x43a047, () => {
        save.claimDaily()
        audio.play('chest')
        this.scene.restart() // refresh currency chips
      }, { fontSize: 40, pulse: true }),
    )

    popIn(this, panel, 0.6)
  }
}
