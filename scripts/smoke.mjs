// Headless smoke test: boots the game, claims the daily reward, starts an
// endless run, steers a few times, and screenshots each stage.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const URL = process.env.GAME_URL ?? 'http://localhost:5174/'
const OUT = 'scripts/shots'
mkdirSync(OUT, { recursive: true })

const errors = []
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } })
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`${msg.text()} @ ${msg.location().url}`)
})
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`))
page.on('response', (res) => {
  if (res.status() >= 400) errors.push(`HTTP ${res.status()}: ${res.url()}`)
})

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForSelector('canvas', { timeout: 15000 })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/1-menu-daily.png` })

// claim daily reward popup (CLAIM button at design coords 360, 780)
await page.mouse.click(360, 780)
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/2-menu.png` })

// press PLAY (360, 660)
await page.mouse.click(360, 660)
await page.waitForTimeout(2000)
await page.screenshot({ path: `${OUT}/3-game-start.png` })

// steer: tap left, left, right while digging
await page.mouse.click(180, 800)
await page.waitForTimeout(400)
await page.mouse.click(180, 800)
await page.waitForTimeout(400)
await page.mouse.click(540, 800)
await page.waitForTimeout(4000)
await page.screenshot({ path: `${OUT}/4-game-deep.png` })

// pause menu (pause button at ~668, 190)
await page.mouse.click(668, 190)
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/5-pause.png` })
// home
await page.mouse.click(360, 786)
await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/6-back-home.png` })

// levels screen
await page.mouse.click(360, 790)
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/7-levels.png` })
// start level 1 (card at 190, 280)
await page.mouse.click(190, 280)
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT}/8-level1.png` })

// force a fuel-out to exercise the game-over → retry loop
await page.evaluate(() => {
  const game = window.__DRILL_DASH__
  const scene = game.scene.getScene('Game')
  scene.fuel = 1
})
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT}/9-gameover.png` })

// hit RETRY (360, 830) and confirm a fresh run starts
await page.mouse.click(360, 830)
await page.waitForTimeout(1800)
await page.screenshot({ path: `${OUT}/10-retry.png` })

// confirm the save banked the run
const saveData = await page.evaluate(() => localStorage.getItem('drill-dash-save-v1'))
const profile = JSON.parse(saveData ?? '{}')
console.log(`save: coins=${profile.coins} gems=${profile.gems} bestDepth=${profile.bestDepth} runs=${profile.totalRuns} daily=${profile.daily?.lastClaim}`)
if (!profile.totalRuns || profile.totalRuns < 1) errors.push('save did not record the finished run')

await browser.close()

if (errors.length) {
  console.log('CONSOLE/PAGE ERRORS:')
  for (const e of errors) console.log(' -', e)
  process.exit(1)
} else {
  console.log('Smoke test passed: no console or page errors.')
}
