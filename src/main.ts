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
  playables.bindSystem({
    onPause: () => {
      // cert MUST: pause ALL execution. If a run is live, surface the pause
      // overlay so resuming is graceful; scene ops apply on the next tick.
      const gameScene = game.scene.getScene('Game') as GameScene
      if (game.scene.isActive('Game') && gameScene.runActive && !game.scene.isActive('Pause')) {
        gameScene.scene.pause()
        gameScene.scene.launch('Pause')
      }
      save.flush() // cert SHOULD: save progress on pause
      audio.suspend()
      game.loop.sleep()
    },
    onResume: () => {
      game.loop.wake()
      audio.resume()
    },
    onAudioChange: (enabled) => audio.setSystemMuted(!enabled),
  })
})
