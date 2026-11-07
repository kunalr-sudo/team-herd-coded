import { HOSPITAL, PENS, thiCategory } from '../../sim/constants'
import { LEVEL_COLOR, penStatus } from '../../sim/narrative'
import { useSim } from '../../store/useSimulationStore'
import SceneHtml from './SceneHtml'
import { wx, wz } from './coords'

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
        // North cards float above the north wall, south cards sit in front of the south wall.
        const z = p.row === 'north' ? wz(0) - 0.4 : wz(12) + 1.5
        const y = p.row === 'north' ? 3.4 : 0
        const open = selected === p.index
        return (
          <SceneHtml
            key={p.index}
            position={[cx, y, z]}
            center
            zIndexRange={open ? [40, 30] : [20, 10]}
            style={{ pointerEvents: 'auto' }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                selectPen(open ? null : p.index)
              }}
              className="text-left rounded-lg px-2 py-1.5 w-[140px] cursor-pointer transition-colors bg-slate-950/85 hover:bg-slate-900/95 backdrop-blur-sm"
              style={{ border: `1px solid ${color}88`, boxShadow: `0 0 18px ${color}33` }}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide" style={{ color }}>
                <span
                  className={`inline-block h-2 w-2 rounded-full ${status.level === 'critical' ? 'animate-pulse' : ''}`}
                  style={{ background: color }}
                />
                {p.index === HOSPITAL ? 'HOSPITAL' : p.label.toUpperCase()} · {status.title}
              </div>
              <div className="text-[11px] font-semibold text-slate-100 leading-tight">{status.condition}</div>
              <div className="text-[10.5px] text-slate-300 leading-tight mt-0.5">{status.healthLine}</div>
              <div className="font-mono text-[9px] text-slate-500 mt-1 leading-tight">
                THI {st.thi.toFixed(0)} | NH₃ {st.nh3.toFixed(0)} ppm
                <br />
                Wind {st.wind.toFixed(1)} m/s
              </div>
              {open && (
                <div className="font-mono text-[9.5px] text-slate-400 mt-1 pt-1 border-t border-slate-700/70 grid grid-cols-2 gap-x-2 leading-snug">
                  <span>Air temp</span>
                  <span className="text-slate-200">{st.tempC.toFixed(1)} °C</span>
                  <span>Humidity</span>
                  <span className="text-slate-200">{st.rh.toFixed(0)} %</span>
                  <span>Heat index</span>
                  <span className="text-slate-200">{thiCategory(st.thi)}</span>
                  <span>Heat bunching</span>
                  <span className="text-slate-200">{Math.round(st.bunch * 100)} %</span>
                  <span>Germ load</span>
                  <span className="text-slate-200">{xray ? st.aerosol.toFixed(3) : 'X-Ray only'}</span>
                  <span>Treated/protected</span>
                  <span className="text-slate-200">{st.protectedCount}</span>
                </div>
              )}
            </button>
          </SceneHtml>
        )
      })}
    </group>
  )
}
