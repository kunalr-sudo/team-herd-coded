// Pasture soundscape: recorded moo / birdsong / cricket clips from public/sounds, with a
// synthesised breeze. If a clip fails to load, the synthesised moo/chirp is used instead.

const CLIPS = {
  moo: 'sounds/cow-moo.mp3',
  birdsA: 'sounds/birds-chirpingss.mp3',
  birdsB: 'sounds/birds-chirping-js.mp3',
  crickets: 'sounds/crickets-chirping.mp3',
}
type ClipName = keyof typeof CLIPS

class PastureAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private birdTimer: number | null = null
  private breeze: AudioBufferSourceNode | null = null
  private crickets: { src: AudioBufferSourceNode; gain: GainNode } | null = null
  private clips: Partial<Record<ClipName, AudioBuffer>> = {}
  private loading: Promise<void> | null = null
  enabled = false
  private night = false

  private loadClips() {
    const { ctx } = this.ensure()
    this.loading ??= Promise.all(
      (Object.keys(CLIPS) as ClipName[]).map(async (name) => {
        try {
          const res = await fetch(`${import.meta.env.BASE_URL}${CLIPS[name]}`)
          if (!res.ok) return
          this.clips[name] = await ctx.decodeAudioData(await res.arrayBuffer())
        } catch {
          // Missing/undecodable clip: synthesised fallback is used.
        }
      }),
    ).then(() => undefined)
    return this.loading
  }

  private playClip(name: ClipName, { pan = 0, gain = 1, rate = 1 } = {}) {
    const buf = this.clips[name]
    if (!buf || !this.ctx || !this.master) return false
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = rate
    const g = this.ctx.createGain()
    g.gain.value = gain
    const p = this.ctx.createStereoPanner()
    p.pan.value = Math.max(-1, Math.min(1, pan))
    src.connect(g).connect(p).connect(this.master)
    src.start()
    return true
  }

  /** Day: birds. Night: looping crickets, no birds. */
  setNight(night: boolean) {
    this.night = night
    if (!this.enabled) return
    if (night) this.startCrickets()
    else this.stopCrickets()
  }

  private startCrickets() {
    const buf = this.clips.crickets
    if (!buf || !this.ctx || !this.master || this.crickets) return
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0, this.ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.45, this.ctx.currentTime + 1.5)
    src.connect(gain).connect(this.master)
    src.start()
    this.crickets = { src, gain }
  }

  private stopCrickets() {
    if (!this.crickets || !this.ctx) return
    const { src, gain } = this.crickets
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8)
    src.stop(this.ctx.currentTime + 0.9)
    this.crickets = null
  }

  private ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.9
      this.master.connect(this.ctx.destination)
    }
    return { ctx: this.ctx, master: this.master! }
  }

  /**
   * Starts the soundscape. If the browser hasn't allowed audio yet (no user interaction),
   * everything is scheduled silently and becomes audible after `unlock()` on the first gesture.
   */
  async enable() {
    const { ctx } = this.ensure()
    void ctx.resume()
    await this.loadClips()
    if (this.enabled) return
    this.enabled = true
    this.startBreeze()
    this.scheduleBirds()
    if (this.night) this.startCrickets()
  }

  /** Resume audio from inside a user gesture. */
  unlock() {
    if (this.enabled) void this.ctx?.resume()
  }

  get running() {
    return this.ctx?.state === 'running'
  }

  disable() {
    this.enabled = false
    if (this.birdTimer) window.clearTimeout(this.birdTimer)
    this.birdTimer = null
    this.breeze?.stop()
    this.breeze = null
    this.crickets?.src.stop()
    this.crickets = null
    void this.ctx?.suspend()
  }

  private startBreeze() {
    const { ctx, master } = this.ensure()
    if (this.breeze) return
    const len = ctx.sampleRate * 4
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      last = last * 0.97 + (Math.random() * 2 - 1) * 0.03
      data[i] = last * 3
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 500
    const g = ctx.createGain()
    g.gain.value = 0.05
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.08
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.03
    lfo.connect(lfoGain).connect(g.gain)
    src.connect(lp).connect(g).connect(master)
    src.start()
    lfo.start()
    this.breeze = src
  }

  private scheduleBirds() {
    if (!this.enabled) return
    this.birdTimer = window.setTimeout(
      () => {
        if (!this.night) {
          const clip = Math.random() < 0.5 ? 'birdsA' : 'birdsB'
          const played = this.playClip(clip, { pan: Math.random() * 1.4 - 0.7, gain: 0.35 + Math.random() * 0.25, rate: 0.95 + Math.random() * 0.1 })
          if (!played) {
            if (Math.random() < 0.7) this.chirp()
            else this.whistle()
          }
        }
        this.scheduleBirds()
      },
      2500 + Math.random() * 5000,
    )
  }

  /** Recorded moo with slight pitch variation; falls back to a synthesised moo. */
  moo(pan = 0) {
    if (!this.enabled || !this.ctx) return
    if (this.playClip('moo', { pan, gain: 0.9, rate: 0.88 + Math.random() * 0.22 })) return
    this.synthMoo(pan)
  }

  /** Synthesised moo: detuned sawtooths through a vowel-like filter with a rise-and-fall pitch glide. */
  private synthMoo(pan: number) {
    if (!this.ctx) return
    const { ctx, master } = this.ensure()
    const t = ctx.currentTime + 0.02
    const dur = 1.3 + Math.random() * 0.7
    const f0 = 95 + Math.random() * 45

    const out = ctx.createGain()
    out.gain.setValueAtTime(0, t)
    out.gain.linearRampToValueAtTime(0.32, t + 0.14)
    out.gain.setValueAtTime(0.32, t + dur - 0.45)
    out.gain.linearRampToValueAtTime(0, t + dur)
    const panner = ctx.createStereoPanner()
    panner.pan.value = Math.max(-1, Math.min(1, pan))

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.Q.value = 3.5
    lp.frequency.setValueAtTime(260, t)
    lp.frequency.linearRampToValueAtTime(1050, t + 0.35)
    lp.frequency.linearRampToValueAtTime(560, t + dur)
    const formant = ctx.createBiquadFilter()
    formant.type = 'peaking'
    formant.frequency.value = 650
    formant.Q.value = 2
    formant.gain.value = 8

    const vib = ctx.createOscillator()
    vib.frequency.value = 4.5
    const vibGain = ctx.createGain()
    vibGain.gain.value = 2.5
    vib.connect(vibGain)

    for (const detune of [1, 1.006]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(f0 * 0.82 * detune, t)
      o.frequency.linearRampToValueAtTime(f0 * 1.1 * detune, t + 0.3)
      o.frequency.linearRampToValueAtTime(f0 * 0.72 * detune, t + dur)
      vibGain.connect(o.frequency)
      o.connect(lp)
      o.start(t)
      o.stop(t + dur + 0.05)
    }
    vib.start(t)
    vib.stop(t + dur + 0.05)
    lp.connect(formant).connect(out).connect(panner).connect(master)
  }

  private chirp() {
    const { ctx, master } = this.ensure()
    const n = 2 + Math.floor(Math.random() * 4)
    const base = 2600 + Math.random() * 1600
    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.random() * 1.6 - 0.8
    pan.connect(master)
    for (let i = 0; i < n; i++) {
      const t = ctx.currentTime + 0.02 + i * (0.09 + Math.random() * 0.05)
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(base, t)
      o.frequency.exponentialRampToValueAtTime(base * 1.6, t + 0.045)
      o.frequency.exponentialRampToValueAtTime(base * 0.95, t + 0.085)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.06, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
      o.connect(g).connect(pan)
      o.start(t)
      o.stop(t + 0.12)
    }
  }

  private whistle() {
    const { ctx, master } = this.ensure()
    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.random() * 1.6 - 0.8
    pan.connect(master)
    const notes = [2300 + Math.random() * 300, 1750 + Math.random() * 200]
    notes.forEach((f, i) => {
      const t = ctx.currentTime + 0.02 + i * 0.28
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(f, t)
      o.frequency.linearRampToValueAtTime(f * 0.97, t + 0.22)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.045, t + 0.03)
      g.gain.linearRampToValueAtTime(0, t + 0.24)
      o.connect(g).connect(pan)
      o.start(t)
      o.stop(t + 0.26)
    })
  }
}

export const pastureAudio = new PastureAudio()
