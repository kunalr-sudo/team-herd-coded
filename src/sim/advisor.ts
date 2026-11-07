// "BarnTwin AI" advisor: turns the simulation into Sense -> Predict -> Recommend statements,
// so it is obvious BarnTwin is a disease early-warning system, not just a climate controller.

import { HERD_SIZE, TIMELINE } from './constants'
import type { CounterfactualBundle, PlanKind } from './cattleEngine'
import { penList } from './narrative'

export type AdviceMode = 'monitoring' | 'alert' | 'scheduled' | 'acting'

export interface Advice {
  mode: AdviceMode
  sensing: string
  predicting: string
  actions: string[]
  payoff: string
}

export const usd = (n: number) => `${n < 0 ? '−' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`

export function advise(bundle: CounterfactualBundle, kind: PlanKind, hour: number, fanBFault: boolean): Advice {
  const fr = bundle.current.frames[hour]
  const base = bundle.doNothing.summary
  const smart = bundle.smart
  const actionHour = bundle.current.config.actionHour

  // Sensing: the worst pen by heat + stagnation.
  const prod = fr.pens.slice(0, 8)
  const worst = prod.reduce((bi, p, i) => (p.thi - p.wind * 2 > prod[bi].thi - prod[bi].wind * 2 ? i : bi), 0)
  const w = prod[worst]
  const avgTHI = prod.reduce((s, p) => s + p.thi, 0) / 8
  const sensing =
    avgTHI < 75 && w.wind > 1
      ? `All pens comfortable — THI ${avgTHI.toFixed(0)}, fresh air moving.`
      : w.wind < 0.9
        ? `Pen ${worst + 1} is hot & stagnant: THI ${w.thi.toFixed(0)}, air ${w.wind.toFixed(1)} m/s, NH₃ ${w.nh3.toFixed(0)} ppm.`
        : `Heat stress across the barn: THI ${avgTHI.toFixed(0)} (cows start bunching above 76).`

  const quietPens = prod.map((p, i) => ({ i, n: p.quiet })).filter((x) => x.n > 0).map((x) => x.i)
  const hidden = fr.totals.quiet
  const crisis = fanBFault && hour >= TIMELINE.crisisHour

  const actions = [
    'Move every sick calf to the downwind Hospital Pen',
    'Rebalance airflow: close Pen 3 baffles + portable fan at B',
    'Boost ventilation +25% and switch on cooling misters',
    `Treat only the exposed pens (${penList(smart.targetedPens)}, ${smart.summary.metaphylaxisDoses} doses — not ${HERD_SIZE})`,
  ]
  const payoff = `${usd(base.cost.total - smart.summary.cost.total)} saved · ${base.clinicalCases} → ${smart.summary.clinicalCases} sick · ${base.deaths} → ${smart.summary.deaths} deaths`

  if (kind === 'smart') {
    const acting = hour >= actionHour
    return {
      mode: acting ? 'acting' : 'scheduled',
      sensing,
      predicting: acting
        ? `${fr.totals.sick + fr.totals.quiet} active infections now vs ${bundle.doNothing.frames[hour].totals.sick + bundle.doNothing.frames[hour].totals.quiet} if nothing was done.`
        : `${hidden} cows already silently infected — protocol starts at Hour ${actionHour}.`,
      actions,
      payoff,
    }
  }

  if (!crisis && hidden + fr.totals.sick === 0) {
    return {
      mode: 'monitoring',
      sensing,
      predicting: 'No disease spread predicted. Watching air, heat and ammonia in all 8 pens.',
      actions: [],
      payoff: '',
    }
  }

  return {
    mode: 'alert',
    sensing,
    predicting:
      hidden > 0
        ? `${hidden} ${hidden === 1 ? 'cow is' : 'cows are'} silently infected${quietPens.length ? ` in ${penList(quietPens)}` : ''}. Left alone: ${base.clinicalCases} sick, ${base.deaths} deaths in 7 days.`
        : `Outbreak risk rising. Left alone: ${base.clinicalCases} sick, ${base.deaths} deaths in 7 days.`,
    actions,
    payoff,
  }
}
