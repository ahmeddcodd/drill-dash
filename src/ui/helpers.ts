import Phaser from 'phaser'
import { FONT, GAME_WIDTH } from '../config/constants'
import { audio } from '../systems/AudioManager'

/** Big rounded tap-friendly button with a drop shadow and press animation. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  bg: number,
  onClick: () => void,
  fontSize = 34,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y)
  const shadow = scene.add.nineslice(0, 6, 'btn', undefined, w, h, 22, 22, 22, 22).setTint(0x000000).setAlpha(0.3)
  const face = scene.add.nineslice(0, 0, 'btn', undefined, w, h, 22, 22, 22, 22).setTint(bg)
  const txt = scene.add
    .text(0, 0, label, {
      fontFamily: FONT,
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      stroke: '#00000055',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
  c.add([shadow, face, txt])
  c.setSize(w, h)
  c.setInteractive({ useHandCursor: true })
  c.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
    event.stopPropagation() // keep taps from reaching gameplay scenes below
    scene.tweens.add({ targets: c, scale: 0.93, duration: 60, yoyo: true })
    audio.unlock()
    audio.play('click')
    scene.time.delayedCall(80, onClick)
  })
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
  scene.add
    .text(GAME_WIDTH / 2, 86, title, {
      fontFamily: FONT,
      fontSize: '52px',
      color: '#ffe9b0',
      stroke: '#3a200b',
      strokeThickness: 10,
    })
    .setOrigin(0.5)
  makeButton(scene, 78, 86, 110, 74, '<', 0x8d6e63, onBack, 40)
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
