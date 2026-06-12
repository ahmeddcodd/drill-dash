import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, FONT, DAILY_REWARDS } from '../config/constants'
import { getSkin } from '../config/skins'
import { getTrail, trailEmitterConfig } from '../config/trails'
import { save } from '../systems/SaveManager'
import { audio } from '../systems/AudioManager'
import { makeButton, makePanel, makeChip, fadeIn, goTo, popIn, staggerIn } from '../ui/helpers'

export class MenuScene extends Phaser.Scene {
  private bg!: Phaser.GameObjects.TileSprite

  constructor() {
    super('Menu')
  }

  create(): void {
    const cx = GAME_WIDTH / 2
    fadeIn(this)
    this.data.set('navigating', false)

    // tunnel backdrop: slowly drifting wall tile + a dark shaft down the middle
    this.bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bgTile').setOrigin(0).setTint(0x8a623f)
    const shaft = this.add.graphics()
    shaft.fillStyle(0x1a0f08, 0.85)
    shaft.fillRect(cx - 130, 430, 260, GAME_HEIGHT - 430)
    shaft.fillStyle(0x000000, 0.35)
    shaft.fillRect(0, 0, GAME_WIDTH, 240)

    // faint dust motes drifting down the shaft
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

    // title: floats gently, with a shine streak sweeping across
    const title = this.add
      .text(cx, 120, 'DRILL DASH', {
        fontFamily: FONT, fontSize: '84px', color: '#ffd84d', stroke: '#7a4410', strokeThickness: 14,
      })
      .setOrigin(0.5)
    const subtitle = this.add
      .text(cx, 196, 'GEM TUNNEL', {
        fontFamily: FONT, fontSize: '44px', color: '#7dffea', stroke: '#0e4a44', strokeThickness: 10,
      })
      .setOrigin(0.5)
    this.tweens.add({ targets: [title, subtitle], y: '+=6', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    const shine = this.add
      .image(cx - 280, 120, 'glow')
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

    // currency + best depth
    makeChip(this, cx - 150, 270, 'coin', `${save.profile.coins}`, 0x4a3208)
    makeChip(this, cx + 150, 270, 'gemGreen', `${save.profile.gems}`, 0x103a2a)
    this.add
      .text(cx, 330, `BEST DEPTH: ${save.profile.bestDepth}m`, {
        fontFamily: FONT, fontSize: '28px', color: '#ffe9b0', stroke: '#000000', strokeThickness: 5,
      })
      .setOrigin(0.5)

    // the drill, parked at the mine entrance (§39)
    const drill = this.add.container(cx, 480)
    const skin = getSkin(save.profile.skinEquipped)
    const finL = this.add.image(-46, -8, 'drillFin').setTint(skin.body)
    const finR = this.add.image(46, -8, 'drillFin').setFlipX(true).setTint(skin.body)
    const bit = this.add.image(0, 44, 'drillBit').setTint(skin.bit)
    const body = this.add.image(0, -18, 'drillBody').setTint(skin.body)
    const win = this.add.image(0, -34, 'drillWindow')
    drill.add([finL, finR, bit, body, win])
    this.tweens.add({ targets: drill, y: 492, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.time.addEvent({
      delay: 60, loop: true,
      callback: () => bit.setFlipX(!bit.flipX),
    })

    // show the equipped trail under the parked drill
    const trail = getTrail(save.profile.trailEquipped)
    const trailEmit = this.add.particles(0, 0, trail.texture, trailEmitterConfig(trail, trail.frequency * 2.5))
    trailEmit.startFollow(drill, 0, 64)

    // ── menu buttons (§39) — stagger in, PLAY pulses ──────────────────
    const playBtn = makeButton(this, cx, 660, 460, 120, 'PLAY', 0x43a047, () => this.startGame('endless'), { fontSize: 52, pulse: true })
    const levelsBtn = makeButton(this, cx, 790, 460, 96, 'LEVELS', 0x29b6f6, () => goTo(this, 'LevelSelect'), 36)
    const upgradesBtn = makeButton(this, cx, 900, 460, 96, 'UPGRADES', 0xffb300, () => goTo(this, 'Upgrade'), 36)
    const skinsBtn = makeButton(this, cx - 120, 1010, 220, 90, 'SKINS', 0xab47bc, () => goTo(this, 'Skins'), 30)
    const collectionBtn = makeButton(this, cx + 120, 1010, 220, 90, 'COLLECTION', 0x8d6e63, () => goTo(this, 'Collection'), 22)
    staggerIn(this, [playBtn, levelsBtn, upgradesBtn, skinsBtn, collectionBtn], 55)

    // mute toggle
    const muteLabel = () => (save.profile.muted ? 'SOUND OFF' : 'SOUND ON')
    const muteBtn = makeButton(this, cx, 1120, 260, 64, muteLabel(), 0x546e7a, () => {
      save.profile.muted = !save.profile.muted
      save.save()
      audio.setMuted(save.profile.muted)
      ;(muteBtn.list[2] as Phaser.GameObjects.Text).setText(muteLabel())
    }, 24)

    this.add
      .text(cx, 1220, 'Tap left / right side of the tunnel to steer', {
        fontFamily: FONT, fontSize: '20px', color: '#c9b89a',
      })
      .setOrigin(0.5)

    // soft vignette over everything
    this.add.image(cx, GAME_HEIGHT / 2, 'vignette').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.7).setDepth(50)

    // audio boot + YT Playables ready signal
    audio.setMuted(save.profile.muted)
    this.input.once('pointerdown', () => {
      audio.unlock()
      audio.startMusic()
    })
    save.ytGameReady()

    // daily reward popup (§22) — a bonus, never a gate
    if (save.canClaimDaily()) {
      this.time.delayedCall(500, () => this.showDailyPopup())
    }
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
