export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface FossilDef {
  id: string
  name: string
  rarity: Rarity
  texture: string
  tint: number
  desc: string
}

export const RARITY_COLORS: Record<Rarity, number> = {
  common: 0xb0bec5,
  uncommon: 0x66bb6a,
  rare: 0x42a5f5,
  legendary: 0xab47bc,
}

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'legendary']

// Collection book entries (§21)
export const FOSSILS: FossilDef[] = [
  { id: 'smallBone', name: 'Small Bone', rarity: 'common', texture: 'fosBone', tint: 0xeae0c8, desc: 'Someone lost this a very long time ago.' },
  { id: 'oldCoin', name: 'Old Coin', rarity: 'common', texture: 'fosCoin', tint: 0xc9a55a, desc: 'Currency of a forgotten kingdom.' },
  { id: 'stoneShell', name: 'Stone Shell', rarity: 'common', texture: 'fosShell', tint: 0xb8b09a, desc: 'A spiral home turned to stone.' },
  { id: 'dinoTooth', name: 'Dinosaur Tooth', rarity: 'uncommon', texture: 'fosTooth', tint: 0xf4ecd8, desc: 'Still sharp after millions of years.' },
  { id: 'ancientCup', name: 'Ancient Cup', rarity: 'uncommon', texture: 'fosCup', tint: 0xcd853f, desc: 'Probably held something delicious.' },
  { id: 'crystalBug', name: 'Crystal Bug', rarity: 'uncommon', texture: 'fosBug', tint: 0x8be9c8, desc: 'It sparkles when nobody is looking.' },
  { id: 'goldenSkull', name: 'Golden Skull', rarity: 'rare', texture: 'fosSkull', tint: 0xffd34d, desc: 'Grinning and glittering.' },
  { id: 'glowingEgg', name: 'Glowing Egg', rarity: 'rare', texture: 'fosEgg', tint: 0xaef3ff, desc: 'It hums softly. Best not to shake it.' },
  { id: 'templeIdol', name: 'Temple Idol', rarity: 'rare', texture: 'fosIdol', tint: 0xffce54, desc: 'Its eyes seem to follow your drill.' },
  { id: 'dragonFossil', name: 'Dragon Fossil', rarity: 'legendary', texture: 'fosSkull', tint: 0xc084fc, desc: 'So dragons WERE real.' },
  { id: 'alienCrystal', name: 'Alien Crystal', rarity: 'legendary', texture: 'fosCrystal', tint: 0x7df9ff, desc: 'It does not match any earthly mineral.' },
  { id: 'lostCrown', name: 'Lost Crown', rarity: 'legendary', texture: 'fosCrown', tint: 0xffe066, desc: 'Heavy is the tunnel that holds the crown.' },
]

// Rarity roll weights shift deeper underground (deeper = rarer finds)
export function rarityWeightsForDepth(meters: number): Record<Rarity, number> {
  const deep = Math.min(1, meters / 900)
  return {
    common: 60 - deep * 35,
    uncommon: 25 + deep * 5,
    rare: 12 + deep * 18,
    legendary: 3 + deep * 12,
  }
}

export function fossilsByRarity(r: Rarity): FossilDef[] {
  return FOSSILS.filter((f) => f.rarity === r)
}
