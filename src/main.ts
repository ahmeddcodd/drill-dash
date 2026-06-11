import './style.css'
import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './config/constants'
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
