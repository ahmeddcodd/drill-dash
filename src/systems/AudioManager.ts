// All audio is synthesized with the Web Audio API — no external files.
// SFX palette follows the design doc (§26).

export type SfxName =
  | 'coin' | 'gem' | 'fuel' | 'crunch' | 'lava' | 'explosion' | 'powerup'
  | 'laneMove' | 'gameOver' | 'record' | 'click' | 'chest' | 'fossil'
  | 'shieldPop' | 'mystery' | 'win' | 'combo' | 'zone' | 'fuelLow' | 'whoosh'

class AudioManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private drillGain: GainNode | null = null
  private drillSrc: AudioBufferSourceNode | null = null
  private musicTimer: number | null = null
  private musicStep = 0
  private musicGain: GainNode | null = null
  private nextNoteTime = 0
  private musicIntensity = 0
  private systemMuted = false
  muted = false

  /** 0 = base loop; 1 = adds hats + arpeggio for deep runs (400m+). */
  setMusicIntensity(level: 0 | 1): void {
    this.musicIntensity = level
  }

  /** Safe to call repeatedly; creates/resumes the context on a user gesture. */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext()
        this.master = this.ctx.createGain()
        this.master.gain.value = this.isSilenced() ? 0 : 1
        this.master.connect(this.ctx.destination)
      } catch {
        return
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setMuted(m: boolean): void {
    this.muted = m
    this.applyMasterGain()
  }

  /** YouTube Playables system mute — combined with the player's own toggle. */
  setSystemMuted(m: boolean): void {
    this.systemMuted = m
    this.applyMasterGain()
  }

  private isSilenced(): boolean {
    return this.muted || this.systemMuted
  }

  private applyMasterGain(): void {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.isSilenced() ? 0 : 1, this.ctx.currentTime, 0.02)
    }
  }

  /** Hard-stop / restart all audio output (Playables onPause/onResume). */
  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend()
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume()
  }

  // ── small synth helpers ──────────────────────────────────────────────
  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
    if (!this.ctx || !this.master) return
    const t0 = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur)
    g.gain.setValueAtTime(vol, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  private noise(dur: number, vol: number, filterFreq: number, delay = 0): void {
    if (!this.ctx || !this.master) return
    const t0 = this.ctx.currentTime + delay
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur))
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = filterFreq
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(filter).connect(g).connect(this.master)
    src.start(t0)
  }

  play(name: SfxName): void {
    if (!this.ctx || this.isSilenced()) return
    switch (name) {
      case 'coin':
        this.tone(880, 0.09, 'square', 0.12, 1320)
        break
      case 'gem':
        this.tone(1047, 0.08, 'sine', 0.14)
        this.tone(1319, 0.08, 'sine', 0.14, undefined, 0.06)
        this.tone(1568, 0.14, 'sine', 0.14, undefined, 0.12)
        break
      case 'fuel':
        this.tone(220, 0.18, 'sine', 0.16, 520)
        this.noise(0.15, 0.05, 1200, 0.02)
        break
      case 'crunch':
        this.noise(0.16, 0.3, 700)
        this.tone(110, 0.14, 'triangle', 0.2, 55)
        break
      case 'lava':
        this.noise(0.35, 0.22, 400)
        this.tone(90, 0.3, 'sawtooth', 0.1, 40)
        break
      case 'explosion':
        this.noise(0.5, 0.4, 900)
        this.tone(120, 0.45, 'sine', 0.35, 30)
        break
      case 'powerup':
        this.tone(440, 0.1, 'sawtooth', 0.12, 880)
        this.tone(660, 0.12, 'sawtooth', 0.12, 1320, 0.08)
        break
      case 'laneMove':
        this.tone(300, 0.05, 'triangle', 0.08, 420)
        break
      case 'gameOver':
        this.tone(392, 0.18, 'square', 0.12, undefined, 0)
        this.tone(330, 0.18, 'square', 0.12, undefined, 0.16)
        this.tone(262, 0.18, 'square', 0.12, undefined, 0.32)
        this.tone(196, 0.4, 'square', 0.14, undefined, 0.48)
        this.noise(0.3, 0.12, 500, 0.5)
        break
      case 'record':
      case 'win':
        this.tone(523, 0.12, 'square', 0.12, undefined, 0)
        this.tone(659, 0.12, 'square', 0.12, undefined, 0.1)
        this.tone(784, 0.12, 'square', 0.12, undefined, 0.2)
        this.tone(1047, 0.35, 'square', 0.14, undefined, 0.3)
        break
      case 'click':
        this.tone(600, 0.05, 'triangle', 0.1, 500)
        break
      case 'chest':
        this.tone(523, 0.1, 'sine', 0.14, undefined, 0)
        this.tone(784, 0.1, 'sine', 0.14, undefined, 0.08)
        this.tone(1047, 0.12, 'sine', 0.14, undefined, 0.16)
        this.tone(1319, 0.25, 'sine', 0.16, undefined, 0.24)
        break
      case 'fossil':
        this.tone(440, 0.2, 'sine', 0.13, undefined, 0)
        this.tone(554, 0.2, 'sine', 0.13, undefined, 0.12)
        this.tone(659, 0.35, 'sine', 0.15, undefined, 0.24)
        break
      case 'shieldPop':
        this.tone(800, 0.12, 'sine', 0.16, 300)
        this.noise(0.1, 0.08, 2000)
        break
      case 'mystery':
        this.tone(330, 0.1, 'triangle', 0.12, 660)
        this.tone(660, 0.15, 'triangle', 0.12, 990, 0.1)
        break
      case 'combo':
        this.tone(660, 0.08, 'square', 0.12, 990)
        this.tone(990, 0.12, 'square', 0.11, 1320, 0.07)
        break
      case 'zone':
        this.tone(98, 0.5, 'triangle', 0.18, 65)
        this.tone(392, 0.3, 'sine', 0.09, 784, 0.12)
        break
      case 'fuelLow':
        this.tone(880, 0.07, 'square', 0.09)
        this.tone(880, 0.07, 'square', 0.09, undefined, 0.13)
        break
      case 'whoosh':
        this.noise(0.13, 0.09, 5500)
        break
    }
  }

  // ── drill rumble loop ────────────────────────────────────────────────
  startDrill(): void {
    if (!this.ctx || !this.master || this.drillSrc) return
    const len = Math.floor(this.ctx.sampleRate * 0.5)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 90
    filter.Q.value = 1.2
    this.drillGain = this.ctx.createGain()
    this.drillGain.gain.value = 0.05
    src.connect(filter).connect(this.drillGain).connect(this.master)
    src.start()
    this.drillSrc = src
  }

  setDrillIntensity(v: number): void {
    if (this.drillGain && this.ctx) {
      this.drillGain.gain.setTargetAtTime(0.03 + v * 0.05, this.ctx.currentTime, 0.1)
    }
  }

  stopDrill(): void {
    if (this.drillSrc) {
      try { this.drillSrc.stop() } catch { /* already stopped */ }
      this.drillSrc = null
      this.drillGain = null
    }
  }

  // ── music: an 8-bar chiptune loop (melody / bass / drums), scheduled
  // ahead on the audio clock so timing stays tight regardless of the timer ──
  startMusic(): void {
    if (this.musicTimer !== null) return
    this.musicStep = 0
    this.nextNoteTime = 0
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 80)
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }

  private musicOut(): GainNode | null {
    if (!this.ctx || !this.master) return null
    if (!this.musicGain) {
      this.musicGain = this.ctx.createGain()
      // gentle fade-in so the loop never pops in abruptly
      this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime)
      this.musicGain.gain.linearRampToValueAtTime(0.55, this.ctx.currentTime + 1.5)
      this.musicGain.connect(this.master)
    }
    return this.musicGain
  }

  private scheduleMusic(): void {
    if (!this.ctx || this.isSilenced() || this.ctx.state !== 'running') return
    if (!this.musicOut()) return
    const sixteenth = 60 / TEMPO_BPM / 4
    if (this.nextNoteTime < this.ctx.currentTime) {
      this.nextNoteTime = this.ctx.currentTime + 0.06
    }
    // schedule a short window ahead of the playhead
    while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
      this.playMusicStep(this.musicStep % MELODY.length, this.nextNoteTime)
      this.musicStep++
      this.nextNoteTime += sixteenth
    }
  }

  private playMusicStep(step: number, t: number): void {
    const bar = Math.floor(step / 16)
    const s = step % 16

    // drums: light four-on-the-floor kick, snare on 2 & 4, offbeat hats
    if (s % 4 === 0) this.kickAt(t)
    if (s === 4 || s === 12) this.mNoise(t, 0.09, 0.05, 3500)
    if (s % 4 === 2) this.mNoise(t, 0.03, 0.022, 9000)
    if (s === 7 && bar % 2 === 1) this.mNoise(t, 0.03, 0.012, 9000) // ghost hat

    // bass: driving syncopated root notes with octave jumps
    if (s === 0 || s === 3 || s === 6 || s === 8 || s === 11 || s === 14) {
      const oct = s === 6 || s === 14 ? 2 : 1
      this.mTone(BASS_ROOTS[bar] * oct, t, 0.16, 'triangle', 0.16)
    }

    // lead: square melody with a quiet sine octave for sparkle
    const note = MELODY[step]
    if (note > 0) {
      this.mTone(note, t, 0.15, 'square', 0.042)
      this.mTone(note * 2, t, 0.12, 'sine', 0.018)
    }

    // deep-run intensity layer: extra hats + a chord-tone arpeggio
    if (this.musicIntensity > 0) {
      if (s % 4 === 1 || s % 4 === 3) this.mNoise(t, 0.025, 0.014, 10000)
      if (s % 2 === 0) {
        const arpRatios = [1, 1.5, 2, 3]
        const ratio = arpRatios[Math.floor(step / 2) % arpRatios.length]
        this.mTone(BASS_ROOTS[bar] * 4 * ratio, t, 0.1, 'square', 0.018)
      }
    }
  }

  private mTone(freq: number, t: number, dur: number, type: OscillatorType, vol: number): void {
    if (!this.ctx || !this.musicGain) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g).connect(this.musicGain)
    osc.start(t)
    osc.stop(t + dur + 0.03)
  }

  private mNoise(t: number, dur: number, vol: number, filterFreq: number): void {
    if (!this.ctx || !this.musicGain) return
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur))
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = filterFreq
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filter).connect(g).connect(this.musicGain)
    src.start(t)
  }

  private kickAt(t: number): void {
    if (!this.ctx || !this.musicGain) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1)
    g.gain.setValueAtTime(0.3, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    osc.connect(g).connect(this.musicGain)
    osc.start(t)
    osc.stop(t + 0.14)
  }
}

