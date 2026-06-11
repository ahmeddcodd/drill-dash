import {
  LANES, GRACE_ROWS, FUEL_PITY_METERS, HAZARD_KINDS,
  ZONES, zoneIndexForDepth, ROW_SPACING, PX_PER_METER,
  BOSS_WALL_DEPTH, BOSS_MEGA_ROWS_BEFORE,
} from '../config/constants'
import type { Kind, PowerType } from '../config/constants'
import type { LevelDef } from '../config/levels'

export interface RowResult {
  kinds: Kind[]
  // forced power-up types for specific lanes (boss script), null = roll normally
  forcedPower: (PowerType | null)[]
}

/**
 * Row-by-row tunnel generator (§41) with the safe-path guarantee (§42):
 * it tracks which lanes a player moving one lane per row could occupy and
 * always leaves at least one reachable damage-free lane.
 */
export class Spawner {
  private level: LevelDef | null
  private reachable: boolean[]
  private lastFuelDepth = 0
  private bossWallRow = -1
  private bossMegaRows: number[] = []
  bossWallSpawned = false

  constructor(level: LevelDef | null, startLane: number) {
    this.level = level
    this.reachable = Array.from({ length: LANES }, (_, i) => i === startLane)
    if (level?.goalType === 'wall') {
      this.bossWallRow = Math.round((BOSS_WALL_DEPTH * PX_PER_METER) / ROW_SPACING)
      this.bossMegaRows = BOSS_MEGA_ROWS_BEFORE.map((d) => this.bossWallRow - d)
    }
  }

  generateRow(rowIndex: number, depthMeters: number): RowResult {
    // ── boss: the giant rock wall spans every lane (no safety fix here —
    // breaking through it IS the goal) ────────────────────────────────────
    if (rowIndex === this.bossWallRow) {
      this.bossWallSpawned = true
      return { kinds: Array(LANES).fill('bossRock') as Kind[], forcedPower: Array(LANES).fill(null) }
    }

    const weights = this.level ? this.level.weights : ZONES[zoneIndexForDepth(depthMeters)].weights
    const kinds: Kind[] = []
    for (let l = 0; l < LANES; l++) kinds.push(this.pick(weights))

    const forcedPower: (PowerType | null)[] = Array(LANES).fill(null)

    // early-run grace period: no hazards while the player settles in (§30)
    if (rowIndex < GRACE_ROWS) {
      for (let l = 0; l < LANES; l++) {
        if (HAZARD_KINDS.has(kinds[l])) kinds[l] = 'dirt'
      }
    }

    // fairness cap: never more than 3 hazards in a single row
    let hazardCount = kinds.filter((k) => HAZARD_KINDS.has(k)).length
    for (let l = 0; l < LANES && hazardCount > 3; l++) {
      if (HAZARD_KINDS.has(kinds[l])) {
        kinds[l] = 'dirt'
        hazardCount--
      }
    }

    // ── boss: guaranteed Mega Drill pickups on reachable lanes ───────────
    if (this.bossMegaRows.includes(rowIndex)) {
      const lane = this.pickReachableLane()
      kinds[lane] = 'power'
      forcedPower[lane] = 'mega'
    }

    // ── safe-path rule (§42) ──────────────────────────────────────────────
    let next = this.propagate(kinds)
    if (!next.some(Boolean)) {
      // every reachable lane would take damage → carve an escape
      const candidates: number[] = []
      for (let l = 0; l < LANES; l++) {
        if (this.adjacentReachable(l)) candidates.push(l)
      }
      const fix = candidates[Math.floor(Math.random() * candidates.length)] ?? Math.floor(LANES / 2)
      kinds[fix] = 'dirt'
      next = this.propagate(kinds)
    }
    this.reachable = next

    // ── fuel pity timer: never starve the player (§30) ───────────────────
    if (!kinds.includes('fuel') && depthMeters - this.lastFuelDepth > FUEL_PITY_METERS) {
      const lane = this.pickReachableLane()
      if (forcedPower[lane] === null) {
        kinds[lane] = 'fuel'
        this.reachable[lane] = true
      }
    }
    if (kinds.includes('fuel')) this.lastFuelDepth = depthMeters

    return { kinds, forcedPower }
  }

  private propagate(kinds: Kind[]): boolean[] {
    const next: boolean[] = Array(LANES).fill(false)
    for (let l = 0; l < LANES; l++) {
      next[l] = !HAZARD_KINDS.has(kinds[l]) && this.adjacentReachable(l)
    }
    return next
  }

  private adjacentReachable(lane: number): boolean {
    for (let d = -1; d <= 1; d++) {
      const l = lane + d
      if (l >= 0 && l < LANES && this.reachable[l]) return true
    }
    return false
  }

  private pickReachableLane(): number {
    const options: number[] = []
    for (let l = 0; l < LANES; l++) if (this.reachable[l]) options.push(l)
    if (options.length === 0) return Math.floor(LANES / 2)
    return options[Math.floor(Math.random() * options.length)]
  }

  private pick(weights: Partial<Record<Kind, number>>): Kind {
    let total = 0
    for (const k in weights) total += weights[k as Kind] ?? 0
    let roll = Math.random() * total
    for (const k in weights) {
      roll -= weights[k as Kind] ?? 0
      if (roll <= 0) return k as Kind
    }
    return 'dirt'
  }
}
