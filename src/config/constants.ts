// ── Geometry ─────────────────────────────────────────────────────────────
export const GAME_WIDTH = 720
export const GAME_HEIGHT = 1280
export const LANES = 5
export const LANE_WIDTH = GAME_WIDTH / LANES // 144
export const BLOCK_SIZE = 126
export const ROW_SPACING = 150
export const DRILL_Y = 400
export const PX_PER_METER = 15

export const laneX = (lane: number) => lane * LANE_WIDTH + LANE_WIDTH / 2

// Inset for edge-pinned HUD elements. Sized for the worst-case ~64px-per-side
// crop when phones fill a ~9:19.5 screen (ENVELOP), so depth/coins/pause stay
// visible. On desktop (FIT, no crop) it just sits slightly off the edges.
export const SAFE_MARGIN = 70

// ── Speed / difficulty (design doc §45, §31) ─────────────────────────────
export const BASE_SCROLL_SPEED = 230 // px per second
export const SPEED_STEP_PER_100M = 0.05 // +5% every 100 m
export const MAX_SPEED_MULT = 2.6
export const SPEED_LINES_MULT = 1.35 // speed lines kick in past this multiplier

// ── Fuel / health (§11, §12, §45) ────────────────────────────────────────
export const START_FUEL = 100
export const FUEL_DRAIN_PER_SEC = 1.5
export const FUEL_DRAIN_PER_300M = 0.35 // extra drain per second per 300 m depth
export const FUEL_CAN_RESTORE = 25
export const ROCK_FUEL_PENALTY = 4
export const START_HEALTH = 3
export const FUEL_PITY_METERS = 150 // a fuel can is guaranteed at least this often
export const GRACE_ROWS = 7 // first rows of a run never contain hazards

// ── Object kinds ─────────────────────────────────────────────────────────
export type Kind =
  | 'empty'
  | 'dirt'
  | 'gold'
  | 'rock'
  | 'lava'
  | 'bomb'
  | 'mystery'
  | 'coin'
  | 'gem'
  | 'rareGem'
  | 'fuel'
  | 'fossil'
  | 'chest'
  | 'power'
  | 'bossRock'

export type PowerType = 'mega' | 'magnet' | 'shield' | 'fuelBoost' | 'bombBlast' | 'slowTime'

export const HAZARD_KINDS: ReadonlySet<Kind> = new Set<Kind>(['rock', 'lava', 'bomb', 'bossRock'])
export const MAGNETIC_KINDS: ReadonlySet<Kind> = new Set<Kind>(['coin', 'gem', 'rareGem'])

// ── Scoring (§14) ────────────────────────────────────────────────────────
export const SCORE_VALUES = {
  meter: 1,
  coin: 5,
  gold: 10,
  gem: 50,
  rareGem: 100,
  fossil: 250,
  chest: 500,
} as const

export const COIN_PICKUP_COINS = 2
export const GOLD_BLOCK_COINS = 6
export const CHEST_COINS = 100

// Combo: 3 collectibles → x2, 5 → x3, 10 → x5 (checked top-down)
export const COMBO_TIERS: ReadonlyArray<{ at: number; mult: number }> = [
  { at: 10, mult: 5 },
  { at: 5, mult: 3 },
  { at: 3, mult: 2 },
]

// ── Power-ups (§18) ──────────────────────────────────────────────────────
export const POWER_BASE_DURATION: Record<PowerType, number> = {
  mega: 5,
  magnet: 7,
  shield: 10,
  slowTime: 4,
  fuelBoost: 0,
  bombBlast: 0,
}

export const POWER_WEIGHTS: ReadonlyArray<{ type: PowerType; w: number }> = [
  { type: 'shield', w: 22 },
  { type: 'magnet', w: 20 },
  { type: 'fuelBoost', w: 18 },
  { type: 'slowTime', w: 15 },
  { type: 'bombBlast', w: 13 },
  { type: 'mega', w: 12 },
]

export const POWER_LABELS: Record<PowerType, string> = {
  mega: 'MEGA DRILL',
  magnet: 'MAGNET',
  shield: 'SHIELD',
  fuelBoost: 'FUEL BOOST',
  bombBlast: 'BOMB BLAST',
  slowTime: 'SLOW TIME',
}

export const POWER_ICONS: Record<PowerType, string> = {
  mega: 'pwMega',
  magnet: 'pwMagnet',
  shield: 'pwShield',
  fuelBoost: 'pwFuel',
  bombBlast: 'pwBomb',
  slowTime: 'pwSlow',
}