// ── music data: "Gem Tunnel Groove" — A minor, 132 BPM, 8 bars of 16ths ──
const TEMPO_BPM = 132

// note frequencies (Hz)
const A3 = 220.0, B3 = 246.94, C4 = 261.63, D4 = 293.66, E4 = 329.63
const F4 = 349.23, G4 = 392.0, A4 = 440.0, B4 = 493.88, C5 = 523.25

// chord progression: Am Am F G | Am Am F E — bass plays the roots (octave 2)
const BASS_ROOTS = [110, 110, 87.31, 98, 110, 110, 87.31, 82.41]

// one bar = 16 steps, 0 = rest
const BAR_AM_CALL = [A3, 0, C4, 0, E4, 0, D4, C4, D4, 0, C4, 0, A3, 0, 0, 0]
const BAR_AM_ANSWER = [A3, 0, C4, 0, E4, 0, G4, E4, A4, 0, G4, 0, E4, 0, D4, C4]
const BAR_F_LIFT = [F4, 0, A4, 0, G4, 0, F4, E4, D4, 0, E4, 0, C4, 0, 0, 0]
const BAR_G_DRIVE = [G4, 0, B4, 0, A4, 0, G4, E4, D4, 0, E4, 0, G4, 0, 0, 0]
const BAR_F_VAR = [F4, 0, A4, 0, C5, 0, A4, G4, F4, 0, G4, 0, A4, 0, 0, 0]
const BAR_E_CADENCE = [B3, 0, E4, 0, G4, 0, E4, 0, B3, 0, D4, 0, E4, 0, 0, 0]

const MELODY = [
  ...BAR_AM_CALL, ...BAR_AM_ANSWER, ...BAR_F_LIFT, ...BAR_G_DRIVE,
  ...BAR_AM_CALL, ...BAR_AM_ANSWER, ...BAR_F_VAR, ...BAR_E_CADENCE,
]

export const audio = new AudioManager()
