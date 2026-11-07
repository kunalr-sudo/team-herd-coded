import { Moon, Pause, Play, Sun, SunMoon, Thermometer } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { HOURS, TIMELINE, hourLabel } from '../../sim/constants'
import { daylightFactor, daylightFor, type LightingMode } from '../../sim/daylight'
import { useSim } from '../../store/useSimulationStore'

export default function TimelineBar({ presetKeys = false }: { presetKeys?: boolean }) {
  const hour = useSim((s) => s.hour)
  const playing = useSim((s) => s.playing)
  const speed = useSim((s) => s.speed)
  const setHour = useSim((s) => s.setHour)
  const togglePlay = useSim((s) => s.togglePlay)
  const cycleSpeed = useSim((s) => s.cycleSpeed)
  const actionHour = useSim((s) => s.plan.actionHour)
  const fault = useSim((s) => s.crisis.fanBFault)
  const peakHour = useSim((s) => s.bundle.doNothing.summary.peakSickHour)
  const weather = useSim((s) => s.bundle.current.frames[s.hour].weather)
  const lighting = useSim((s) => s.lighting)
  const setLighting = useSim((s) => s.setLighting)
  const acc = useRef(0)
  const daylight = daylightFor(hour, lighting)

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      acc.current += dt * useSim.getState().speed
      const steps = Math.floor(acc.current)
      if (steps > 0) {
        acc.current -= steps
        useSim.getState().advance(steps)
      }
      if (useSim.getState().playing) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowRight') setHour(useSim.getState().hour + 1)
      else if (e.key === 'ArrowLeft') setHour(useSim.getState().hour - 1)
      else if (e.key === 'x' || e.key === 'X') useSim.getState().setXray(!useSim.getState().xray)
      else if (presetKeys && ['1', '2', '3', '4'].includes(e.key)) useSim.getState().applyPreset(Number(e.key) as 1 | 2 | 3 | 4)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, setHour, presetKeys])

  const pct = (h: number) => `${(h / HOURS) * 100}%`
  const dayNight = `linear-gradient(90deg, ${Array.from({ length: 29 }, (_, k) => {
    const h = (k / 28) * HOURS
    const d = daylightFactor(h % 24)
    return `rgba(${Math.round(30 + 200 * d)}, ${Math.round(41 + 170 * d)}, ${Math.round(80 + 80 * d)}, 0.55) ${((h / HOURS) * 100).toFixed(1)}%`
  }).join(', ')})`
  const lightModes: { id: LightingMode; icon: ReactNode; title: string }[] = [
    { id: 'auto', icon: <SunMoon size={14} />, title: 'Follow the simulation clock (sunlight → moonlight)' },
    { id: 'day', icon: <Sun size={14} />, title: 'Always daytime' },
    { id: 'night', icon: <Moon size={14} />, title: 'Always night' },
  ]
  // Labels extend away from their neighbours so the early markers never overlap.
  const markers: { h: number; label: string; color: string; align: 'left' | 'right' }[] = [
    ...(fault ? [{ h: TIMELINE.crisisHour, label: 'Fan B fails', color: '#ef4444', align: 'left' as const }] : []),
    { h: actionHour, label: 'BarnTwin acts', color: '#22d3ee', align: 'right' },
    { h: peakHour, label: 'Outbreak peak (no action)', color: '#f97316', align: peakHour > 120 ? 'left' : 'right' },
  ]

  return (
    <div className="panel pointer-events-auto absolute inset-x-3 bottom-3 z-10 flex items-center gap-3 px-3 py-2.5">
      <button
        type="button"
        onClick={togglePlay}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-400 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.5)] hover:bg-cyan-300"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>
      <button
        type="button"
        onClick={cycleSpeed}
        className="shrink-0 rounded-md border border-slate-600/70 px-2 py-1 font-mono text-[11px] text-slate-300 hover:border-slate-400"
        title="Simulated hours per second"
      >
        {speed}h/s
      </button>
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-700"
        style={{ background: daylight > 0.3 ? `rgba(253, 224, 71, ${0.25 + 0.5 * daylight})` : 'rgba(129, 140, 248, 0.25)' }}
        title={daylight > 0.3 ? 'Daytime' : 'Night'}
      >
        {daylight > 0.3 ? <Sun size={20} className="text-yellow-200" /> : <Moon size={18} className="text-indigo-200" />}
      </div>
      <div className="w-[170px] shrink-0 whitespace-nowrap leading-tight">
        <div className="font-mono text-[18px] font-bold text-slate-50">Hour {hour}</div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          {hourLabel(hour)} · <Thermometer size={11} /> {weather.tempC.toFixed(0)}°C outside
        </div>
      </div>
      <div className="relative flex-1 pt-4 pb-4">
        <div className="pointer-events-none absolute inset-x-0 top-[19px] h-3.5 rounded" style={{ background: dayNight }} />
        <div
          className="absolute top-[22px] h-2 rounded bg-yellow-400/15 border border-yellow-400/25"
          style={{ left: pct(TIMELINE.hiddenSpreadStart), width: pct(TIMELINE.hiddenSpreadEnd - TIMELINE.hiddenSpreadStart) }}
          title="Hidden spread window — infected cattle look healthy"
        />
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-yellow-300/85"
          style={{ left: pct((TIMELINE.hiddenSpreadStart + TIMELINE.hiddenSpreadEnd) / 2) }}
        >
          Hidden spread window
        </div>
        {[24, 48, 72, 96, 120, 144].map((h) => (
          <div key={h} className="pointer-events-none absolute top-[18px] h-4 w-px bg-slate-500/40" style={{ left: pct(h) }} />
        ))}
        <input
          type="range"
          min={0}
          max={HOURS}
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          className="timeline relative z-10 w-full"
          aria-label="Simulation hour"
        />
        {markers.map((m) => (
          <button
            type="button"
            key={m.label}
            onClick={() => setHour(m.h)}
            className={`absolute bottom-0 z-20 whitespace-nowrap text-[10px] font-semibold hover:underline ${
              m.align === 'left' ? '-translate-x-full' : ''
            }`}
            style={{ left: pct(m.h), color: m.color }}
          >
            {m.align === 'left' ? `${m.label} ▲` : `▲ ${m.label}`}
          </button>
        ))}
      </div>
      <div className="flex shrink-0 rounded-lg border border-slate-600/60 p-0.5" title="Lighting">
        {lightModes.map((m) => (
          <button
            type="button"
            key={m.id}
            onClick={() => setLighting(m.id)}
            title={m.title}
            className={`rounded-md px-2 py-1.5 ${lighting === m.id ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            {m.icon}
          </button>
        ))}
      </div>
    </div>
  )
}
