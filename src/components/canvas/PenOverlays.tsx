import { X } from 'lucide-react'
import { HOSPITAL, PENS, thiCategory } from '../../sim/constants'
import { LEVEL_COLOR, penStatus } from '../../sim/narrative'
import { useSim } from '../../store/useSimulationStore'
import SceneHtml from './SceneHtml'
import { wx, wz } from './coords'

/** Small numbered status badges on every pen; the full card appears only for the selected pen. */
export default function PenOverlays() {
  const frame = useSim((s) => s.bundle.current.frames[s.hour])
  const xray = useSim((s) => s.xray)
  const selected = useSim((s) => s.selectedPen)
  const selectPen = useSim((s) => s.selectPen)

  return (
    <group>
      {PENS.map((p) => {
        const st = frame.pens[p.index]
        const status = penStatus(p.index, st, xray)
        const color = p.index === HOSPITAL ? '#22d3ee' : LEVEL_COLOR[status.level]
        const cx = wx((p.i0 + p.i1 + 1) / 2)
        const cz = wz((p.j0 + p.j1 + 1) / 2)
        const open = selected === p.index
        return (
          <SceneHtml key={p.index} position={[cx, 1.5, cz]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'auto' }}>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  selectPen(open ? null : p.index)
                }}
                title={`${p.label} — ${status.condition}. Click for details.`}
                className={`grid h-7 min-w-7 cursor-pointer place-items-center rounded-full px-1.5 text-[11px] font-extrabold text-slate-950 shadow-lg transition-transform hover:scale-110 ${
                  status.level === 'critical' ? 'animate-pulse' : ''
                } ${open ? 'scale-110 ring-2 ring-white' : ''}`}
                style={{ background: color, boxShadow: `0 0 14px ${color}aa` }}
              >
                {p.index === HOSPITAL ? '✚' : p.index + 1}
              </button>
            </div>
          </SceneHtml>
        )
      })}
      {selected !== null && <PenCard pen={selected} />}
    </group>
  )
}

/** Detail card for the selected pen; mounted separately so it always stacks above every badge. */
function PenCard({ pen }: { pen: number }) {
  const frame = useSim((s) => s.bundle.current.frames[s.hour])
  const xray = useSim((s) => s.xray)
  const selectPen = useSim((s) => s.selectPen)
  const p = PENS[pen]
  const st = frame.pens[pen]
  const status = penStatus(pen, st, xray)
  const color = pen === HOSPITAL ? '#22d3ee' : LEVEL_COLOR[status.level]
  const cx = wx((p.i0 + p.i1 + 1) / 2)
  const cz = wz((p.j0 + p.j1 + 1) / 2)
  return (
    <SceneHtml position={[cx, 1.5, cz]} center zIndexRange={[100, 90]} style={{ pointerEvents: 'auto' }}>
      <div className="relative">
        <div
          className={`sheet absolute left-1/2 w-[240px] -translate-x-1/2 rounded-[18px] px-4 py-3 text-left ${p.row === 'north' ? 'top-9' : 'bottom-9'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              <span className="text-[15px] font-semibold text-white">{p.label}</span>
              <span className="rounded-full px-1.5 py-px text-[11px] font-semibold" style={{ background: `${color}26`, color }}>
                {status.title === 'OK' ? 'OK' : status.title.charAt(0) + status.title.slice(1).toLowerCase()}
              </span>
            </div>
            <button type="button" onClick={() => selectPen(null)} className="press grid h-6 w-6 place-items-center rounded-full bg-white/10 text-slate-300 hover:text-white" aria-label="Close">
              <X size={13} />
            </button>
          </div>
          <div className="mt-1.5 text-[13.5px] font-medium text-slate-100">{status.condition}</div>
          <div className="mt-0.5 text-[12.5px] text-slate-400">{status.healthLine}</div>
          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-0.5 border-t border-white/[0.08] pt-2 text-[12px] leading-snug text-slate-400">
            <span>Heat index</span>
            <span className="text-right tabular-nums text-slate-200">
              THI {st.thi.toFixed(0)} · {thiCategory(st.thi)}
            </span>
            <span>Air temp</span>
            <span className="text-right tabular-nums text-slate-200">{st.tempC.toFixed(1)} °C</span>
            <span>Humidity</span>
            <span className="text-right tabular-nums text-slate-200">{st.rh.toFixed(0)} %</span>
            <span>Ammonia</span>
            <span className="text-right tabular-nums text-slate-200">{st.nh3.toFixed(0)} ppm</span>
            <span>Air speed</span>
            <span className="text-right tabular-nums text-slate-200">{st.wind.toFixed(1)} m/s</span>
            <span>Heat bunching</span>
            <span className="text-right tabular-nums text-slate-200">{Math.round(st.bunch * 100)} %</span>
            <span>Germ load</span>
            <span className="text-right tabular-nums text-slate-200">{xray ? st.aerosol.toFixed(3) : 'X-Ray only'}</span>
          </div>
        </div>
      </div>
    </SceneHtml>
  )
}
