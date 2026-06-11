import type { Kind } from './constants'

export type GoalType = 'depth' | 'coins' | 'gems' | 'fuel' | 'fossil' | 'chest' | 'depthHp' | 'wall'

export interface LevelDef {
  id: number
  name: string
  desc: string
  goalType: GoalType
  target: number
  hpMin?: number
  reward: number
  weights: Partial<Record<Kind, number>>
}

// Level Mode progression (design doc §16, §49). Each level uses its own
// spawn table so mechanics are introduced one at a time.
export const LEVELS: LevelDef[] = [
  {
    id: 1, name: 'DIG IN', desc: 'Reach 100m', goalType: 'depth', target: 100, reward: 50,
    weights: { empty: 22, dirt: 58, coin: 14, gold: 5, gem: 1 },
  },
  {
    id: 2, name: 'COIN RUSH', desc: 'Collect 10 coins', goalType: 'coins', target: 10, reward: 60,
    weights: { empty: 20, dirt: 50, coin: 20, gold: 8, gem: 3 },
  },
  {
    id: 3, name: 'ROCKY ROAD', desc: 'Dodge rocks, reach 80m', goalType: 'depth', target: 80, reward: 75,
    weights: { empty: 18, dirt: 46, coin: 12, gold: 5, gem: 3, rock: 14 },
  },
  {
    id: 4, name: 'TANK UP', desc: 'Grab 3 fuel cans', goalType: 'fuel', target: 3, reward: 85,
    weights: { empty: 18, dirt: 46, coin: 10, gold: 5, gem: 3, rock: 10, fuel: 6 },
  },
  {
    id: 5, name: 'CAREFUL NOW', desc: 'Reach 120m with 2+ health', goalType: 'depthHp', target: 120, hpMin: 2, reward: 100,
    weights: { empty: 17, dirt: 42, coin: 10, gold: 5, gem: 4, rock: 16, fuel: 3 },
  },
  {
    id: 6, name: 'GEM FEVER', desc: 'Collect 5 gems', goalType: 'gems', target: 5, reward: 120,
    weights: { empty: 16, dirt: 40, coin: 8, gold: 5, gem: 8, rock: 14, fuel: 3 },
  },
  {
    id: 7, name: 'BONE HUNTER', desc: 'Find a fossil', goalType: 'fossil', target: 1, reward: 150,
    weights: { empty: 16, dirt: 42, coin: 8, gold: 5, gem: 4, rock: 12, fuel: 3, fossil: 2.5 },
  },
  {
    id: 8, name: 'BOOM ZONE', desc: 'Survive to 150m', goalType: 'depth', target: 150, reward: 180,
    weights: { empty: 16, dirt: 38, coin: 8, gold: 5, gem: 5, rock: 12, bomb: 7, fuel: 3, mystery: 1.5 },
  },
  {
    id: 9, name: 'X MARKS THE SPOT', desc: 'Open a treasure chest', goalType: 'chest', target: 1, reward: 220,
    weights: { empty: 15, dirt: 38, coin: 8, gold: 5, gem: 5, rock: 14, bomb: 4, fuel: 3, chest: 1.6 },
  },
  {
    id: 10, name: 'THE WALL', desc: 'Break the giant rock wall!', goalType: 'wall', target: 145, reward: 400,
    weights: { empty: 17, dirt: 42, coin: 9, gold: 5, gem: 4, rock: 12, fuel: 4 },
  },
]

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id)
}
