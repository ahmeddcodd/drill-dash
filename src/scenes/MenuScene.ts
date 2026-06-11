import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, FONT, DAILY_REWARDS } from '../config/constants'
import { getSkin } from '../config/skins'
import { save } from '../systems/SaveManager'
import { audio } from '../systems/AudioManager'
import { makeButton, makePanel, makeChip } from '../ui/helpers'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu')
  }

  create(): void {
    const cx = GAME_WIDTH / 2

    // tunnel backdrop: wall tile + a dark shaft running down the middle
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bgTile').setOrigin(0).setTint(0x8a623f)
    const shaft = this.add.graphics()
    shaft.fillStyle(0x1a0f08, 0.85)
    shaft.fillRect(cx - 130, 430, 260, GAME_HEIGHT - 430)
    shaft.fillStyle(0x000000, 0.35)
    shaft.fillRect(0, 0, GAME_WIDTH, 240)

    // title
    this.add
      .text(cx, 120, 'DRILL DASH', {
        fontFamily: FONT, fontSize: '84px', color: '#ffd84d', stroke: '#7a4410', strokeThickness: 14,
      })
      .setOrigin(0.5)
    this.add
      .text(cx, 196, 'GEM TUNNEL', {
        fontFamily: FONT, fontSize: '44px', color: '#7dffea', stroke: '#0e4a44', strokeThickness: 10,
      })
      .setOrigin(0.5)

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

    // ── menu buttons (§39) ────────────────────────────────────────────
    makeButton(this, cx, 660, 460, 120, 'PLAY', 0x43a047, () => this.startGame('endless'), 52)
    makeButton(this, cx, 790, 460, 96, 'LEVELS', 0x29b6f6, () => this.scene.start('LevelSelect'), 36)
    makeButton(this, cx, 900, 460, 96, 'UPGRADES', 0xffb300, () => this.scene.start('Upgrade'), 36)
    makeButton(this, cx - 120, 1010, 220, 90, 'SKINS', 0xab47bc, () => this.scene.start('Skins'), 30)
    makeButton(this, cx + 120, 1010, 220, 90, 'COLLECTION', 0x8d6e63, () => this.scene.start('Collection'), 24)

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
        fontFamily: FONT, fontSize: '22px', color: '#c9b89a',
      })
      .setOrigin(0.5)

    // audio boot + YT Playables ready signal
    audio.setMuted(save.profile.muted)
    this.input.once('pointerdown', () => {
      audio.unlock()
      audio.startMusic()
    })
    save.ytGameReady()

    // daily reward popup (§22) — a bonus, never a gate
    if (save.canClaimDaily()) {
      this.time.delayedCall(400, () => this.showDailyPopup())
    }
  }

  private startGame(mode: 'endless' | 'level', levelId?: number): void {
    audio.unlock()
    this.scene.start('Game', { mode, levelId })
  }

  private showDailyPopup(): void {
    const cx = GAME_WIDTH / 2
    const cy = GAME_HEIGHT / 2
    const blocker = this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive()
      .setDepth(100)

    const group: Phaser.GameObjects.GameObject[] = [blocker]
    const panel = makePanel(this, cx, cy, 520, 520).setDepth(101)
    group.push(panel)

    const nextDay = save.profile.daily.streak % 7 // day to be claimed (0-based)
    const reward = DAILY_REWARDS[nextDay]

    const title = this.add
      .text(cx, cy - 190, 'DAILY REWARD', {
        fontFamily: FONT, fontSize: '44px', color: '#ffe9b0', stroke: '#3a200b', strokeThickness: 9,
      })
      .setOrigin(0.5)
      .setDepth(102)
    const dayTxt = this.add
      .text(cx, cy - 120, `DAY ${nextDay + 1} of 7`, {
        fontFamily: FONT, fontSize: '28px', color: '#c9b89a',
      })
      .setOrigin(0.5)
      .setDepth(102)
    const rewardTxt = this.add
      .text(cx, cy - 30, reward.label, {
        fontFamily: FONT, fontSize: '48px', color: '#ffd84d', stroke: '#000000', strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(102)
    const note = this.add
      .text(cx, cy + 40, reward.shield || reward.magnet ? 'Boost auto-activates on your next run!' : '', {
        fontFamily: FONT, fontSize: '22px', color: '#7dc4ff',
      })
      .setOrigin(0.5)
      .setDepth(102)
    group.push(title, dayTxt, rewardTxt, note)

    const claimBtn = makeButton(this, cx, cy + 140, 320, 100, 'CLAIM', 0x43a047, () => {
      save.claimDaily()
      audio.play('chest')
      this.scene.restart() // refresh currency chips
    }, 40)
    claimBtn.setDepth(102)
    group.push(claimBtn)
  }
}
