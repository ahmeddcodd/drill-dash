import Phaser from 'phaser'
import {
  GAME_WIDTH, GAME_HEIGHT, LANES, LANE_WIDTH, ROW_SPACING, DRILL_Y, PX_PER_METER, laneX,
  BASE_SCROLL_SPEED, SPEED_STEP_PER_100M, MAX_SPEED_MULT, SPEED_LINES_MULT,
  FUEL_DRAIN_PER_SEC, FUEL_DRAIN_PER_300M, FUEL_CAN_RESTORE, ROCK_FUEL_PENALTY,
  SCORE_VALUES, COIN_PICKUP_COINS, GOLD_BLOCK_COINS, CHEST_COINS, COMBO_TIERS,
  POWER_BASE_DURATION, POWER_WEIGHTS, POWER_LABELS, POWER_ICONS,
  MAGNET_BASE_RADIUS, SLOW_TIME_FACTOR, FUEL_BOOST_AMOUNT, MAGNETIC_KINDS,
  ZONES, zoneIndexForDepth, FONT,
} from '../config/constants'
import type { Kind, PowerType } from '../config/constants'
import { getLevel } from '../config/levels'
import type { LevelDef } from '../config/levels'
import { getSkin } from '../config/skins'
import { FOSSILS, fossilsByRarity, rarityWeightsForDepth, RARITY_ORDER } from '../config/fossils'
import type { FossilDef } from '../config/fossils'
import type { DerivedStats } from '../config/upgrades'
import { save } from '../systems/SaveManager'
import { audio } from '../systems/AudioManager'
import { Spawner } from '../systems/Spawner'
import { Drill } from '../objects/Drill'

export interface RunConfig {
  mode: 'endless' | 'level'
  levelId?: number
}

export interface RunSummary {
  mode: 'endless' | 'level'
  levelId?: number
  won: boolean
  reason: 'destroyed' | 'fuel' | 'goal'
  depth: number
  best: number
  newRecord: boolean
  coins: number
  gems: number
  newFossils: string[]
  bestCombo: number
  score: number
  reward: number
}

interface Ent {
  spr: Phaser.GameObjects.Image
  kind: Kind
  lane: number
  worldY: number
  alive: boolean
  power: PowerType | null
  pullX: number
  pullY: number
  bobPhase: number
}

const SPAWN_BASE = GAME_HEIGHT + 100

export class GameScene extends Phaser.Scene {
  runCfg: RunConfig = { mode: 'endless' }
  level: LevelDef | null = null
  stats!: DerivedStats

  private drill!: Drill
  private spawner!: Spawner
  private ents: Ent[] = []
  private pool: Phaser.GameObjects.Image[] = []
  private nextRow = 0

  // run state (read by UIScene)
  scrolled = 0
  depthM = 0
  fuel = 100
  maxFuel = 100
  hp = 3
  maxHp = 3
  coinsRun = 0
  gemsRun = 0
  score = 0
  comboCount = 0
  comboMult = 1
  bestCombo = 0
  runActive = false
  activePowers = new Map<PowerType, number>()

  private ended = false
  private speedFactor = 1
  private coinPickups = 0
  private gemPickups = 0
  private fuelCans = 0
  private chests = 0
  private fossilsRun = 0
  private newFossilNames: string[] = []
  private goalDone = false
  private zoneIdx = -1

  private bg!: Phaser.GameObjects.TileSprite
  private dirtEmit!: Phaser.GameObjects.Particles.ParticleEmitter
  private sparkEmit!: Phaser.GameObjects.Particles.ParticleEmitter
  private smokeEmit!: Phaser.GameObjects.Particles.ParticleEmitter
  private boomEmit!: Phaser.GameObjects.Particles.ParticleEmitter
  private dustEmit!: Phaser.GameObjects.Particles.ParticleEmitter
  private speedEmit!: Phaser.GameObjects.Particles.ParticleEmitter

  constructor() {
    super('Game')
  }

  init(data: Partial<RunConfig>): void {
    this.runCfg = { mode: data.mode ?? 'endless', levelId: data.levelId }
    this.level = this.runCfg.mode === 'level' ? getLevel(this.runCfg.levelId ?? 1) ?? null : null
  }

