import './style.css'
import fontUrl from '@fontsource/fredoka-one/files/fredoka-one-latin-400-normal.woff2?url'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './config/constants'
import { playables } from './systems/Playables'
import { save } from './systems/SaveManager'
import { audio } from './systems/AudioManager'
import { BootScene } from './scenes/BootScene'
import { MenuScene } from './scenes/MenuScene'
import { GameScene } from './scenes/GameScene'
import { UIScene } from './scenes/UIScene'
import { PauseScene } from './scenes/PauseScene'
import { GameOverScene } from './scenes/GameOverScene'
import { LevelSelectScene } from './scenes/LevelSelectScene'
import { UpgradeScene } from './scenes/UpgradeScene'
import { SkinsScene } from './scenes/SkinsScene'
import { CollectionScene } from './scenes/CollectionScene'

// Load the bundled game font BEFORE booting Phaser so no text ever rasterizes
// with the fallback font. If loading fails or stalls (>2s), boot anyway —
// Arial Black remains in the font stack.
async function loadFont(): Promise<void> {
  try {
    const font = new FontFace('Fredoka One', `url(${fontUrl}) format('woff2')`)
    await Promise.race([
      font.load().then((f) => document.fonts.add(f)),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ])
  } catch {
    // fall back to system font
  }
}

void loadFont().then(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#160f0b',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [
      BootScene,
      MenuScene,
      GameScene,
      UIScene,
      PauseScene,
      GameOverScene,
      LevelSelectScene,
      UpgradeScene,
      SkinsScene,
      CollectionScene,
    ],
  })

  // dev/debug handle (also used by scripts/smoke.mjs)
  ;(window as unknown as { __DRILL_DASH__?: Phaser.Game }).__DRILL_DASH__ = game

  // ── YouTube Playables system integration (no-ops outside the env) ──────
  window.addEventListener('error', () => playables.logError())
  audio.setSystemMuted(!playables.isAudioEnabled())
  const haltLoop = () => game.loop.sleep()
  playables.bindSystem({
    onPause: () => {
      // cert MUST: pause ALL execution — but the pause screen has to actually
      // be ON screen when everything halts. Queue the overlay (instant, no
      // entrance animation), let exactly one frame process + render it, then
      // put the loop to sleep right after that render.
      const gameScene = game.scene.getScene('Game') as GameScene
      if (game.scene.isActive('Game') && gameScene.runActive && !game.scene.isActive('Pause')) {
        gameScene.scene.pause()
        gameScene.scene.launch('Pause', { instant: true })
      }
      save.flush() // cert SHOULD: save progress on pause
      audio.suspend()
      game.events.once(Phaser.Core.Events.POST_RENDER, haltLoop)
    },
    onResume: () => {
      game.events.off(Phaser.Core.Events.POST_RENDER, haltLoop)
      game.loop.wake()
      audio.resume()
    },
    onAudioChange: (enabled) => audio.setSystemMuted(!enabled),
  })
})
