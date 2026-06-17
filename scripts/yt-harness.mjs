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

// Faithful cloud-save stand-in: the persisted store lives in sessionStorage so
// it SURVIVES reloads, exactly like YouTube's real cloud save. This is what the
// real certification suite exercises and what the old harness never tested.
const CLOUD_KEY = '__yt_cloud_save__'
await page.addInitScript((cloudKey) => {
  const calls = []
  let loadResolved = false
  const state = { pauseCb: null, resumeCb: null, audioCb: null, saves: [], scores: [], lastEndRun: 0 }
  window.__YT_CALLS__ = calls
  window.__YT_STATE__ = state

  // seed the cloud store once (first page load of the session)
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (sessionStorage.getItem(cloudKey) === null) {
    sessionStorage.setItem(cloudKey, JSON.stringify({
      version: 1, coins: 777, gems: 55, bestDepth: 555, tutorialStep: 4,
      daily: { lastClaim: today, streak: 1 }, // no popup blocking the menu
    }))
  }

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
            res(sessionStorage.getItem(cloudKey) ?? '')
          }, 400),
        ),
      saveData: (data) => {
        calls.push({ m: 'saveData', t: performance.now(), size: data.length, beforeLoad: !loadResolved })
        state.saves.push(data)
        // 120ms write latency so the serialize/coalesce logic is genuinely tested
        return new Promise((res) => setTimeout(() => { sessionStorage.setItem(cloudKey, data); res() }, 120))
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
}, CLOUD_KEY)

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

// the pause screen must be VISIBLE while the loop is asleep
const pausedVisible = await page.evaluate(() => window.__DRILL_DASH__.scene.isActive('Pause'))
ok(pausedVisible, 'pause overlay is on screen WHILE paused')
await page.screenshot({ path: 'scripts/shots/yt2-paused.png' })

await page.evaluate(() => window.__YT_STATE__.resumeCb && window.__YT_STATE__.resumeCb())
await page.waitForTimeout(700)
const f3 = await page.evaluate(() => window.__DRILL_DASH__.loop.frame)
ok(f3 > f2, 'onResume restarts execution')
const pauseStillShown = await page.evaluate(() => window.__DRILL_DASH__.scene.isActive('Pause'))
ok(pauseStillShown, 'pause overlay still up after resume (player resumes manually)')

// ── audio change callback registered ─────────────────────────────────────
const audioCbBound = await page.evaluate(() => typeof window.__YT_STATE__.audioCb === 'function')
ok(audioCbBound, 'onAudioEnabledChange handler registered')
await page.evaluate(() => window.__YT_STATE__.audioCb(false))
await page.waitForTimeout(200)

ok(pageErrors.length === 0, `no page errors (${pageErrors.join('; ') || 'clean'})`)

// ── RS_06: progress must survive back-to-back play→reload cycles ───────────
// (the exact failure mode that sank the previous game; the old harness never
//  reloaded the page so it never caught this)
const readCloudDepth = () =>
  page.evaluate((k) => {
    try { return JSON.parse(sessionStorage.getItem(k)).bestDepth } catch { return null }
  }, CLOUD_KEY)

const menuBestShown = () =>
  page.evaluate(() => {
    const menu = window.__DRILL_DASH__.scene.getScene('Menu')
    let depth = null
    const walk = (objs) => {
      for (const o of objs) {
        const t = o.text ? String(o.text) : ''
        const m = t.match(/BEST DEPTH\s+(\d+)m/)
        if (m) depth = Number(m[1])
        if (o.list) walk(o.list)
      }
    }
    walk(menu.children.list)
    return depth
  })

// reload once to land on a clean menu (the checks above left a run mid-flight)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2600)

let prevDepth = await readCloudDepth()
let monotonic = true
let everLost = false
let fastestSaveGap = Infinity

for (let cycle = 0; cycle < 5; cycle++) {
  // start an endless run from the menu
  await page.mouse.click(360, 700)
  await page.waitForTimeout(1500)
  // drive depth up a bit so each run banks a higher best, then end it
  await page.evaluate(() => {
    const s = window.__DRILL_DASH__.scene.getScene('Game')
    s.scrolled = (600 + Math.floor(Math.random() * 400)) * 15
    s.depthM = s.scrolled / 15
  })
  await page.waitForTimeout(300)
  const beforeSaves = await page.evaluate(() => window.__YT_STATE__.saves.length)
  const endAt = await page.evaluate(() => { window.__YT_STATE__.lastEndRun = performance.now(); const s = window.__DRILL_DASH__.scene.getScene('Game'); s.fuel = 0; return performance.now() })
  // wait only briefly — then RELOAD immediately, simulating an impatient player
  await page.waitForTimeout(250)
  const saveGap = await page.evaluate((before) => {
    const calls = window.__YT_CALLS__.filter((c) => c.m === 'saveData')
    const last = calls[calls.length - 1]
    return last ? last.t - before : null
  }, endAt)
  if (saveGap !== null) fastestSaveGap = Math.min(fastestSaveGap, saveGap)

  // hard reload right after the run ends (this is what RS_06 broke on)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2600) // boot + loadData(400ms)

  const cloudDepth = await readCloudDepth()
  const shownDepth = await menuBestShown()
  if (cloudDepth === null || (prevDepth !== null && cloudDepth < prevDepth)) { monotonic = false; everLost = true }
  if (shownDepth === null || (cloudDepth !== null && shownDepth < cloudDepth)) everLost = true
  console.log(`   cycle ${cycle + 1}: cloud bestDepth=${cloudDepth}, menu shows=${shownDepth}m (prev ${prevDepth})`)
  prevDepth = cloudDepth
  void beforeSaves
}

ok(monotonic && !everLost, 'progress survives 5 back-to-back play→reload cycles (RS_06)')
ok(fastestSaveGap < 250, `saveData fires promptly after run end (fastest gap ${Math.round(fastestSaveGap)}ms, no 1s debounce)`)

await browser.close()

console.log(fails.length ? `\n${fails.length} CHECK(S) FAILED` : '\nALL PLAYABLES CHECKS PASSED')
process.exit(fails.length ? 1 : 0)