  create(): void {
    // ── reset run state ───────────────────────────────────────────────
    this.stats = save.stats()
    this.ents = []
    this.pool = []
    this.nextRow = 0
    this.scrolled = 0
    this.depthM = 0
    this.maxFuel = this.stats.startFuel
    this.fuel = this.maxFuel
    this.maxHp = this.stats.maxHp
    this.hp = this.maxHp
    this.coinsRun = 0
    this.gemsRun = 0
    this.score = 0
    this.comboCount = 0
    this.comboMult = 1
    this.bestCombo = 0
    this.coinPickups = 0
    this.gemPickups = 0
    this.fuelCans = 0
    this.chests = 0
    this.fossilsRun = 0
    this.newFossilNames = []
    this.goalDone = false
    this.ended = false
    this.runActive = true
    this.speedFactor = 1
    this.activePowers = new Map()
    this.zoneIdx = -1

    // ── world ─────────────────────────────────────────────────────────
    this.cameras.main.fadeIn(200, 0, 0, 0)
    const startZone = this.level ? 0 : zoneIndexForDepth(0)
    this.bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bgTile').setOrigin(0).setTint(ZONES[startZone].tileTint).setDepth(0)
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'vignette')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setAlpha(0.4)
      .setDepth(75)

    const laneLines = this.add.graphics().setDepth(1)
    laneLines.lineStyle(3, 0x000000, 0.1)
    for (let l = 1; l < LANES; l++) {
      laneLines.lineBetween(l * LANE_WIDTH, 0, l * LANE_WIDTH, GAME_HEIGHT)
    }

    this.createEmitters()

    const startLane = Math.floor(LANES / 2)
    this.drill = new Drill(this, startLane, DRILL_Y)
    this.drill.applySkin(getSkin(save.profile.skinEquipped))
    this.drill.setDamageVisual(this.hp, this.maxHp)
    this.dustEmit.startFollow(this.drill, 0, 64)
    this.smokeEmit.startFollow(this.drill, 0, -40)

    this.spawner = new Spawner(this.level, startLane)
    while (SPAWN_BASE + this.nextRow * ROW_SPACING < this.scrolled + GAME_HEIGHT + ROW_SPACING * 2) {
      this.spawnRow()
    }

