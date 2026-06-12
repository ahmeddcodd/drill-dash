import type { UpgradeId, DerivedStats } from '../config/upgrades'
import { deriveStats, UPGRADE_MAX_LEVEL, UPGRADE_COSTS } from '../config/upgrades'
import { DAILY_REWARDS } from '../config/constants'

export interface Profile {
  version: number
  coins: number
  gems: number
  bestDepth: number
  totalRuns: number
  upgrades: Record<UpgradeId, number>
  skinsOwned: string[]
  skinEquipped: string
  trailsOwned: string[]
  trailEquipped: string
  fossilsFound: string[]
  levelsCompleted: number // highest level id completed
  daily: { lastClaim: string; streak: number }
  boosts: { shield: number; magnet: number }
  muted: boolean
  /** First-run tutorial progress: 0-3 = next tip to show, 4 = done (§23). */
  tutorialStep: number
}

const SAVE_KEY = 'drill-dash-save-v1'

function defaultProfile(): Profile {
  return {
    version: 1,
    coins: 0,
    gems: 0,
    bestDepth: 0,
    totalRuns: 0,
    upgrades: { fuelTank: 0, armor: 0, magnetRange: 0, gemValue: 0, fuelEfficiency: 0, powerDuration: 0 },
    skinsOwned: ['basic'],
    skinEquipped: 'basic',
    trailsOwned: ['dust'],
    trailEquipped: 'dust',
    fossilsFound: [],
    levelsCompleted: 0,
    daily: { lastClaim: '', streak: 0 },
    boosts: { shield: 0, magnet: 0 },
    muted: false,
    tutorialStep: 0,
  }
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

class SaveManager {
  profile: Profile = defaultProfile()

  load(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Profile>
        this.profile = { ...defaultProfile(), ...parsed }
        this.profile.upgrades = { ...defaultProfile().upgrades, ...(parsed.upgrades ?? {}) }
        this.profile.daily = { ...defaultProfile().daily, ...(parsed.daily ?? {}) }
        this.profile.boosts = { ...defaultProfile().boosts, ...(parsed.boosts ?? {}) }
      }
    } catch {
      this.profile = defaultProfile()
    }
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.profile))
    } catch {
      // storage unavailable (private mode / embeds) — game still plays
    }
  }

  stats(): DerivedStats {
    return deriveStats(this.profile.upgrades)
  }

  // ── currency ───────────────────────────────────────────────────────────
  addCoins(n: number): void {
    this.profile.coins += n
    this.save()
  }

  addGems(n: number): void {
    this.profile.gems += n
    this.save()
  }

  // ── upgrades ───────────────────────────────────────────────────────────
  upgradeCost(id: UpgradeId): number | null {
    const lvl = this.profile.upgrades[id]
    if (lvl >= UPGRADE_MAX_LEVEL) return null
    return UPGRADE_COSTS[lvl]
  }

  buyUpgrade(id: UpgradeId): boolean {
    const cost = this.upgradeCost(id)
    if (cost === null || this.profile.coins < cost) return false
    this.profile.coins -= cost
    this.profile.upgrades[id]++
    this.save()
    return true
  }

  // ── skins ──────────────────────────────────────────────────────────────
  buySkin(id: string, cost: number, currency: 'coins' | 'gems'): boolean {
    if (this.profile.skinsOwned.includes(id)) return false
    if (currency === 'coins') {
      if (this.profile.coins < cost) return false
      this.profile.coins -= cost
    } else {
      if (this.profile.gems < cost) return false
      this.profile.gems -= cost
    }
    this.profile.skinsOwned.push(id)
    this.profile.skinEquipped = id
    this.save()
    return true
  }

  equipSkin(id: string): void {
    if (this.profile.skinsOwned.includes(id)) {
      this.profile.skinEquipped = id
      this.save()
    }
  }

  // ── trails ─────────────────────────────────────────────────────────────
  buyTrail(id: string, cost: number, currency: 'coins' | 'gems'): boolean {
    if (this.profile.trailsOwned.includes(id)) return false
    if (currency === 'coins') {
      if (this.profile.coins < cost) return false
      this.profile.coins -= cost
    } else {
      if (this.profile.gems < cost) return false
      this.profile.gems -= cost
    }
    this.profile.trailsOwned.push(id)
    this.profile.trailEquipped = id
    this.save()
    return true
  }

  equipTrail(id: string): void {
    if (this.profile.trailsOwned.includes(id)) {
      this.profile.trailEquipped = id
      this.save()
    }
  }

  // ── fossils ────────────────────────────────────────────────────────────
  foundFossil(id: string): boolean {
    if (this.profile.fossilsFound.includes(id)) return false
    this.profile.fossilsFound.push(id)
    this.save()
    return true
  }

  // ── daily reward (§22) ─────────────────────────────────────────────────
  canClaimDaily(): boolean {
    return this.profile.daily.lastClaim !== todayKey()
  }

  /** Returns the day index (0-6) being claimed, or -1 if already claimed today. */
  claimDaily(): number {
    if (!this.canClaimDaily()) return -1
    const today = todayKey()
    const last = this.profile.daily.lastClaim
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    // consecutive day → streak continues, otherwise restart at day 1
    this.profile.daily.streak = last === yKey ? (this.profile.daily.streak % 7) + 1 : 1
    this.profile.daily.lastClaim = today
    const day = this.profile.daily.streak - 1
    const reward = DAILY_REWARDS[day]
    if (reward.coins) this.profile.coins += reward.coins
    if (reward.gems) this.profile.gems += reward.gems
    if (reward.shield) this.profile.boosts.shield += reward.shield
    if (reward.magnet) this.profile.boosts.magnet += reward.magnet
    this.save()
    return day
  }

  // ── YouTube Playables SDK (guarded — no-ops in a normal browser) ───────
  ytFirstFrameReady(): void {
    try {
      const yt = (window as unknown as { ytgame?: { game?: { firstFrameReady?: () => void } } }).ytgame
      yt?.game?.firstFrameReady?.()
    } catch { /* not in YT environment */ }
  }

  ytGameReady(): void {
    try {
      const yt = (window as unknown as { ytgame?: { game?: { gameReady?: () => void } } }).ytgame
      yt?.game?.gameReady?.()
    } catch { /* not in YT environment */ }
  }

  ytSendScore(value: number): void {
    try {
      const yt = (window as unknown as { ytgame?: { engagement?: { sendScore?: (s: { value: number }) => void } } }).ytgame
      yt?.engagement?.sendScore?.({ value: Math.floor(value) })
    } catch { /* not in YT environment */ }
  }
}

export const save = new SaveManager()
