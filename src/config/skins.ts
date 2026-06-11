export interface SkinDef {
  id: string
  name: string
  body: number // drill body tint
  bit: number // drill bit tint
  trail: number // dig trail particle tint
  cost: number
  currency: 'coins' | 'gems'
}

// Drill skins (§20). Basic is owned from the start.
export const SKINS: SkinDef[] = [
  { id: 'basic', name: 'BASIC', body: 0xffa843, bit: 0xaab4bd, trail: 0xc8a06c, cost: 0, currency: 'coins' },
  { id: 'golden', name: 'GOLDEN', body: 0xffd84d, bit: 0xf0b429, trail: 0xffe28a, cost: 600, currency: 'coins' },
  { id: 'jungle', name: 'JUNGLE', body: 0x6ddb6a, bit: 0x2e8b57, trail: 0x9bff8a, cost: 900, currency: 'coins' },
  { id: 'lava', name: 'LAVA', body: 0xff5733, bit: 0x8b2a0a, trail: 0xff8c42, cost: 1200, currency: 'coins' },
  { id: 'robot', name: 'ROBOT', body: 0xb6c8da, bit: 0x4a6fa5, trail: 0x9adcff, cost: 1500, currency: 'coins' },
  { id: 'shark', name: 'SHARK', body: 0x5d8aa8, bit: 0x2f4f5f, trail: 0x9fd9ff, cost: 2000, currency: 'coins' },
  { id: 'crystal', name: 'CRYSTAL', body: 0x9be7ff, bit: 0x57c7ff, trail: 0xc3f3ff, cost: 2500, currency: 'coins' },
  { id: 'rocket', name: 'ROCKET', body: 0xf5f6fa, bit: 0xe74c3c, trail: 0xffd2c2, cost: 3000, currency: 'coins' },
  { id: 'temple', name: 'ANCIENT TEMPLE', body: 0xd9c79a, bit: 0x8a7340, trail: 0xffe9a8, cost: 30, currency: 'gems' },
  { id: 'diamond', name: 'DIAMOND', body: 0xeaf6ff, bit: 0xb8e2ff, trail: 0xffffff, cost: 60, currency: 'gems' },
]

export function getSkin(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0]
}