    // ── input: tap left / right half (touch + mouse), arrows for desktop ─
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.unlock()
      if (!this.runActive) return
      audio.startDrill()
      this.drill.tryMove(p.x < GAME_WIDTH / 2 ? -1 : 1)
    })
    this.input.keyboard?.on('keydown-LEFT', () => this.runActive && this.drill.tryMove(-1))
    this.input.keyboard?.on('keydown-RIGHT', () => this.runActive && this.drill.tryMove(1))
    this.input.keyboard?.on('keydown-A', () => this.runActive && this.drill.tryMove(-1))
    this.input.keyboard?.on('keydown-D', () => this.runActive && this.drill.tryMove(1))

    // ── HUD overlay ───────────────────────────────────────────────────
    if (this.scene.isActive('UI') || this.scene.isPaused('UI')) this.scene.stop('UI')
    this.scene.launch('UI')

    // daily boosts auto-activate (§22)
    if (save.profile.boosts.shield > 0) {
      save.profile.boosts.shield--
      save.save()
      this.activatePower('shield', true)
      this.banner('DAILY BOOST: SHIELD!', '#6fd8ff')
    }
    if (save.profile.boosts.magnet > 0) {
      save.profile.boosts.magnet--
      save.save()
      this.activatePower('magnet', true)
    }

    if (this.level) {
      this.banner(`${this.level.name}\n${this.level.desc}`, '#ffe9b0')
    }

    audio.unlock()
    audio.startDrill()
    audio.startMusic()

    this.events.on(Phaser.Scenes.Events.PAUSE, () => audio.stopDrill())
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      if (this.runActive) audio.startDrill()
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      audio.stopDrill()
      this.events.off(Phaser.Scenes.Events.PAUSE)
      this.events.off(Phaser.Scenes.Events.RESUME)
      for (const key of ['UI', 'Pause', 'GameOver']) {
        if (this.scene.isActive(key) || this.scene.isPaused(key)) this.scene.stop(key)
      }
    })
  }

  private createEmitters(): void {
    this.dirtEmit = this.add.particles(0, 0, 'px', {
      speed: { min: 80, max: 260 }, angle: { min: 230, max: 310 },
      scale: { start: 1.5, end: 0 }, lifespan: 480, gravityY: 600,
      tint: [0x8b5a2b, 0x6e4520, 0xa9743c], emitting: false,
    }).setDepth(60)
    this.sparkEmit = this.add.particles(0, 0, 'spark', {
      speed: { min: 60, max: 240 }, scale: { start: 1.1, end: 0 }, lifespan: 500,
      tint: [0xffffff, 0xffe28a], emitting: false,
    }).setDepth(60)
    this.smokeEmit = this.add.particles(0, 0, 'glow', {
      speedY: { min: -120, max: -60 }, speedX: { min: -30, max: 30 },
      scale: { start: 0.7, end: 1.6 }, alpha: { start: 0.5, end: 0 },
      lifespan: 700, tint: 0x444444, frequency: 90, emitting: false,
    }).setDepth(55)
    this.boomEmit = this.add.particles(0, 0, 'glow', {
      speed: { min: 40, max: 320 }, scale: { start: 1.6, end: 0 },
      lifespan: 450, tint: [0xff5e2b, 0xffd166, 0xffffff], blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).setDepth(62)
    this.dustEmit = this.add.particles(0, 0, 'px', {
      speed: { min: 100, max: 240 }, angle: { min: 245, max: 295 },
      scale: { start: 1.1, end: 0 }, lifespan: 420, gravityY: 500,
      tint: [0x8b5a2b, 0x6e4520], frequency: 45,
    }).setDepth(45)
    this.speedEmit = this.add.particles(0, 0, 'px', {
      x: { min: 10, max: GAME_WIDTH - 10 }, y: GAME_HEIGHT + 20,
      speedY: { min: -1600, max: -1100 }, speedX: 0,
      scaleX: 0.4, scaleY: { min: 6, max: 12 }, alpha: { start: 0.14, end: 0 },
      lifespan: 800, frequency: 70, tint: 0xffffff, emitting: false,
    }).setDepth(70)
  }

  // ──────────────────────────────────────────────────────────────────────
  update(time: number, dtMs: number): void {
    const dt = Math.min(dtMs, 50) / 1000

    if (this.ended) {
      // gentle wind-down so the world doesn't freeze instantly
      this.speedFactor = Math.max(0, this.speedFactor - dt * 1.4)
    }

    const speedMult = Math.min(MAX_SPEED_MULT, 1 + SPEED_STEP_PER_100M * Math.floor(this.depthM / 100))
    const slow = this.activePowers.has('slowTime') ? SLOW_TIME_FACTOR : 1
    const speed = BASE_SCROLL_SPEED * speedMult * slow * this.speedFactor

    this.scrolled += speed * dt
    if (!this.ended) this.depthM = this.scrolled / PX_PER_METER
    this.bg.tilePositionY = this.scrolled
    this.speedEmit.emitting = this.runActive && speedMult >= SPEED_LINES_MULT
    audio.setDrillIntensity(Math.min(1, speedMult - 0.8))

    if (this.runActive) {
      this.drainFuel(dt)
      this.tickPowers(dt)
      this.drill.spinUpdate(time)
      this.checkZone()
      this.checkDepthGoals()
      this.score += SCORE_VALUES.meter * speed * dt / PX_PER_METER
    }

    this.updateEntities(time, dt)

    while (SPAWN_BASE + this.nextRow * ROW_SPACING < this.scrolled + GAME_HEIGHT + ROW_SPACING * 2) {
      this.spawnRow()
    }
  }

  private drainFuel(dt: number): void {
    const depthExtra = (this.depthM / 300) * FUEL_DRAIN_PER_300M
    this.fuel -= (FUEL_DRAIN_PER_SEC + depthExtra) * this.stats.fuelDrainMult * dt
    if (this.fuel <= 0) {
      this.fuel = 0
      this.banner('OUT OF FUEL!', '#ff8c42')
      this.endRun(false, 'fuel')
    }
  }

  private tickPowers(dt: number): void {
    for (const [type, remaining] of this.activePowers) {
      const left = remaining - dt
      if (left <= 0) {
        this.activePowers.delete(type)
        if (type === 'mega') this.drill.setMega(false)
        if (type === 'shield') this.drill.setShield(false)
      } else {
        this.activePowers.set(type, left)
      }
    }
  }

  private checkZone(): void {
    if (this.level) return // levels keep their own fixed look
    const idx = zoneIndexForDepth(this.depthM)
    if (idx !== this.zoneIdx) {
      const prev = this.zoneIdx
      this.zoneIdx = idx
      const zone = ZONES[idx]
      if (prev >= 0) {
        this.banner(zone.name, `#${zone.accent.toString(16).padStart(6, '0')}`)
        const from = Phaser.Display.Color.ValueToColor(ZONES[prev].tileTint)
        const to = Phaser.Display.Color.ValueToColor(zone.tileTint)
        this.tweens.addCounter({
          from: 0, to: 100, duration: 900,
          onUpdate: (tw) => {
            const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, tw.getValue() ?? 0)
            this.bg.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b))
          },
        })
      }
    }
  }

  private checkDepthGoals(): void {
    if (!this.level || this.goalDone) return
    const { goalType, target, hpMin } = this.level
    if ((goalType === 'depth' || goalType === 'wall') && this.depthM >= target) {
      this.winLevel()
    } else if (goalType === 'depthHp' && this.depthM >= target) {
      if (this.hp >= (hpMin ?? 1)) this.winLevel()
      else {
        this.banner(`NEEDED ${hpMin} HEALTH!`, '#ff4d6d')
        this.endRun(false, 'goal')
      }
    }
  }

  private checkCountGoals(): void {
    if (!this.level || this.goalDone) return
    const { goalType, target } = this.level
    const progress: Partial<Record<string, number>> = {
      coins: this.coinPickups, gems: this.gemPickups, fuel: this.fuelCans,
      fossil: this.fossilsRun, chest: this.chests,
    }
    const value = progress[goalType]
    if (value !== undefined && value >= target) this.winLevel()
  }

  private winLevel(): void {
    if (this.goalDone) return
    this.goalDone = true
    audio.play('win')
    this.banner('LEVEL COMPLETE!', '#7dff8a')
    this.sparkEmit.explode(40, GAME_WIDTH / 2, DRILL_Y)
    this.endRun(true, 'goal')
  }

  /** Text shown in the HUD for the current level goal. */
  goalHud(): string | null {
    if (!this.level) return null
    const { goalType, target } = this.level
    switch (goalType) {
      case 'depth': return `GOAL: ${Math.min(Math.floor(this.depthM), target)}/${target}m`
      case 'depthHp': return `GOAL: ${Math.min(Math.floor(this.depthM), target)}/${target}m  (keep ${this.level.hpMin}+ HP)`
      case 'wall': return `GOAL: break the wall!  ${Math.min(Math.floor(this.depthM), target)}/${target}m`
      case 'coins': return `GOAL: coins ${this.coinPickups}/${target}`
      case 'gems': return `GOAL: gems ${this.gemPickups}/${target}`
      case 'fuel': return `GOAL: fuel cans ${this.fuelCans}/${target}`
      case 'fossil': return `GOAL: fossils ${this.fossilsRun}/${target}`
      case 'chest': return `GOAL: chests ${this.chests}/${target}`
    }
  }

  // ── entities ───────────────────────────────────────────────────────────
  private spawnRow(): void {
    const rowIdx = this.nextRow++
    const worldY = SPAWN_BASE + rowIdx * ROW_SPACING
    const depthAtRow = Math.max(0, (worldY - DRILL_Y) / PX_PER_METER)
    const { kinds, forcedPower } = this.spawner.generateRow(rowIdx, depthAtRow)

    for (let lane = 0; lane < LANES; lane++) {
      const kind = kinds[lane]
      if (kind === 'empty') continue
      const power = kind === 'power' ? (forcedPower[lane] ?? this.rollPower()) : null
      this.addEnt(kind, lane, worldY, power)
    }
  }

  private rollPower(): PowerType {
    let total = 0
    for (const p of POWER_WEIGHTS) total += p.w
    let roll = Math.random() * total
    for (const p of POWER_WEIGHTS) {
      roll -= p.w
      if (roll <= 0) return p.type
    }
    return 'shield'
  }

  private textureFor(kind: Kind, power: PowerType | null): string {
    switch (kind) {
      case 'coin': return 'coin'
      case 'gem': return Math.random() < 0.5 ? 'gemBlue' : 'gemGreen'
      case 'rareGem': return Math.random() < 0.5 ? 'gemPurple' : 'gemRed'
      case 'fuel': return 'fuelcan'
      case 'chest': return 'chest'
      case 'fossil': return ['fosBone', 'fosShell', 'fosSkull', 'fosEgg'][Math.floor(Math.random() * 4)]
      case 'power': return POWER_ICONS[power ?? 'shield']
      default: return kind
    }
  }

  private addEnt(kind: Kind, lane: number, worldY: number, power: PowerType | null): void {
    const spr = this.pool.pop() ?? this.add.image(0, 0, 'dirt')
    spr.setTexture(this.textureFor(kind, power))
    // Position BEFORE becoming visible: a recycled sprite still sits where it
    // was consumed (usually right on the drill), and updateEntities only moves
    // it next frame — without this it renders one frame at the drill position.
    spr.setPosition(laneX(lane), worldY - this.scrolled)
    spr.setActive(true).setVisible(true).setAlpha(1).setAngle(0).setScale(1)
    spr.clearTint()
    const isBlock = kind === 'dirt' || kind === 'gold' || kind === 'rock' || kind === 'lava' || kind === 'bomb' || kind === 'mystery' || kind === 'bossRock'
    spr.setDepth(isBlock ? 20 : 30)
    if (kind === 'dirt') spr.setTint(Phaser.Math.RND.pick([0xffffff, 0xf2e3d0, 0xe8d4be]))
    if (kind === 'fossil') spr.setTint(0xd8cdb4).setScale(1.15)
    if (kind === 'bomb') {
      this.tweens.add({ targets: spr, alpha: 0.7, duration: 380, yoyo: true, repeat: -1 })
    }
    if (kind === 'lava') {
      this.tweens.add({ targets: spr, alpha: 0.82, duration: 500, yoyo: true, repeat: -1 })
    }
    this.ents.push({ spr, kind, lane, worldY, alive: true, power, pullX: 0, pullY: 0, bobPhase: Math.random() * Math.PI * 2 })
  }

  private releaseEnt(ent: Ent): void {
    if (!ent.alive) return
    ent.alive = false
    this.tweens.killTweensOf(ent.spr)
    ent.spr.setActive(false).setVisible(false)
    this.pool.push(ent.spr)
  }

  private updateEntities(time: number, dt: number): void {
    const magnet = this.activePowers.has('magnet')
    const magnetR = MAGNET_BASE_RADIUS * this.stats.magnetRadiusMult
    const drillX = this.drill.x

    for (const ent of this.ents) {
      if (!ent.alive) continue
      const baseX = laneX(ent.lane)
      let y = ent.worldY - this.scrolled
      let x = baseX

      const isPickup = !this.isBlockKind(ent.kind)
      if (isPickup) {
        y += Math.sin(time / 320 + ent.bobPhase) * 5
        if (ent.kind === 'coin') ent.spr.scaleX = 0.6 + Math.abs(Math.sin(time / 260 + ent.bobPhase)) * 0.4
      }

      if (magnet && MAGNETIC_KINDS.has(ent.kind)) {
        const dx = drillX - (baseX + ent.pullX)
        const dy = DRILL_Y - (y + ent.pullY)
        const dist = Math.hypot(dx, dy)
        if (dist < magnetR) {
          const pull = 9 * dt
          ent.pullX += dx * pull
          ent.pullY += dy * pull
        }
      }
      x += ent.pullX
      y += ent.pullY
      ent.spr.setPosition(x, y)

      // off the top → recycle
      if (y < -ROW_SPACING) {
        this.releaseEnt(ent)
        continue
      }

      // collision with the drill
      if (this.runActive) {
        const reach = this.isBlockKind(ent.kind) ? 108 : 56
        if (y <= DRILL_Y + reach && y >= DRILL_Y - 80 && Math.abs(x - drillX) < LANE_WIDTH * 0.55) {
          this.hitEnt(ent, x, y)
        }
      }
    }

    this.ents = this.ents.filter((e) => e.alive)
  }

  private isBlockKind(kind: Kind): boolean {
    return kind === 'dirt' || kind === 'gold' || kind === 'rock' || kind === 'lava'
      || kind === 'bomb' || kind === 'mystery' || kind === 'bossRock'
  }

  // ── collision resolution (§9) ──────────────────────────────────────────
  private hitEnt(ent: Ent, x: number, y: number): void {
    const mega = this.activePowers.has('mega')
    this.releaseEnt(ent)

    switch (ent.kind) {
      case 'dirt':
        this.dirtEmit.explode(10, x, y)
        break

      case 'gold':
        this.dirtEmit.explode(6, x, y)
        this.sparkEmit.explode(8, x, y)
        this.collectCoins(GOLD_BLOCK_COINS, SCORE_VALUES.gold, x, y)
        break

      case 'coin':
        this.sparkEmit.explode(5, x, y)
        this.coinPickups++
        this.collectCoins(COIN_PICKUP_COINS, SCORE_VALUES.coin, x, y)
        this.checkCountGoals()
        break

      case 'gem':
      case 'rareGem': {
        this.sparkEmit.explode(12, x, y)
        audio.play('gem')
        const base = ent.kind === 'gem' ? SCORE_VALUES.gem : SCORE_VALUES.rareGem
        const gain = Math.round(base * this.stats.gemValueMult * this.registerCollect())
        this.score += gain
        this.gemsRun += ent.kind === 'gem' ? 1 : 2
        this.gemPickups++
        this.float(x, y, `+${gain}`, '#7dffea')
        this.checkCountGoals()
        break
      }

      case 'fuel':
        audio.play('fuel')
        this.fuel = Math.min(this.maxFuel, this.fuel + FUEL_CAN_RESTORE)
        this.fuelCans++
        this.registerCollect()
        this.float(x, y, '+FUEL', '#7dc4ff')
        this.checkCountGoals()
        break

      case 'rock':
        if (mega) {
          this.megaSmash(x, y)
        } else {
          this.dirtEmit.explode(8, x, y)
          audio.play('crunch')
          this.fuel = Math.max(1, this.fuel - ROCK_FUEL_PENALTY)
          this.damage()
        }
        break

      case 'lava':
        if (mega) {
          this.megaSmash(x, y)
        } else {
          this.boomEmit.explode(10, x, y)
          audio.play('lava')
          this.damage()
        }
        break

      case 'bomb':
        this.boomEmit.explode(26, x, y)
        this.cameras.main.shake(180, 0.012)
        audio.play('explosion')
        this.clearAround(ent.lane, ent.worldY)
        if (!mega) this.damage()
        else this.score += 20
        break

      case 'bossRock':
        if (mega) {
          this.megaSmash(x, y)
          this.boomEmit.explode(20, x, y)
          this.score += 200
        } else {
          this.boomEmit.explode(14, x, y)
          audio.play('crunch')
          this.damage()
        }
        break

      case 'mystery':
        this.openMystery(ent, x, y)
        break

      case 'chest': {
        audio.play('chest')
        this.sparkEmit.explode(24, x, y)
        this.chests++
        const gain = Math.round(SCORE_VALUES.chest * this.registerCollect())
        this.score += gain
        this.coinsRun += CHEST_COINS
        this.float(x, y, `+${CHEST_COINS} COINS!`, '#ffd84d')
        this.checkCountGoals()
        break
      }

      case 'fossil':
        this.collectFossil(x, y)
        break

      case 'power':
        this.activatePower(ent.power ?? 'shield', false)
        this.sparkEmit.explode(10, x, y)
        this.registerCollect()
        break

      case 'empty':
        break
    }
  }

  private megaSmash(x: number, y: number): void {
    this.dirtEmit.explode(8, x, y)
    this.sparkEmit.explode(8, x, y)
    audio.play('crunch')
    this.score += 20
  }

  private collectCoins(coins: number, scoreBase: number, x: number, y: number): void {
    audio.play('coin')
    const gain = Math.round(scoreBase * this.registerCollect())
    this.score += gain
    this.coinsRun += coins
    this.float(x, y, `+${coins}`, '#ffd84d')
  }

  /** Advances the combo and returns the current multiplier (§14). */
  private registerCollect(): number {
    this.comboCount++
    this.bestCombo = Math.max(this.bestCombo, this.comboCount)
    let mult = 1
    for (const tier of COMBO_TIERS) {
      if (this.comboCount >= tier.at) {
        mult = tier.mult
        break
      }
    }
    if (mult > this.comboMult) {
      this.banner(`COMBO x${mult}!`, '#ffe06a')
      this.sparkEmit.explode(14, this.drill.x, DRILL_Y - 90)
    }
    this.comboMult = mult
    return mult
  }

  private clearAround(lane: number, worldY: number): void {
    for (const other of this.ents) {
      if (!other.alive) continue
      if (Math.abs(other.lane - lane) <= 1 && Math.abs(other.worldY - worldY) <= ROW_SPACING * 1.15) {
        this.boomEmit.explode(6, other.spr.x, other.spr.y)
        this.releaseEnt(other)
      }
    }
  }

  private openMystery(ent: Ent, x: number, y: number): void {
    audio.play('mystery')
    const roll = Math.random()
    if (roll < 0.28) {
      this.coinsRun += 20
      this.float(x, y, '+20 COINS', '#ffd84d')
      this.sparkEmit.explode(12, x, y)
    } else if (roll < 0.43) {
      this.gemsRun += 2
      this.score += 100
      this.float(x, y, '+2 GEMS', '#7dffea')
      this.sparkEmit.explode(12, x, y)
    } else if (roll < 0.63) {
      this.fuel = Math.min(this.maxFuel, this.fuel + FUEL_CAN_RESTORE)
      this.float(x, y, '+FUEL', '#7dc4ff')
    } else if (roll < 0.75) {
      this.activatePower('shield', false)
    } else if (roll < 0.83) {
      this.activatePower('slowTime', false)
    } else if (roll < 0.93) {
      this.boomEmit.explode(22, x, y)
      this.cameras.main.shake(160, 0.01)
      audio.play('explosion')
      this.clearAround(ent.lane, ent.worldY)
      if (!this.activePowers.has('mega')) this.damage()
    } else {
      this.collectFossil(x, y)
    }
    this.registerCollect()
  }

  private collectFossil(x: number, y: number): void {
    const def = this.rollFossil()
    const isNew = save.foundFossil(def.id)
    this.fossilsRun++
    this.score += SCORE_VALUES.fossil
    audio.play('fossil')
    this.sparkEmit.explode(18, x, y)
    if (isNew) {
      this.newFossilNames.push(def.name)
      this.banner(`FOSSIL FOUND!\n${def.name}`, '#ffe9b0')
    } else {
      this.gemsRun += 1
      this.float(x, y, `${def.name} +250`, '#ffe9b0')
    }
    this.registerCollect()
    this.checkCountGoals()
  }

  private rollFossil(): FossilDef {
    const weights = rarityWeightsForDepth(this.depthM)
    let total = 0
    for (const r of RARITY_ORDER) total += weights[r]
    let roll = Math.random() * total
    let rarity = RARITY_ORDER[0]
    for (const r of RARITY_ORDER) {
      roll -= weights[r]
      if (roll <= 0) {
        rarity = r
        break
      }
    }
    const tier = fossilsByRarity(rarity)
    const unfoundTier = tier.filter((f) => !save.profile.fossilsFound.includes(f.id))
    if (unfoundTier.length > 0) return Phaser.Math.RND.pick(unfoundTier)
    const unfoundAll = FOSSILS.filter((f) => !save.profile.fossilsFound.includes(f.id))
    if (unfoundAll.length > 0) return Phaser.Math.RND.pick(unfoundAll)
    return Phaser.Math.RND.pick(FOSSILS)
  }

  // ── power-ups (§18) ────────────────────────────────────────────────────
  activatePower(type: PowerType, silent: boolean): void {
    if (!silent) audio.play('powerup')
    const duration = POWER_BASE_DURATION[type] * this.stats.powerDurationMult

    switch (type) {
      case 'fuelBoost':
        this.fuel = Math.min(this.maxFuel, this.fuel + FUEL_BOOST_AMOUNT)
        this.float(this.drill.x, DRILL_Y - 70, '+FUEL BOOST', '#7dff8a')
        return
      case 'bombBlast': {
        this.cameras.main.shake(200, 0.014)
        audio.play('explosion')
        this.boomEmit.explode(36, this.drill.x, DRILL_Y + 140)
        for (const other of this.ents) {
          if (!other.alive) continue
          const sy = other.worldY - this.scrolled
          if (Math.abs(other.lane - this.drill.lane) <= 1 && sy > DRILL_Y - 80 && sy < DRILL_Y + 520) {
            this.boomEmit.explode(5, other.spr.x, other.spr.y)
            this.releaseEnt(other)
          }
        }
        return
      }
      case 'mega':
        this.drill.setMega(true)
        break
      case 'shield':
        this.drill.setShield(true)
        break
      case 'magnet':
      case 'slowTime':
        break
    }
    this.activePowers.set(type, duration)
    this.float(this.drill.x, DRILL_Y - 70, POWER_LABELS[type], '#ffe06a')
  }

  // ── damage / death (§12) ───────────────────────────────────────────────
  private damage(): void {
    if (!this.runActive) return
    if (this.activePowers.has('shield')) {
      this.activePowers.delete('shield')
      this.drill.setShield(false)
      audio.play('shieldPop')
      this.float(this.drill.x, DRILL_Y - 70, 'SHIELD SAVED YOU!', '#6fd8ff')
      return
    }
    this.hp--
    this.comboCount = 0
    this.comboMult = 1
    this.cameras.main.shake(140, 0.009)
    this.drill.flashHit()
    this.drill.setDamageVisual(this.hp, this.maxHp)
    this.smokeEmit.emitting = this.hp === 1
    if (this.hp <= 0) {
      this.boomEmit.explode(40, this.drill.x, DRILL_Y)
      this.cameras.main.shake(320, 0.02)
      audio.play('explosion')
      this.smokeEmit.emitting = false
      this.dustEmit.emitting = false
      this.drill.die(() => undefined)
      this.endRun(false, 'destroyed')
    }
  }

  private endRun(won: boolean, reason: RunSummary['reason']): void {
    if (this.ended) return
    this.ended = true
    this.runActive = false
    this.dustEmit.emitting = false
    this.smokeEmit.emitting = false
    audio.stopDrill()
    if (!won) audio.play('gameOver')

    // bank the run (§38) — once, here
    const depth = Math.floor(this.depthM)
    const reward = won && this.level ? this.level.reward : 0
    save.profile.coins += this.coinsRun + reward
    save.profile.gems += this.gemsRun
    save.profile.totalRuns++
    let newRecord = false
    if (this.runCfg.mode === 'endless' && depth > save.profile.bestDepth) {
      save.profile.bestDepth = depth
      newRecord = true
    }
    if (won && this.level && this.level.id > save.profile.levelsCompleted) {
      save.profile.levelsCompleted = this.level.id
    }
    save.save()
    save.ytSendScore(this.runCfg.mode === 'endless' ? depth : Math.floor(this.score))

    const summary: RunSummary = {
      mode: this.runCfg.mode,
      levelId: this.runCfg.levelId,
      won,
      reason,
      depth,
      best: save.profile.bestDepth,
      newRecord,
      coins: this.coinsRun + reward,
      gems: this.gemsRun,
      newFossils: this.newFossilNames,
      bestCombo: this.bestCombo,
      score: Math.floor(this.score),
      reward,
    }

    if (newRecord) audio.play('record')

    this.time.delayedCall(reason === 'destroyed' ? 1000 : 700, () => {
      this.scene.launch('GameOver', summary)
    })
  }

  // ── tiny FX helpers ────────────────────────────────────────────────────
  private float(x: number, y: number, str: string, color: string): void {
    const t = this.add
      .text(x, y, str, { fontFamily: FONT, fontSize: '30px', color, stroke: '#000000', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(80)
    this.tweens.add({
      targets: t, y: y - 80, alpha: 0, duration: 700, ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    })
  }

  private banner(str: string, color: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.32, str, {
        fontFamily: FONT, fontSize: '46px', color, stroke: '#000000', strokeThickness: 8, align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(85)
      .setScale(0.4)
    this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' })
    this.tweens.add({
      targets: t, alpha: 0, y: GAME_HEIGHT * 0.28, delay: 1100, duration: 350,
      onComplete: () => t.destroy(),
    })
  }
}
