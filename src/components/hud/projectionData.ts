import type { CounterfactualBundle, PlanKind, ScenarioResult } from '../../sim/cattleEngine'
import type { ChartSeries } from './ProjectionChart'

export const PLAN_NAME: Record<PlanKind, string> = {
  none: 'BarnTwin recommendation',
  naive: 'Naive fan boost',
  smart: 'BarnTwin recommendation',
  custom: 'Your custom plan',
}

export const activeInfections = (r: ScenarioResult) => r.frames.map((f) => f.totals.sick + f.totals.quiet)

/** The plan compared against "do nothing": your plan, or BarnTwin's recommendation if you haven't acted. */
export function comparedPlan(bundle: CounterfactualBundle, kind: PlanKind) {
  return kind === 'none' ? bundle.smart : bundle.current
}

export function chartSeries(bundle: CounterfactualBundle, kind: PlanKind): ChartSeries[] {
  const plan = comparedPlan(bundle, kind)
  const out: ChartSeries[] = [{ data: activeInfections(bundle.doNothing), color: '#ef4444', dash: '5 4', label: 'Do nothing' }]
  if (kind !== 'naive') out.push({ data: activeInfections(bundle.naive), color: '#f59e0b', dash: '1.5 3', width: 1.6, label: 'Naive fan boost' })
  out.push({
    data: activeInfections(plan),
    color: kind === 'naive' ? '#f59e0b' : '#22c55e',
    width: 2.6,
    label: PLAN_NAME[kind],
  })
  return out
}
