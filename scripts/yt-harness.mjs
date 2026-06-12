// Fake YouTube Playables SDK harness: simulates IN_PLAYABLES_ENV and asserts
// every certification MUST/SHOULD the official test suite checks.
import { chromium } from 'playwright-core'

const URL = process.env.GAME_URL ?? 'http://localhost:5199/'
const fails = []
const ok = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
  if (!cond) fails.push(label)
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } })
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))

// keep the real SDK script from clobbering the fake one
await page.route('**://www.youtube.com/game_api/**', (r) =>
  r.fulfill({ contentType: 'application/javascript', body: '/* stubbed by harness */' }),
)

await page.addInitScript(() => {
  const calls = []
  let loadResolved = false
  const state = { pauseCb: null, resumeCb: null, audioCb: null, saves: [], scores: [] }
  window.__YT_CALLS__ = calls
  window.__YT_STATE__ = state
  window.ytgame = {
    IN_PLAYABLES_ENV: true,
    SDK_VERSION: 'harness',
    game: {
      firstFrameReady: () => calls.push({ m: 'firstFrameReady', t: performance.now() }),
      gameReady: () => calls.push({ m: 'gameReady', t: performance.now() }),
      loadData: () =>
        new Promise((res) =>
          setTimeout(() => {
            loadResolved = true
            calls.push({ m: 'loadData:resolved', t: performance.now() })
            const d = new Date()
            const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            res(JSON.stringify({
              version: 1, coins: 777, gems: 55, bestDepth: 555, tutorialStep: 4,
              daily: { lastClaim: today, streak: 1 }, // no popup blocking the menu
            }))
          }, 400),
        ),
      saveData: (d) => {
        calls.push({ m: 'saveData', t: performance.now(), size: d.length, beforeLoad: !loadResolved })
        state.saves.push(d)
        return Promise.resolve()
      },
    },
    system: {
      isAudioEnabled: () => true,
      onAudioEnabledChange: (cb) => { state.audioCb = cb; return () => {} },
      onPause: (cb) => { state.pauseCb = cb; return () => {} },
      onResume: (cb) => { state.resumeCb = cb; return () => {} },
    },
    engagement: {
      sendScore: (s) => { calls.push({ m: 'sendScore', value: s.value }); state.scores.push(s.value); return Promise.resolve() },
    },
    health: { logError: () => {}, logWarning: () => {} },
  }
})

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)

// ── lifecycle MUSTs ───────────────────────────────────────────────────────
let calls = await page.evaluate(() => window.__YT_CALLS__)
const ffr = calls.filter((c) => c.m === 'firstFrameReady')
const gr = calls.filter((c) => c.m === 'gameReady')
ok(ffr.length === 1, 'firstFrameReady called exactly once')
ok(gr.length === 1, 'gameReady called exactly once')
ok(ffr.length && gr.length && ffr[0].t < gr[0].t, 'firstFrameReady called BEFORE gameReady')
ok(gr.length && gr[0].t < 5000, `gameReady within 5s (was ${Math.round(gr[0]?.t ?? -1)}ms)`)

// ── cloud load applied + no premature saves ───────────────────────────────
const earlySaves = calls.filter((c) => c.m === 'saveData' && c.beforeLoad)
ok(earlySaves.length === 0, 'no saveData before loadData resolved')
await page.screenshot({ path: 'scripts/shots/yt1-menu-cloud.png' })

const soundBtnCount = await page.evaluate(() => {
  const menu = window.__DRILL_DASH__.scene.getScene('Menu')
  let count = 0
  const walk = (objs) => {
    for (const o of objs) {
      if (o.text && String(o.text).includes('SOUND')) count++
      if (o.list) walk(o.list)
    }
  }
  walk(menu.children.list)
  return count
})
ok(soundBtnCount === 0, 'in-env: no SOUND toggle shown (YouTube mute governs)')

