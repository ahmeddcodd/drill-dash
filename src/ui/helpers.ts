import Phaser from 'phaser'
import { FONT, GAME_WIDTH, GAME_HEIGHT, SAFE_MARGIN } from '../config/constants'
import { audio } from '../systems/AudioManager'

export interface ButtonOptions {
  fontSize?: number
  /** Gentle attention pulse for primary CTAs (PLAY / RETRY / CLAIM). */
  pulse?: boolean
  /** Optional icon texture shown left of the label. */
  icon?: string
  iconScale?: number
  /** Center the icon (for icon-only buttons with no label). */
  iconCenter?: boolean
}

/**
 * Big rounded tap-friendly button. Pressing physically pushes the face down
 * into its (stationary) shadow; desktop pointers get a slight hover grow.
 */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  bg: number,
  onClick: () => void,
  fontSizeOrOpts: number | ButtonOptions = 34,
): Phaser.GameObjects.Container {
  const opts: ButtonOptions = typeof fontSizeOrOpts === 'number' ? { fontSize: fontSizeOrOpts } : fontSizeOrOpts
  const fontSize = opts.fontSize ?? 34

  const c = scene.add.container(x, y)
  const shadow = scene.add.nineslice(0, 6, 'btn', undefined, w, h, 22, 22, 22, 22).setTint(0x000000).setAlpha(0.3)
  const face = scene.add.nineslice(0, 0, 'btn', undefined, w, h, 22, 22, 22, 22).setTint(bg)
  const txt = scene.add
    .text(opts.icon ? 18 : 0, 0, label, {
      fontFamily: FONT,
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      stroke: '#00000055',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
  c.add([shadow, face, txt])
  const pressed: Array<Phaser.GameObjects.Image | Phaser.GameObjects.Text | Phaser.GameObjects.NineSlice> = [face, txt]
  if (opts.icon) {
    const iconX = opts.iconCenter ? 0 : -w / 2 + 48
    const icon = scene.add.image(iconX, 0, opts.icon).setScale(opts.iconScale ?? 0.5)
    c.add(icon)
    pressed.push(icon)
  }
  c.setSize(w, h)
  c.setInteractive({ useHandCursor: true })

  const release = () => {
    scene.tweens.add({ targets: pressed, y: 0, duration: 70, ease: 'Quad.easeOut' })
  }

  c.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
    event.stopPropagation() // keep taps from reaching gameplay scenes below
    // press the face + label (+ icon) down into the shadow
    for (const part of pressed) part.y = 5
    audio.unlock()
    audio.play('click')
    scene.time.delayedCall(90, onClick)
  })
  c.on('pointerup', release)
  c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.04, duration: 90 }))
  c.on('pointerout', () => {
    release()
    scene.tweens.add({ targets: c, scale: 1, duration: 90 })
  })

  if (opts.pulse) {
    scene.tweens.add({
      targets: c, scale: 1.04, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    })
  }
  return c
}

/** Dark rounded panel. */
export function makePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color = 0x2b1c10,
  alpha = 0.96,
): Phaser.GameObjects.NineSlice {
  return scene.add.nineslice(x, y, 'btn', undefined, w, h, 22, 22, 22, 22).setTint(color).setAlpha(alpha)
}

/** Standard meta-scene header with title and a back button. */
export function makeHeader(scene: Phaser.Scene, title: string, onBack: () => void): void {
  const titleTxt = scene.add
    .text(GAME_WIDTH / 2, 86, title, {
      fontFamily: FONT,
      fontSize: '52px',
      color: '#ffe9b0',
      stroke: '#3a200b',
      strokeThickness: 10,
    })
    .setOrigin(0.5)
    .setScale(0.8)
    .setAlpha(0)
  scene.tweens.add({ targets: titleTxt, scale: 1, alpha: 1, duration: 250, ease: 'Back.easeOut' })
  // back button held inside the ENVELOP crop margin on tall phones
  makeButton(scene, SAFE_MARGIN + 42, 86, 110, 74, '<', 0x8d6e63, onBack, 40)
}

/** Coin + gem balance chips shown on meta screens. */
export function makeCurrencyBar(scene: Phaser.Scene, coins: number, gems: number): void {
  const y = 170
  makeChip(scene, GAME_WIDTH / 2 - 150, y, 'coin', `${coins}`, 0x4a3208)
  makeChip(scene, GAME_WIDTH / 2 + 150, y, 'gemGreen', `${gems}`, 0x103a2a)
}

