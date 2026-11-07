// Plain-English translation of simulation state: story banner + pen status cards.

import { HOSPITAL, TIMELINE } from './constants'
import type { CounterfactualBundle, HourFrame, PenStat, PlanKind, ScenarioResult } from './cattleEngine'

export type Tone = 'calm' | 'warn' | 'danger' | 'good'

export interface Story {
  headline: string
  tone: Tone
}

export const penName = (p: number) => (p === HOSPITAL ? 'the Hospital Pen' : `Pen ${p + 1}`)

export function penList(pens: number[]): string {
  const names = pens.map((p) => String(p + 1))
  if (names.length === 0) return ''
  if (names.length === 1) return `Pen ${names[0]}`
  return `Pens ${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

const avgTHI = (fr: HourFrame) => fr.pens.slice(0, 8).reduce((s, p) => s + p.thi, 0) / 8

/** Production pens (other than Pen 3) that receive a meaningful share of Pen 3's germ plume. */
export function plumePens(fr: HourFrame): number[] {
  const src = Math.max(fr.pens[2].aerosol, 1e-6)
  return fr.pens
    .slice(0, 8)
    .map((p, i) => ({ i, r: p.aerosol / src }))
    .filter((x) => x.i !== 2 && x.r > 0.18)
    .sort((a, b) => b.r - a.r)
    .slice(0, 3)
    .map((x) => x.i)
    .sort((a, b) => a - b)
}

function infectedPens(fr: HourFrame, includeQuiet: boolean): number[] {
  return fr.pens
    .slice(0, 8)
    .map((p, i) => ({ i, n: p.sick + (includeQuiet ? p.quiet : 0) }))
    .filter((x) => x.n > 0)
    .map((x) => x.i)
}

/** Pens where the naive plan's germ load most exceeds doing nothing. */
function pushedDownwind(naive: HourFrame, base: HourFrame): number[] {
  return naive.pens
    .slice(0, 8)
    .map((p, i) => ({ i, d: p.aerosol - base.pens[i].aerosol }))
    .filter((x) => x.i !== 2 && x.d > 0.002)
    .sort((a, b) => b.d - a.d)
    .slice(0, 3)
    .map((x) => x.i)
    .sort((a, b) => a - b)
}

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`

export function buildStory(
  bundle: CounterfactualBundle,
  kind: PlanKind,
  hour: number,
  xray: boolean,
  fanBFault: boolean,
): Story {
  const cur: ScenarioResult = bundle.current
  const fr = cur.frames[hour]
  const base = bundle.doNothing.frames[hour]
  const actionHour = cur.config.actionHour
  const acting = kind !== 'none' && hour >= actionHour
  const t = fr.totals
  const h = `Hour ${hour}:`
  const p3 = fr.pens[2]

  if (!fanBFault && !acting) {
    if (t.sick + t.quiet === 0)
      return { headline: `${h} All 3 fans are running and the herd is healthy — the barn handles the heat.`, tone: 'calm' }
    return {
      headline: `${h} With all fans working, the barn stays ventilated — ${plural(t.sick, 'cow')} sick${xray ? `, ${t.quiet} quietly infected` : ''}, mostly contained to ${penList(infectedPens(fr, xray))}.`,
      tone: t.sick > 3 ? 'warn' : 'calm',
    }
  }

  if (hour < TIMELINE.crisisHour) {
    const T = fr.weather.tempC.toFixed(0)
    if (fr.weather.heatwave > 0.3)
      return {
        headline: `${h} A heatwave is building outside (${T}°C), but all 3 fans are running and the herd looks comfortable.${
          xray && t.quiet > 0 ? ' X-Ray: a newly arrived calf in Pen 3 is already quietly incubating BRD.' : ''
        }`,
        tone: xray && t.quiet > 0 ? 'warn' : 'calm',
      }
    return {
      headline: `${h} Normal operations — all 3 exhaust fans running, fresh air flowing, the herd is calm.`,
      tone: 'calm',
    }
  }

  if (!acting) {
    const plume = plumePens(fr)
    if (t.sick <= 2 && hour < 60) {
      if (!xray)
        return {
          headline: `${h} Fan B has failed and Pen 3 is the hottest spot in the barn (THI ${p3.thi.toFixed(0)}). The farmer sees ${plural(t.sick, 'sick calf', 'sick calves')} — everything else looks fine.`,
          tone: 'warn',
        }
      return {
        headline: `${h} Fan B failure traps heat over Pen 3. Cows bunch together, and swirling air quietly spreads infection${
          plume.length ? ` into ${penList(plume)}` : ''
        } — ${t.quiet} cattle are already infected but look healthy.`,
        tone: 'danger',
      }
    }
    const pens = infectedPens(fr, xray)
    return {
      headline: `${h} Outbreak spreading — ${plural(t.sick, 'cow')} visibly sick${xray ? ` and ${t.quiet} more quietly incubating` : ''} across ${plural(pens.length, 'pen')}${
        t.dead ? `; ${plural(t.dead, 'death')} so far` : ''
      }.`,
      tone: 'danger',
    }
  }

  const baseActive = base.totals.sick + base.totals.quiet
  const active = t.sick + t.quiet

  if (kind === 'naive') {
    const pushed = pushedDownwind(fr, base)
    const dT = avgTHI(base) - avgTHI(fr)
    if (hour < actionHour + 30 || t.sick < 10)
      return {
        headline: `${h} Fans cranked +25% ${dT >= 1.5 ? 'cool' : 'barely cool'} the barn (THI −${dT.toFixed(1)}), but sick cows stay put and the faster swirl pushes Pen 3's germs downwind${
          pushed.length ? ` into ${penList(pushed)}` : ''
        }.`,
        tone: 'danger',
      }
    return {
      headline: `${h} Naive fan boost failed — ${t.everInfected} cattle infected vs ${base.totals.everInfected} with no action; the outbreak just moved downwind${
        pushed.length ? ` into ${penList(pushed)}` : ''
      }.`,
      tone: 'danger',
    }
  }

  if (kind === 'smart') {
    if (hour < actionHour + 8) {
      const tp = cur.targetedPens
      return {
        headline: `${h} BarnTwin Smart Protocol: ${plural(t.isolated, 'sick calf', 'sick calves')} moved to the downwind Hospital Pen, misters on, airflow rebalanced, and ${cur.summary.metaphylaxisDoses} targeted doses protect ${penList(tp)}.`,
        tone: 'good',
      }
    }
    return {
      headline: `${h} Outbreak contained — ${plural(active, 'active infection')} vs ${baseActive} without BarnTwin. Pen 3 cools to THI ${p3.thi.toFixed(0)} and cows spread out again.`,
      tone: 'good',
    }
  }

  const better = active < baseActive
  return {
    headline: `${h} Custom plan active — ${plural(active, 'active infection')} vs ${baseActive} with no action${
      fr.mistersOn ? ', misters cooling the barn' : ''
    }${t.isolated ? `, ${t.isolated} isolated in the Hospital Pen` : ''}.`,
    tone: better ? 'good' : 'warn',
  }
}

// ---------------------------------------------------------------------------
// Pen cards

export type PenLevel = 'ok' | 'watch' | 'danger' | 'critical'

export interface PenStatus {
  level: PenLevel
  title: string
  condition: string
  healthLine: string
}

export const LEVEL_COLOR: Record<PenLevel, string> = {
  ok: '#22c55e',
  watch: '#f59e0b',
  danger: '#f97316',
  critical: '#ef4444',
}

export function penStatus(pen: number, st: PenStat, xray: boolean): PenStatus {
  if (pen === HOSPITAL) {
    const n = st.total - st.dead
    return {
      level: n > 0 ? 'watch' : 'ok',
      title: n > 0 ? 'ISOLATING' : 'READY',
      condition: 'Downwind isolation ward',
      healthLine: n > 0 ? `${plural(n, 'sick calf', 'sick calves')} under treatment` : 'Empty — next to working Fan C',
    }
  }

  const hot = st.thi >= 79
  const stagnant = st.wind < 0.8
  const germs = xray && st.aerosol > 0.02
  let condition = 'Comfortable'
  if (hot && stagnant) condition = 'Hot & Stagnant Air'
  else if (st.thi >= 84) condition = 'Severe Heat Stress'
  else if (hot) condition = 'Heat Stress'
  else if (st.nh3 > 25) condition = 'High Ammonia'
  if (germs) condition = condition === 'Comfortable' ? 'Germ Plume Drifting In' : `${condition} + Germ Plume`

  let level: PenLevel = st.thi >= 84 && stagnant ? 'danger' : hot ? 'watch' : 'ok'
  if (xray) {
    const infected = st.sick + st.quiet
    if (infected >= 8) level = 'critical'
    else if (infected >= 3) level = 'danger'
    else if ((infected >= 1 || germs) && level === 'ok') level = 'watch'
  } else {
    if (st.sick >= 3) level = 'critical'
    else if (st.sick >= 1) level = 'danger'
  }
  const title = level === 'critical' ? 'CRITICAL' : level === 'danger' ? 'DANGER' : level === 'watch' ? 'WATCH' : 'OK'

  const parts: string[] = []
  if (st.sick) parts.push(`${st.sick} Visibly Sick`)
  if (xray) {
    if (st.quiet) parts.push(`${st.quiet} Quietly Infected`)
    if (st.protectedCount) parts.push(`${st.protectedCount} Protected`)
  }
  if (st.dead) parts.push(`${st.dead} Dead`)
  if (parts.length === 0 || (!xray && parts.length < 2))
    parts.push(`${st.total - st.dead - st.sick} Look Healthy`)

  return { level, title, condition, healthLine: parts.join(' · ') }
}
