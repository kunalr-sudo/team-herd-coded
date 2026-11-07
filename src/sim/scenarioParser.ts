// Offline natural-language -> crisis translator for the setup wizard.
// Rule-based (no LLM, nothing leaves the browser): it extracts what the simulation can
// actually model — heatwave peak and the Fan B failure — and explains anything it mapped.

import { TIMELINE, hourLabel } from './constants'
import type { CrisisConfig } from './cattleEngine'

export const HEAT_MIN = 30
export const HEAT_MAX = 42
export const DEFAULT_HEAT = 38

export interface Interpretation {
  crisis: CrisisConfig
  /** Plain-English bullet points describing what was understood. */
  understood: string[]
  /** Caveats: values clamped, things mapped or not modelled. */
  notes: string[]
}

const FAIL_WORDS = /\b(fail|fails|failed|failing|failure|break|breaks|broke|broken|die|dies|died|dead|stop|stops|stopped|stall|stalls|stalled|quit|quits|out|down|outage|trip|trips|tripped|jam|jams|jammed|malfunction\w*)\b/
const FAN_WORDS = /\b(fan|fans|exhaust|ventilat\w*|blower|blowers|airflow)\b/
const HEALTHY_FANS = /\b(all|every)\s+(the\s+)?(fans?|ventilation)\s+(are\s+|is\s+)?(fine|ok|okay|working|running|normal)\b|\bno\s+(fan|equipment)\s+(failure|problem|issue)s?\b/

export const EXAMPLE_PROMPTS = [
  'A brutal 40°C heatwave hits on Monday and the middle exhaust fan breaks down that evening.',
  'Hot humid week around 36 degrees, but all fans are running fine.',
  "It's 104°F outside and fan B just died.",
]

export function translateScenario(text: string): Interpretation {
  const t = text.toLowerCase()
  const understood: string[] = []
  const notes: string[] = []

  // --- Heat
  let heat: number | null = null
  // Prefer numbers with a unit; otherwise a bare number not tied to an hour/day/pen/fan.
  const withUnit = t.match(/(-?\d{2,3}(?:\.\d+)?)\s*(?:°|º|deg(?:rees?)?)\s*(c\b|f\b|celsius|fahrenheit)?|(-?\d{2,3}(?:\.\d+)?)\s*(c\b|f\b|celsius|fahrenheit)/)
  const bare = [...t.matchAll(/(?<!(?:hour|hr|day|pen|fan|at|by)\s*)\b(\d{2,3}(?:\.\d+)?)\b/g)].map((m) => parseFloat(m[1])).find((v) => v >= 25 && v <= 115)
  const num = withUnit ? { value: parseFloat(withUnit[1] ?? withUnit[3]), unit: withUnit[2] ?? withUnit[4] ?? '' } : bare !== undefined ? { value: bare, unit: '' } : null
  if (num) {
    let v = num.value
    const unit = num.unit
    const isF = unit.startsWith('f') || (!unit.startsWith('c') && v > 50)
    if (isF) {
      const c = ((v - 32) * 5) / 9
      notes.push(`Converted ${v}°F to ${c.toFixed(0)}°C.`)
      v = c
    }
    heat = v
  } else if (/\b(record|extreme|brutal|scorching|blistering|severe)\b/.test(t)) heat = 41
  else if (/\b(heat ?wave|very hot|hot)\b/.test(t)) heat = DEFAULT_HEAT
  else if (/\b(warm|humid|muggy)\b/.test(t)) heat = 34
  else if (/\b(mild|cool|normal|pleasant)\b/.test(t)) heat = HEAT_MIN

  if (heat === null) {
    heat = DEFAULT_HEAT
    notes.push(`No temperature mentioned — assuming a ${DEFAULT_HEAT}°C heatwave.`)
  }
  const rounded = Math.round(heat)
  const clamped = Math.min(HEAT_MAX, Math.max(HEAT_MIN, rounded))
  if (clamped !== rounded) notes.push(`The model covers ${HEAT_MIN}–${HEAT_MAX}°C peaks, so ${rounded}°C was set to ${clamped}°C.`)
  understood.push(`A heatwave peaking at ${clamped}°C every afternoon for about 5 days.`)

  // --- Fan failure
  let fanBFault = false
  if (HEALTHY_FANS.test(t)) {
    understood.push('All three exhaust fans keep running.')
  } else if (FAN_WORDS.test(t) && FAIL_WORDS.test(t)) {
    fanBFault = true
    const otherFan = t.match(/\bfan\s*([ac])\b/)
    if (otherFan) notes.push(`Only a Fan B (centre) failure is modelled, so Fan ${otherFan[1].toUpperCase()} was mapped to Fan B.`)
    understood.push(`Fan B (centre exhaust) fails at Hour ${TIMELINE.crisisHour} (${hourLabel(TIMELINE.crisisHour)}).`)
    if (/\b(morning|noon|day ?2|tuesday|wednesday|thursday|friday|weekend)\b/.test(t))
      notes.push(`Failure timing is fixed at ${hourLabel(TIMELINE.crisisHour)} in this model.`)
  } else {
    understood.push('No equipment failure mentioned — all three fans keep running.')
  }

  understood.push('Two newly arrived calves in Pen 3 are already incubating BRD (always part of the scenario).')
  if (/\b(pneumonia|brd|cough\w*|sick|ill|virus|infect\w*)\b/.test(t))
    notes.push('Disease is always seeded the same way so different responses can be compared fairly.')

  return { crisis: { heatwaveTemp: clamped, fanBFault }, understood, notes }
}