export function makeChip(scene: Phaser.Scene, x: number, y: number, icon: string, text: string, bg: number): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y)
  const panel = scene.add.nineslice(0, 0, 'btn', undefined, 240, 58, 22, 22, 22, 22).setTint(bg).setAlpha(0.9)
  const ic = scene.add.image(-86, 0, icon).setScale(0.62)
  const txt = scene.add
    .text(8, 0, text, { fontFamily: FONT, fontSize: '30px', color: '#ffffff' })
    .setOrigin(0.5)
  c.add([panel, ic, txt])
  return c
}

// ── scene transitions ─────────────────────────────────────────────────────

/** Quick camera fade-in; call at the top of create() in full-screen scenes. */
export function fadeIn(scene: Phaser.Scene, duration = 200): void {
  scene.cameras.main.fadeIn(duration, 0, 0, 0)
}

/**
 * Fade out then start another scene. Guards against double-taps starting two
 * transitions at once.
 */
export function goTo(scene: Phaser.Scene, key: string, data?: object): void {
  const cam = scene.cameras.main
  if (scene.data.get('navigating')) return
  scene.data.set('navigating', true)
  cam.fadeOut(150, 0, 0, 0)
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(key, data)
  })
}

// ── entrance motion ───────────────────────────────────────────────────────

/** Cards/rows drop-fade into place one after another. */
export function staggerIn(
  scene: Phaser.Scene,
  items: Array<Phaser.GameObjects.Container | Phaser.GameObjects.Text>,
  stepDelay = 40,
): void {
  items.forEach((item, i) => {
    const targetY = item.y
    item.setAlpha(0)
    item.y = targetY + 18
    scene.tweens.add({
      targets: item, y: targetY, alpha: 1,
      duration: 240, delay: i * stepDelay, ease: 'Cubic.easeOut',
    })
  })
}

/**
 * A Yes/No confirmation overlay that does NOT pause the scene it lives in —
 * the game keeps running underneath. Built inside the calling (HUD) scene at a
 * high depth. `scene.data` flag prevents stacking multiple dialogs.
 */
export function confirmDialog(
  scene: Phaser.Scene,
  message: string,
  onYes: () => void,
): void {
  if (scene.data.get('confirmOpen')) return
  scene.data.set('confirmOpen', true)

  const cx = GAME_WIDTH / 2
  const cy = GAME_HEIGHT / 2
  const items: Phaser.GameObjects.GameObject[] = []

  const dim = scene.add
    .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
    .setDepth(200)
    .setInteractive()
  items.push(dim)

  const panel = scene.add.container(cx, cy).setDepth(201).setScale(0.85).setAlpha(0)
  panel.add(makePanel(scene, 0, 0, 480, 300))
  panel.add(
    scene.add
      .text(0, -80, message, {
        fontFamily: FONT, fontSize: '36px', color: '#ffe9b0',
        stroke: '#3a200b', strokeThickness: 8, align: 'center', wordWrap: { width: 420 },
      })
      .setOrigin(0.5),
  )
  items.push(panel)

  const close = () => {
    for (const it of items) it.destroy()
    scene.data.set('confirmOpen', false)
  }

  panel.add(
    makeButton(scene, -110, 50, 200, 92, 'YES', 0x43a047, () => {
      close()
      onYes()
    }, 34),
  )
  panel.add(
    makeButton(scene, 110, 50, 200, 92, 'NO', 0x8d6e63, close, 34),
  )

  // tapping the dim outside the panel also cancels
  dim.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
    e.stopPropagation()
    close()
  })

  scene.tweens.add({ targets: dim, alpha: { from: 0, to: 1 }, duration: 150 })
  scene.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' })
}

/**
 * Overlay popup entrance: dim rect fades in while the panel container pops.
 * Returns the dim rectangle (already interactive, blocking input below).
 */
export function popIn(
  scene: Phaser.Scene,
  panel: Phaser.GameObjects.Container,
  dimAlpha = 0.55,
): Phaser.GameObjects.Rectangle {
  const dim = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, dimAlpha)
    .setAlpha(0)
    .setInteractive()
  dim.setDepth(panel.depth - 1)
  scene.tweens.add({ targets: dim, alpha: 1, duration: 180 })
  panel.setScale(0.85).setAlpha(0)
  scene.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' })
  return dim
}