export const MAGNET_BASE_RADIUS = 250
export const SLOW_TIME_FACTOR = 0.5
export const FUEL_BOOST_AMOUNT = 50

// ── Depth zones / worlds (§15, §17) ──────────────────────────────────────
export interface ZoneDef {
  name: string
  from: number // depth in meters where the zone starts
  tileTint: number // tint for the background wall tile
  accent: number // banner / glow accent colour
  blockTint: number // multiplied over dirt blocks so each zone has its own earth
  weights: Partial<Record<Kind, number>>
}

export const ZONES: ZoneDef[] = [
  {
    name: 'DIRT TUNNEL',
    from: 0,
    tileTint: 0x8a623f,
    accent: 0xd9a066,
    blockTint: 0xffffff,
    weights: {
      empty: 18, dirt: 50, gold: 7, coin: 12, gem: 3, rock: 6, fuel: 3,
      power: 0.7, mystery: 0.4, fossil: 0.15, chest: 0.12,
    },
  },
  {
    name: 'ROCKY MINE',
    from: 100,
    tileTint: 0x76695c,
    accent: 0xb9aa97,
    blockTint: 0xd9cfc6,
    weights: {
      empty: 16, dirt: 40, gold: 8, coin: 10, gem: 5, rock: 14, fuel: 3,
      power: 1, mystery: 1, bomb: 0.6, fossil: 0.3, chest: 0.25,
    },
  },
  {
    name: 'BOMB DEPTHS',
    from: 250,
    tileTint: 0x6e5a44,
    accent: 0xff8c42,
    blockTint: 0xeac9a4,
    weights: {
      empty: 15, dirt: 36, gold: 7, coin: 8, gem: 6, rock: 14, bomb: 6,
      mystery: 2, fuel: 3, power: 1.2, lava: 0.6, fossil: 0.4, chest: 0.35,
    },
  },
  {
    name: 'LAVA CORE',
    from: 400,
    tileTint: 0x73402e,
    accent: 0xff5e2b,
    blockTint: 0xd9938a,
    weights: {
      empty: 14, dirt: 32, gold: 6, coin: 7, gem: 7, rareGem: 1, rock: 13,
      bomb: 5, lava: 7, fuel: 3, power: 1.4, mystery: 1.5, fossil: 0.5, chest: 0.35,
    },
  },
  {
    name: 'CRYSTAL CAVE',
    from: 600,
    tileTint: 0x5e5a8f,
    accent: 0xb39dff,
    blockTint: 0xb9c6e8,
    weights: {
      empty: 13, dirt: 28, gold: 6, coin: 6, gem: 9, rareGem: 3, rock: 14,
      bomb: 5, lava: 7, fuel: 2.6, power: 1.5, mystery: 1.5, fossil: 0.8, chest: 0.5,
    },
  },
  {
    name: 'CHAOS DEPTH',
    from: 900,
    tileTint: 0x59313a,
    accent: 0xff4d6d,
    blockTint: 0xbf8fa6,
    weights: {
      empty: 12, dirt: 24, gold: 5, coin: 5, gem: 8, rareGem: 5, rock: 16,
      bomb: 7, lava: 10, fuel: 2.4, power: 1.6, mystery: 2, fossil: 1, chest: 0.7,
    },
  },
]

export function zoneIndexForDepth(meters: number): number {
  for (let i = ZONES.length - 1; i >= 0; i--) {
    if (meters >= ZONES[i].from) return i
  }
  return 0
}

// ── Mini boss (level 10, §32) ────────────────────────────────────────────
export const BOSS_WALL_DEPTH = 130 // meters at which the giant rock wall spawns
export const BOSS_MEGA_ROWS_BEFORE = [6, 4] // rows before the wall holding Mega Drill pickups

// ── UI / text ────────────────────────────────────────────────────────────
export const FONT = '"Fredoka One", "Arial Black", Arial, sans-serif'

export const DAILY_REWARDS: ReadonlyArray<{ label: string; coins?: number; gems?: number; shield?: number; magnet?: number }> = [
  { label: '100 Coins', coins: 100 },
  { label: 'Shield Boost', shield: 1 },
  { label: '200 Coins', coins: 200 },
  { label: 'Magnet Boost', magnet: 1 },
  { label: 'Rare Chest', coins: 300, gems: 3 },
  { label: '500 Coins', coins: 500 },
  { label: 'Jackpot!', coins: 800, gems: 5 },
]
