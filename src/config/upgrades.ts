export type UpgradeId = 'fuelTank' | 'armor' | 'magnetRange' | 'gemValue' | 'fuelEfficiency' | 'powerDuration'

export interface UpgradeDef {
  id: UpgradeId
  name: string
  icon: string
  desc: string
  // value(level) → human readable effect at that level (0 = base)
  valueText: (level: number) => string
}

export const UPGRADE_MAX_LEVEL = 5
export const UPGRADE_COSTS = [100, 250, 500, 1000, 2000] // cost to buy level 1..5 (§35)

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'fuelTank', name: 'FUEL TANK', icon: 'fuelcan',
    desc: 'Start each run with more fuel',
    valueText: (l) => `${100 + FUEL_TANK_BONUS[l]} fuel`,
  },
  {
    id: 'armor', name: 'ARMOR', icon: 'pwShield',
    desc: 'Adds extra health points',
    valueText: (l) => `${3 + ARMOR_BONUS[l]} health`,
  },
  {
    id: 'magnetRange', name: 'MAGNET RANGE', icon: 'pwMagnet',
    desc: 'Magnet power-up pulls from further',
    valueText: (l) => `+${l * 20}% range`,
  },
  {
    id: 'gemValue', name: 'GEM VALUE', icon: 'gemGreen',
    desc: 'Gems are worth more points',
    valueText: (l) => `+${l * 20}% points`,
  },
  {
    id: 'fuelEfficiency', name: 'FUEL EFFICIENCY', icon: 'pwFuel',
    desc: 'Fuel drains more slowly',
    valueText: (l) => `-${l * 8}% drain`,
  },
  {
    id: 'powerDuration', name: 'POWER DURATION', icon: 'pwMega',
    desc: 'Timed power-ups last longer',
    valueText: (l) => `+${l * 12}% time`,
  },
]

export const FUEL_TANK_BONUS = [0, 10, 20, 30, 40, 50]
export const ARMOR_BONUS = [0, 1, 1, 2, 2, 3]

export interface DerivedStats {
  startFuel: number
  maxHp: number
  magnetRadiusMult: number
  gemValueMult: number
  fuelDrainMult: number
  powerDurationMult: number
}

export function deriveStats(levels: Record<UpgradeId, number>): DerivedStats {
  return {
    startFuel: 100 + FUEL_TANK_BONUS[levels.fuelTank],
    maxHp: 3 + ARMOR_BONUS[levels.armor],
    magnetRadiusMult: 1 + levels.magnetRange * 0.2,
    gemValueMult: 1 + levels.gemValue * 0.2,
    fuelDrainMult: 1 - levels.fuelEfficiency * 0.08,
    powerDurationMult: 1 + levels.powerDuration * 0.12,
  }
}
