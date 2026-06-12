// Typed wrapper around the YouTube Playables SDK.
// https://developers.google.com/youtube/gaming/playables/reference/sdk
//
// Every call is guarded: outside the Playables environment (normal web /
// Vercel) everything no-ops and the game behaves exactly like a plain web
// build. Inside the environment the wrapper enforces the certification
// rules: firstFrameReady before gameReady (each once), saveData only after
// loadData has resolved, debounced saves, and integer scores.

interface YtGameSdk {
  IN_PLAYABLES_ENV: boolean
  SDK_VERSION: string
  game: {
    firstFrameReady(): void
    gameReady(): void
    loadData(): Promise<string>
    saveData(data: string): Promise<void>
  }
  system: {
    isAudioEnabled(): boolean
    onAudioEnabledChange(cb: (isAudioEnabled: boolean) => void): () => void
    onPause(cb: () => void): () => void
    onResume(cb: () => void): () => void
  }
  engagement: {
    sendScore(score: { value: number }): Promise<void>
  }
  health: {
    logError(): void
    logWarning(): void
  }
}

function sdk(): YtGameSdk | null {
  try {
    const yt = (window as unknown as { ytgame?: YtGameSdk }).ytgame
    return yt && yt.IN_PLAYABLES_ENV ? yt : null
  } catch {
    return null
  }
}

export interface SystemHandlers {
  onPause: () => void
  onResume: () => void
  onAudioChange: (enabled: boolean) => void
}

class Playables {
  private firstFrameSent = false
  private gameReadySent = false
  private loaded = false // loadData has resolved — saves are now permitted
  private pendingSave: string | null = null
  private saveTimer: number | null = null

  /** True only when running inside the YouTube Playables environment. */
  get active(): boolean {
    return sdk() !== null
  }

  firstFrameReady(): void {
    if (this.firstFrameSent) return
    this.firstFrameSent = true
    try {
      sdk()?.game.firstFrameReady()
    } catch { /* non-fatal */ }
  }

  gameReady(): void {
    if (this.gameReadySent) return
    this.gameReadySent = true
    try {
      sdk()?.game.gameReady()
    } catch { /* non-fatal */ }
  }

  /**
   * Fetch the cloud save. Resolves null outside the environment, on error,
   * or after a 3s timeout — boot is never blocked indefinitely.
   */
  async loadData(): Promise<string | null> {
    const yt = sdk()
    if (!yt) {
      this.loaded = true
      return null
    }
    try {
      const result = await Promise.race([
        yt.game.loadData(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ])
      return result || null
    } catch {
      return null
    } finally {
      // cert MUST: saveData only after loadData has been awaited
      this.loaded = true
    }
  }

  /** Debounced cloud save — rapid profile writes coalesce into one call. */
  queueSave(json: string): void {
    if (!this.active) return
    this.pendingSave = json
    if (this.saveTimer === null) {
      this.saveTimer = window.setTimeout(() => {
        this.saveTimer = null
        this.flushSave()
      }, 1000)
    }
  }

  /** Immediate cloud write (used on system pause). */
  flushSave(): void {
    if (!this.loaded || this.pendingSave === null) return
    const yt = sdk()
    if (!yt) return
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    const data = this.pendingSave
    this.pendingSave = null
    yt.game.saveData(data).catch(() => {
      // keep the payload so the next save attempt retries it
      if (this.pendingSave === null) this.pendingSave = data
    })
  }

  sendScore(value: number): void {
    try {
      void sdk()?.engagement.sendScore({ value: Math.floor(value) })
    } catch { /* non-fatal */ }
  }

  isAudioEnabled(): boolean {
    try {
      return sdk()?.system.isAudioEnabled() ?? true
    } catch {
      return true
    }
  }

  bindSystem(handlers: SystemHandlers): void {
    const yt = sdk()
    if (!yt) return
    try {
      yt.system.onPause(handlers.onPause)
      yt.system.onResume(handlers.onResume)
      yt.system.onAudioEnabledChange(handlers.onAudioChange)
    } catch { /* non-fatal */ }
  }

  logError(): void {
    try {
      sdk()?.health.logError()
    } catch { /* non-fatal */ }
  }
}

export const playables = new Playables()
