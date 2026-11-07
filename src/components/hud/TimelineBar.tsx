import { Moon, Pause, Play, Sun } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { HOURS, TIMELINE, hourLabel } from '../../sim/constants'
import { daylightFactor, daylightFor, type LightingMode } from '../../sim/daylight'
import { SPEEDS, useSim } from '../../store/useSimulationStore'
import { Segmented } from '../ui/controls'

export default function TimelineBar({ presetKeys = false }: { presetKeys?: boolean }) {
  const hour = useSim((s) => s.hour)
  const playing = useSim((s) => s.playing)
  const speed = useSim((s) => s.speed)
  const setHour = useSim((s) => s.setHour)
  const togglePlay = useSim((s) => s.togglePlay)
  const setSpeed = useSim((s) => s.setSpeed)
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
    return `rgba(${Math.round(40 + 150 * d)}, ${Math.round(52 + 150 * d)}, ${Math.round(90 + 120 * d)}, ${(0.35 + 0.25 * d).toFixed(2)}) ${((h / HOURS) * 100).toFixed(1)}%`
  }).join(', ')})`
  const markers: { h: number; label: string; color: string; align: 'left' | 'right' }[] = [
    ...(fault ? [{ h: TIMELINE.crisisHour, label: 'Fan B fails', color: '#f87171', align: 'left' as const }] : []),
    { h: actionHour, label: 'BarnTwin acts', color: '#67e8f9', align: 'right' },
    { h: peakHour, label: 'Peak if nobody acts', color: '#fdba74', align: peakHour > 120 ? 'left' : 'right' },
  ]
  const isDay = daylight > 0.3

  return (
    <div className="panel pointer-events-auto absolute inset-x-3 bottom-3 z-10 flex items-center gap-4 px-4 py-3">
      <button
        type="button"
        onClick={togglePlay}
        className="press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-slate-950 shadow-[0_6px_20px_-6px_rgba(255,255,255,0.5)] hover:bg-slate-100"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
      </button>

      <div className="w-[150px] shrink-0 leading-tight">
        <div className="flex items-center gap-1.5 text-[17px] font-semibold tracking-tight text-white">
          {isDay ? <Sun size={16} className="text-amber-300" /> : <Moon size={15} className="text-indigo-300" />}
          {hourLabel(hour)}
        </div>
        <div className="mt-0.5 text-[12px] text-slate-400">
          Hour {hour} of {HOURS} · {weather.tempC.toFixed(0)}°C
        </div>
      </div>

      <div className="relative min-w-0 flex-1 pt-3.5 pb-4">
        <div
          className="pointer-events-none absolute -translate-x-1/2 top-0 whitespace-nowrap text-[11px] font-medium text-amber-200/80"
          style={{ left: pct((TIMELINE.hiddenSpreadStart + TIMELINE.hiddenSpreadEnd) / 2) }}
        >
          Hidden spread
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-[24px] h-2 overflow-hidden rounded-full" style={{ background: dayNight }}>
          <div className="absolute inset-y-0 left-0 bg-cyan-300/70" style={{ width: pct(hour) }} />
          <div
            className="absolute inset-y-0 bg-amber-300/35"
            style={{ left: pct(TIMELINE.hiddenSpreadStart), width: pct(TIMELINE.hiddenSpreadEnd - TIMELINE.hiddenSpreadStart) }}
          />
        </div>
        {markers.map((m) => (
          <span key={`dot-${m.label}`} className="pointer-events-none absolute top-[25px] h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ left: pct(m.h), background: m.color }} />
        ))}
        <input
          type="range"
          min={0}
          max={HOURS}
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          className="scrubber relative z-10 mt-[3px]"
          aria-label="Simulation hour"
          aria-valuetext={`${hourLabel(hour)}, hour ${hour}`}
        />
        {markers.map((m) => (
          <button
            type="button"
            key={m.label}
            onClick={() => setHour(m.h)}
            className={`absolute bottom-0 z-20 whitespace-nowrap text-[11px] font-medium opacity-90 hover:opacity-100 ${m.align === 'left' ? '-translate-x-full pr-1' : 'pl-1'}`}
            style={{ left: pct(m.h), color: m.color }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="w-[176px] shrink-0">
        <Segmented
          value={String(speed)}
          onChange={(v) => setSpeed(Number(v) as (typeof SPEEDS)[number])}
          options={[
            { id: '2', label: 'Slow' },
            { id: '6', label: 'Normal' },
            { id: '12', label: 'Fast' },
          ]}
        />
      </div>
      <div className="w-[118px] shrink-0" title="Lighting: follow the clock, always day, or always night">
        <Segmented<LightingMode>
          value={lighting}
          onChange={setLighting}
          options={[
            { id: 'auto', label: 'Auto' },
            { id: 'day', label: '☀︎' },
            { id: 'night', label: '☾' },
          ]}
        />
      </div>
    </div>
  )
}
