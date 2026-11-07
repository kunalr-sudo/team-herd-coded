import { ChevronLeft, Droplets, Fan, Flame, Hospital, Layers, Pill, SlidersHorizontal, Timer, Wind } from 'lucide-react'
import type { ReactNode } from 'react'
import { HERD_SIZE, TIMELINE, hourLabel } from '../../sim/constants'
import type { AbxStrategy } from '../../sim/cattleEngine'
import { penList } from '../../sim/narrative'
import { useSim, type HeatmapMode } from '../../store/useSimulationStore'
import { HEATMAP_LEGEND } from '../canvas/heatmapLegend'
import { IconTile, Row, Segmented, StepSlider, Switch } from '../ui/controls'

function Section({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 px-4 text-[12px] font-medium uppercase tracking-[0.06em] text-slate-400">{title}</h3>
      <div className="grouped">{children}</div>
      {footer && <p className="mt-1.5 px-4 text-[12px] leading-snug text-slate-500">{footer}</p>}
    </section>
  )
}

export default function ControlPanel() {
  const open = useSim((s) => s.controlsOpen)
  const toggle = useSim((s) => s.toggleControls)
  const crisis = useSim((s) => s.crisis)
  const plan = useSim((s) => s.plan)
  const kind = useSim((s) => s.planKind)
  const setCrisis = useSim((s) => s.setCrisis)
  const setPlan = useSim((s) => s.setPlan)
  const resetPlan = useSim((s) => s.resetPlan)
  const applyRecommendation = useSim((s) => s.applyRecommendation)
  const heatmap = useSim((s) => s.heatmap)
  const setHeatmap = useSim((s) => s.setHeatmap)
  const current = useSim((s) => s.bundle.current)
  const targeted = current.config.abx === 'targeted' ? current.targetedPens : []

  if (!open)
    return (
      <button type="button" onClick={toggle} className="panel press pointer-events-auto absolute left-3 top-[140px] z-10 flex items-center gap-2 !rounded-full px-4 py-2.5 text-[13.5px] font-medium text-white">
        <SlidersHorizontal size={16} className="text-cyan-300" /> Controls
      </button>
    )

  const heatFill = ((crisis.heatwaveTemp - 30) / 12) * 100
  const actFill = ((plan.actionHour - TIMELINE.crisisHour) / (96 - TIMELINE.crisisHour)) * 100
  const abxHint =
    plan.abx === 'targeted' && targeted.length
      ? `${penList(targeted)} · ${current.summary.metaphylaxisDoses} doses`
      : plan.abx === 'blanket'
        ? `${HERD_SIZE} preventive doses`
        : 'Only cows that look sick'

  return (
    <div className="panel pointer-events-auto absolute left-3 top-[140px] bottom-[108px] z-10 flex w-[320px] flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="text-[17px] font-semibold tracking-tight text-white">Controls</div>
        <button type="button" onClick={toggle} className="press grid h-7 w-7 place-items-center rounded-full bg-white/10 text-slate-300 hover:text-white" aria-label="Collapse panel" title="Collapse">
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        <div className="px-1">
          <Segmented
            value={kind === 'smart' ? 'smart' : kind === 'none' ? 'none' : 'custom'}
            onChange={(v) => (v === 'smart' ? applyRecommendation() : v === 'none' ? resetPlan() : undefined)}
            options={[
              { id: 'none', label: 'No action' },
              { id: 'smart', label: 'BarnTwin plan' },
            ]}
          />
          <p className="mt-1.5 px-1 text-[12px] text-slate-500">
            {kind === 'custom' || kind === 'naive' ? 'Custom plan — your own choices below.' : 'Or change any switch below to build your own plan.'}
          </p>
        </div>

        <Section title="Crisis">
          <Row
            icon={
              <IconTile color="orange">
                <Flame size={16} />
              </IconTile>
            }
            title="Heatwave peak"
            trailing={<span className="text-[15px] font-semibold tabular-nums text-white">{crisis.heatwaveTemp}°C</span>}
          >
            <input
              type="range"
              min={30}
              max={42}
              value={crisis.heatwaveTemp}
              onChange={(e) => setCrisis({ heatwaveTemp: Number(e.target.value) })}
              aria-label="Heatwave peak"
              className="ios-slider"
              style={{ ['--fill' as string]: `${heatFill}%`, ['--fill-bg' as string]: 'linear-gradient(90deg,#fbbf24,#f97316,#ef4444)' }}
            />
          </Row>
          <Row
            icon={
              <IconTile color={crisis.fanBFault ? 'red' : 'slate'}>
                <Fan size={16} />
              </IconTile>
            }
            title="Fan B fails"
            subtitle={`At ${hourLabel(TIMELINE.crisisHour)}`}
            trailing={<Switch on={crisis.fanBFault} onChange={(v) => setCrisis({ fanBFault: v })} label="Fan B fails" tone="red" />}
            onClick={() => setCrisis({ fanBFault: !crisis.fanBFault })}
            divider={false}
          />
        </Section>

        <Section title="Disease response">
          <Row
            icon={
              <IconTile color="red">
                <Hospital size={16} />
              </IconTile>
            }
            title="Isolate sick cows"
            subtitle="Downwind Hospital Pen"
            trailing={<Switch on={plan.isolate} onChange={(v) => setPlan({ isolate: v })} label="Isolate sick cows" />}
            onClick={() => setPlan({ isolate: !plan.isolate })}
          />
          <Row
            icon={
              <IconTile color="purple">
                <Pill size={16} />
              </IconTile>
            }
            title="Antibiotics"
            subtitle={abxHint}
            divider={false}
          >
            <Segmented<AbxStrategy>
              value={plan.abx}
              onChange={(v) => setPlan({ abx: v })}
              options={[
                { id: 'reactive', label: 'Sick' },
                { id: 'targeted', label: 'Exposed' },
                { id: 'blanket', label: 'All' },
              ]}
            />
          </Row>
        </Section>

        <Section title="Climate response">
          <Row
            icon={
              <IconTile color="blue">
                <Wind size={16} />
              </IconTile>
            }
            title="Boost fans"
            subtitle="Extra speed on the working fans"
            trailing={<span className="text-[15px] font-semibold tabular-nums text-white">{plan.fanBoostPct ? `+${plan.fanBoostPct}%` : 'Off'}</span>}
          >
            <StepSlider value={plan.fanBoostPct} onChange={(v) => setPlan({ fanBoostPct: v })} label="Boost fans" color="#38bdf8" />
          </Row>
          <Row
            icon={
              <IconTile color="teal">
                <Fan size={16} />
              </IconTile>
            }
            title="Rebalance airflow"
            subtitle="Baffles + portable fan"
            trailing={<Switch on={plan.rebalance} onChange={(v) => setPlan({ rebalance: v })} label="Rebalance airflow" />}
            onClick={() => setPlan({ rebalance: !plan.rebalance })}
          />
          <Row
            icon={
              <IconTile color="cyan">
                <Droplets size={16} />
              </IconTile>
            }
            title="Cooling misters"
            subtitle="Evaporative cooling at the inlets"
            trailing={<span className="text-[15px] font-semibold tabular-nums text-white">{plan.misterPct ? `${plan.misterPct}%` : 'Off'}</span>}
            divider={false}
          >
            <StepSlider value={plan.misterPct} onChange={(v) => setPlan({ misterPct: v })} label="Cooling misters" color="#22d3ee" />
          </Row>
        </Section>

        <Section title="When to act" footer={`BarnTwin spots the hidden spread by Hour ${TIMELINE.defaultActionHour}. Farmers usually notice about 48 hours later.`}>
          <Row
            icon={
              <IconTile color="orange">
                <Timer size={16} />
              </IconTile>
            }
            title={`Hour ${plan.actionHour}`}
            subtitle={hourLabel(plan.actionHour)}
            divider={false}
          >
            <input
              type="range"
              min={TIMELINE.crisisHour}
              max={96}
              step={2}
              value={plan.actionHour}
              onChange={(e) => setPlan({ actionHour: Number(e.target.value) })}
              aria-label="Hour to act"
              className="ios-slider"
              style={{ ['--fill' as string]: `${actFill}%`, ['--fill-bg' as string]: '#22d3ee' }}
            />
          </Row>
        </Section>

        <Section title="Floor map">
          <Row
            icon={
              <IconTile color="slate">
                <Layers size={16} />
              </IconTile>
            }
            title="Colour the floor by"
            divider={false}
          >
            <Segmented<HeatmapMode>
              value={heatmap}
              onChange={setHeatmap}
              options={[
                { id: 'none', label: 'Off' },
                { id: 'germ', label: 'Germs' },
                { id: 'heat', label: 'Heat' },
                { id: 'ammonia', label: 'NH₃' },
              ]}
            />
            {heatmap !== 'none' && (
              <div className="mt-2.5">
                <div className="h-1.5 rounded-full" style={{ background: HEATMAP_LEGEND[heatmap].gradient }} />
                <div className="mt-1 flex justify-between text-[11.5px] text-slate-500">
                  <span>{HEATMAP_LEGEND[heatmap].lo}</span>
                  <span>{HEATMAP_LEGEND[heatmap].label}</span>
                  <span>{HEATMAP_LEGEND[heatmap].hi}</span>
                </div>
              </div>
            )}
          </Row>
        </Section>
      </div>
    </div>
  )
}