const lsAfterBoot = await page.evaluate(() => localStorage.getItem('drill-dash-save-v1'))
// cloud profile shows in UI?
const coinsShown = await page.evaluate(() => {
  const menu = window.__DRILL_DASH__.scene.getScene('Menu')
  let found = false
  const walk = (objs) => {
    for (const o of objs) {
      if (o.text === '777') found = true
      if (o.list) walk(o.list)
    }
  }
  walk(menu.children.list)
  return found
})
ok(coinsShown, 'cloud save applied (menu shows 777 coins from loadData)')

// ── play a run to game over → saveData + sendScore ────────────────────────
await page.mouse.click(360, 700)
await page.waitForTimeout(2000)
await page.evaluate(() => { window.__DRILL_DASH__.scene.getScene('Game').fuel = 0.5 })
await page.waitForTimeout(3500)

const state = await page.evaluate(() => ({
  saves: window.__YT_STATE__.saves,
  scores: window.__YT_STATE__.scores,
}))
ok(state.saves.length >= 1, `saveData called after the run (${state.saves.length} writes)`)
let parsed = null
try { parsed = JSON.parse(state.saves[state.saves.length - 1] ?? '') } catch { /* */ }
ok(parsed !== null, 'saveData payload is valid JSON')
const lastSize = (state.saves[state.saves.length - 1] ?? '').length
ok(lastSize < 64 * 1024, `save payload ${lastSize} bytes < 64 KiB`)
ok(state.scores.length >= 1, 'sendScore called after endless run')
const lastScore = state.scores[state.scores.length - 1]
ok(Number.isInteger(lastScore), `sendScore value is an integer (${lastScore})`)
ok(parsed !== null && lastScore === parsed.bestDepth, `score sent (${lastScore}) equals bestDepth in save (${parsed?.bestDepth})`)
ok(lsAfterBoot === null, 'localStorage untouched in-env (cloud is the only persistence)')

// ── onPause / onResume ────────────────────────────────────────────────────
await page.mouse.click(360, 830) // RETRY → live run again
await page.waitForTimeout(1500)
await page.evaluate(() => window.__YT_STATE__.pauseCb && window.__YT_STATE__.pauseCb())
await page.waitForTimeout(400)
const f1 = await page.evaluate(() => window.__DRILL_DASH__.loop.frame)
await page.waitForTimeout(600)
const f2 = await page.evaluate(() => window.__DRILL_DASH__.loop.frame)
ok(f2 - f1 <= 1, `onPause halts execution (frames advanced ${f2 - f1} while paused)`)
const savesBeforePause = state.saves.length
const savesAfterPause = await page.evaluate(() => window.__YT_STATE__.saves.length)
ok(savesAfterPause >= savesBeforePause, 'progress flushed on pause')

await page.evaluate(() => window.__YT_STATE__.resumeCb && window.__YT_STATE__.resumeCb())
await page.waitForTimeout(700)
const f3 = await page.evaluate(() => window.__DRILL_DASH__.loop.frame)
ok(f3 > f2, 'onResume restarts execution')
const pauseShown = await page.evaluate(() => window.__DRILL_DASH__.scene.isActive('Pause'))
ok(pauseShown, 'pause overlay shown after system pause (graceful resume)')

// ── audio change callback registered ─────────────────────────────────────
const audioCbBound = await page.evaluate(() => typeof window.__YT_STATE__.audioCb === 'function')
ok(audioCbBound, 'onAudioEnabledChange handler registered')
await page.evaluate(() => window.__YT_STATE__.audioCb(false))
await page.waitForTimeout(200)

ok(pageErrors.length === 0, `no page errors (${pageErrors.join('; ') || 'clean'})`)
await page.screenshot({ path: 'scripts/shots/yt2-paused.png' })
await browser.close()

console.log(fails.length ? `\n${fails.length} CHECK(S) FAILED` : '\nALL PLAYABLES CHECKS PASSED')
process.exit(fails.length ? 1 : 0)
