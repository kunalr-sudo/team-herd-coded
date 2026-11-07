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
          <SceneHtml key={p.index} position={[cx, 1.5, cz]} center zIndexRange={open ? [40, 30] : [20, 10]} style={{ pointerEvents: 'auto' }}>
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
              {open && (
                <div
                  className={`absolute left-1/2 w-[220px] -translate-x-1/2 rounded-xl ${p.row === 'north' ? 'top-9' : 'bottom-9'} bg-slate-950/92 px-3 py-2.5 text-left shadow-2xl backdrop-blur-sm`}
                  style={{ border: `1px solid ${color}aa` }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[12px] font-bold tracking-wide" style={{ color }}>
                      {p.label.toUpperCase()} · {status.title}
                    </div>
                    <button type="button" onClick={() => selectPen(null)} className="text-slate-400 hover:text-white" aria-label="Close">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="text-[12.5px] font-semibold text-slate-100">{status.condition}</div>
                  <div className="mt-0.5 text-[11.5px] text-slate-300">{status.healthLine}</div>
                  <div className="mt-2 grid grid-cols-2 gap-x-2 border-t border-slate-700/70 pt-1.5 font-mono text-[10.5px] leading-snug text-slate-400">
                    <span>Heat index</span>
                    <span className="text-slate-200">
                      THI {st.thi.toFixed(0)} · {thiCategory(st.thi)}
                    </span>
                    <span>Air temp</span>
                    <span className="text-slate-200">{st.tempC.toFixed(1)} °C</span>
                    <span>Humidity</span>
                    <span className="text-slate-200">{st.rh.toFixed(0)} %</span>
                    <span>Ammonia</span>
                    <span className="text-slate-200">{st.nh3.toFixed(0)} ppm</span>
                    <span>Air speed</span>
                    <span className="text-slate-200">{st.wind.toFixed(1)} m/s</span>
                    <span>Heat bunching</span>
                    <span className="text-slate-200">{Math.round(st.bunch * 100)} %</span>
                    <span>Germ load</span>
                    <span className="text-slate-200">{xray ? st.aerosol.toFixed(3) : 'X-Ray only'}</span>
                  </div>
                </div>
              )}
            </div>
          </SceneHtml>
        )
      })}
    </group>
  )
}
