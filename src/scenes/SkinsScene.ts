import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, FONT } from '../config/constants'
import { SKINS } from '../config/skins'
import { TRAILS, trailEmitterConfig } from '../config/trails'
import { save } from '../systems/SaveManager'
import { audio } from '../systems/AudioManager'
import { makeHeader, makePanel, makeCurrencyBar, fadeIn, goTo, staggerIn } from '../ui/helpers'

type Tab = 'drills' | 'trails'

export class SkinsScene extends Phaser.Scene {
  private tab: Tab = 'drills'

  constructor() {
    super('Skins')
  }

  init(data: { tab?: Tab }): void {
    this.tab = data.tab ?? 'drills'
  }

  create(): void {
    fadeIn(this)
    this.data.set('navigating', false)
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bgTile').setOrigin(0).setTint(0x5e5a8f)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45)
    makeHeader(this, 'SKINS', () => goTo(this, 'Menu'))
    makeCurrencyBar(this, save.profile.coins, save.profile.gems)

    this.makeTabs()
    const cards = this.tab === 'drills' ? this.buildDrillCards() : this.buildTrailCards()
    staggerIn(this, cards, 35)

    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'vignette')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setAlpha(0.55)
      .setDepth(50)
  }

  private makeTabs(): void {
    const tabs: Array<{ id: Tab; label: string; x: number }> = [
      { id: 'drills', label: 'DRILLS', x: GAME_WIDTH / 2 - 110 },
      { id: 'trails', label: 'TRAILS', x: GAME_WIDTH / 2 + 110 },
    ]
    for (const t of tabs) {
      const active = this.tab === t.id
      const c = this.add.container(t.x, 242)
      const bg = this.add
        .nineslice(0, 0, 'btn', undefined, 200, 62, 22, 22, 22, 22)
        .setTint(active ? 0x7a4fbf : 0x3a3226)
      const txt = this.add
        .text(0, 0, t.label, {
          fontFamily: FONT, fontSize: '26px', color: active ? '#ffffff' : '#9a8d78',
          stroke: '#00000055', strokeThickness: 3,
        })
        .setOrigin(0.5)
      c.add([bg, txt])
      if (!active) {
        c.setSize(200, 62)
        c.setInteractive({ useHandCursor: true })
        c.on('pointerdown', () => {
          audio.unlock()
          audio.play('click')
          this.scene.restart({ tab: t.id })
        })
      }
    }
  }

  // ── drill skin cards ─────────────────────────────────────────────────
  private buildDrillCards(): Phaser.GameObjects.Container[] {
    const cards: Phaser.GameObjects.Container[] = []
    SKINS.forEach((skin, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = GAME_WIDTH / 2 + (col === 0 ? -170 : 170)
      const y = 350 + row * 184
      const owned = save.profile.skinsOwned.includes(skin.id)
      const equipped = save.profile.skinEquipped === skin.id

      const card = this.add.container(x, y)
      card.add(makePanel(this, 0, 0, 320, 168, equipped ? 0x2e4a2e : owned ? 0x3a3226 : 0x2c241c))
      if (equipped) {
        card.add(this.add.nineslice(0, 0, 'btn', undefined, 320, 168, 22, 22, 22, 22).setTint(0x7dff8a).setAlpha(0.18))
      }

      // mini drill preview (left side of the card)
      const preview = this.add.container(-105, -2).setScale(0.55)
      const bit = this.add.image(0, 44, 'drillBit').setTint(skin.bit)
      const body = this.add.image(0, -18, 'drillBody').setTint(skin.body)
      const win = this.add.image(0, -34, 'drillWindow')
      preview.add([bit, body, win])
      card.add(preview)
      if (!owned) preview.setAlpha(0.55)

      card.add(
        this.add
          .text(40, -42, skin.name, {
            fontFamily: FONT, fontSize: '20px', color: owned ? '#ffffff' : '#9a8d78',
            wordWrap: { width: 190 }, align: 'center',
          })
          .setOrigin(0.5),
      )
      card.add(
        this.add
          .text(40, 32, this.statusText(equipped, owned, skin.cost, skin.currency), {
            fontFamily: FONT, fontSize: '18px',
            color: this.statusColor(equipped, owned, skin.currency),
            wordWrap: { width: 190 }, align: 'center',
          })
          .setOrigin(0.5),
      )

      card.setSize(320, 168)
      card.setInteractive({ useHandCursor: true })
      card.on('pointerdown', () => {
        audio.unlock()
        if (equipped) return
        if (owned) {
          save.equipSkin(skin.id)
          audio.play('click')
          this.scene.restart({ tab: 'drills' })
        } else if (save.buySkin(skin.id, skin.cost, skin.currency)) {
          audio.play('chest')
          this.scene.restart({ tab: 'drills' })
        } else {
          audio.play('click')
          this.cameras.main.shake(100, 0.004)
        }
      })
      cards.push(card)
    })
    return cards
  }

  // ── trail cards ──────────────────────────────────────────────────────
  private buildTrailCards(): Phaser.GameObjects.Container[] {
    const cards: Phaser.GameObjects.Container[] = []
    TRAILS.forEach((trail, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = GAME_WIDTH / 2 + (col === 0 ? -170 : 170)
      const y = 350 + row * 184
      const owned = save.profile.trailsOwned.includes(trail.id)
      const equipped = save.profile.trailEquipped === trail.id

      const card = this.add.container(x, y)
      card.add(makePanel(this, 0, 0, 320, 168, equipped ? 0x2e4a2e : owned ? 0x3a3226 : 0x2c241c))
      if (equipped) {
        card.add(this.add.nineslice(0, 0, 'btn', undefined, 320, 168, 22, 22, 22, 22).setTint(0x7dff8a).setAlpha(0.18))
      }

      // icon: the trail's particle texture, big and tinted
      const icon = this.add.image(-105, -2, trail.texture).setScale(3).setTint(trail.tints[0])
      if (trail.texture === 'px') icon.setScale(4.5)
      if (trail.texture === 'glow') icon.setScale(1.7) // soft blob — keep it inside the card
      if (!owned) icon.setAlpha(0.5)
      card.add(icon)

      // live particle preview on the equipped card only
      if (equipped) {
        const emit = this.add.particles(0, 0, trail.texture, trailEmitterConfig(trail, trail.frequency * 3))
        emit.startFollow(card, -105, -20)
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => emit.destroy())
      }

      card.add(
        this.add
          .text(40, -42, trail.name, {
            fontFamily: FONT, fontSize: '20px', color: owned ? '#ffffff' : '#9a8d78',
            wordWrap: { width: 190 }, align: 'center',
          })
          .setOrigin(0.5),
      )
      card.add(
        this.add
          .text(40, 32, this.statusText(equipped, owned, trail.cost, trail.currency), {
            fontFamily: FONT, fontSize: '18px',
            color: this.statusColor(equipped, owned, trail.currency),
            wordWrap: { width: 190 }, align: 'center',
          })
          .setOrigin(0.5),
      )

      card.setSize(320, 168)
      card.setInteractive({ useHandCursor: true })
      card.on('pointerdown', () => {
        audio.unlock()
        if (equipped) return
        if (owned) {
          save.equipTrail(trail.id)
          audio.play('click')
          this.scene.restart({ tab: 'trails' })
        } else if (save.buyTrail(trail.id, trail.cost, trail.currency)) {
          audio.play('chest')
          this.scene.restart({ tab: 'trails' })
        } else {
          audio.play('click')
          this.cameras.main.shake(100, 0.004)
        }
      })
      cards.push(card)
    })
    return cards
  }

  private statusText(equipped: boolean, owned: boolean, cost: number, currency: string): string {
    if (equipped) return 'EQUIPPED'
    if (owned) return 'TAP TO EQUIP'
    return `${cost} ${currency.toUpperCase()}`
  }

  private statusColor(equipped: boolean, owned: boolean, currency: string): string {
    if (equipped) return '#7dff8a'
    if (owned) return '#aef3ff'
    return currency === 'gems' ? '#7dffea' : '#ffd84d'
  }
}
