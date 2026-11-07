# BarnTwin — 3D Cattle Barn World Model

**team-herd-coded** · A 100% client-side digital twin of a **160-head cattle barn** (8 pens × 20 head + a downwind Hospital Pen).
A deterministic, coupled **airflow + heat + ammonia + airborne-BRD** engine runs every scenario for a 7-day window. The result is shown as an isometric 3D scene with plain-English text that a non-expert can follow in about five seconds.

> **The pitch in one line:** a broken fan on a hot night makes one pen stagnant. Swirling air quietly infects the cows around it. The farmer sees 2 sick calves. BarnTwin's X-Ray sees 8 more, about 48 hours before anyone could react. BarnTwin is not a climate controller: it links **climate → disease → money** and recommends the fix.

![stack](https://img.shields.io/badge/TypeScript-Vite-blue) ![3d](https://img.shields.io/badge/React_Three_Fiber-three.js-black) ![state](https://img.shields.io/badge/zustand-tailwind-teal)

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle in dist/
npm run lint       # oxlint
```

No backend, no API keys. Everything (physics, epidemiology, economics, rendering) runs in the browser.

### Pages & user journey

| Route | Page |
|---|---|
| `#/` | **Landing page.** Explains what BarnTwin does and shows live results from the model. The background is the animated pasture. |
| `#/simulate` | **Setup wizard.** The live barn stays dimmed in the background.<br>**1 · Crisis:** *Describe it* and the BarnTwin AI translator turns plain English such as "104°F and the middle fan broke" into model settings, or *Set it up manually* with a heatwave slider and a Fan B fault switch.<br>**2 · Response:** choose the *BarnTwin AI recommendation*, *No intervention*, or *Choose my own interventions*. Each option shows its projected 7-day outcome instantly.<br>**3 · Start simulation.** |
| `#/run` | **Clean run page.** Only the barn, the story banner, the X-Ray toggle, a projection button and the timeline, with no control parameters. Playback starts from Hour 0. At the end of the week a summary card offers *See full projection*, *Try another response* or *Replay*. |
| `#/lab` | **Expert view.** The 4-step guided demo presets plus every control and the BarnTwin AI panel on one screen. |
| `#/pasture` | **Pasture mode.** Grazing Holsteins with moos. Birdsong plays by day and crickets by night (day/night toggle). Click *Turn on moos & birdsong*; browsers need a click before playing audio. |

The scenario translator (`src/sim/scenarioParser.ts`) is a local, rule-based parser, not an LLM. Nothing leaves the browser. It extracts what the model can simulate: the heatwave peak (°C or °F, or words like "scorching"), whether a fan fails, and whether all fans are healthy. It tells you when it converts, clamps or remaps a value.

**Sound credits:** the moo, birdsong and cricket clips in `public/sounds/` were downloaded from [myinstants.com](https://www.myinstants.com) (`cow-moo`, `birds-chirpingss`, `birds-chirping-js`, `crickets-chirping`). They are user-uploaded, so check their licensing before any public or commercial release. If a clip fails to load, the app falls back to synthesized Web Audio sounds.

---

## 90-second live demo script

For a natural walk-through, use **Landing → Launch → describe the crisis → pick a response → Start**. For a tightly scripted pitch, use the expert view at `#/lab`:

Run it at 1600×900 or larger. Projector-friendly keyboard shortcuts: **1–4** presets, **X** X-Ray, **Space** play/pause, **← / →** step one hour.

| Step | Click | What judges see | Say |
|---|---|---|---|
| 0 | *(open `#/lab`, the expert view)* | Barn at midnight, Hour 24. Barn lamps are on, and a red, stopped **FAN B FAILED** sits on the east wall. The **BarnTwin AI** card says *Action needed*. | "A 160-head barn in a 38 °C heatwave, and one exhaust fan just died." |
| 1 | **1. Crisis Hits** | Hour 18. Fan B stops, 1 red calf appears in Pen 3, and the rest of the herd looks healthy (black & white). | "This is everything the farmer can see." |
| 2 | **2. Hidden Spread** | Hour 36, daylight. X-Ray switches on and the germ plume lights up the floor. **8 glowing yellow cows** appear in Pens 2, 3 & 4. | "BRD incubates for 36–72 h with no symptoms, so these cows are already infected." Toggle **Farmer's Eye ↔ AI X-Ray** a few times. |
| 3 | **3. Why Naive Fan Boost Fails** | Hour 72. Fans run at +25% and the barn barely cools. Germs are pushed downwind into Pens 4, 7 & 8. **76 → 81 sick, $618 extra loss.** | "The obvious fix makes it worse. The sick cows keep shedding, and the faster swirl carries their germs further." |
| 4 | **4. BarnTwin Smart Fix** (or *Apply BarnTwin recommendation*) | Sick calves walk to the Hospital Pen. Misters and a portable fan come on, and cows stop huddling. Pens 3 & 4 turn cyan. **76 → 3 sick, 6 → 1 deaths, $26,965 saved, 74% fewer antibiotic doses.** | "Isolate first, then fix the air, cool, and treat only the exposed pens." Click **Open full projection** for the side-by-side table. |

Every control change recomputes the 7-day projection instantly (~7–9 ms) and shows a confirmation toast. Press ▶ and the barn replays that projected path. The projection chart draws the full week at once: solid up to now, faded for the future.

Drag the timeline at any point. The story banner, pen cards, cows, wind streaks and charts all follow the hour you select.

---

## What's on screen

| Element | Meaning |
|---|---|
| **Story banner** (top) | One plain-English sentence generated from the simulation state for the selected hour and view (`src/sim/narrative.ts`). |
| **Pen badges** | One small numbered dot per pen, coloured Green / Amber / Orange / pulsing Red. Click a badge or a pen floor to open that pen's detail card. Only one card is open at a time, which keeps the barn uncluttered. |
| **160 Holstein cows** | Black-and-white spotted cattle. Every cow gets unique spots from procedural shader noise. A health tint is applied over the coat: 🟡 quietly infected (X-Ray only), 🔴 fever / visibly sick, 🔵 treated & protected, ⚫ dead. Cows huddle when hot, spread out when cooled, and walk to the Hospital Pen when isolated. |
| **Day / night** | Sun and moon lighting follow the simulation clock: sunrise ~05:30, sunset ~20:30, with warm barn lamps at night. Override it with the Auto / ☀ / 🌙 toggle in the timeline. |
| **Surroundings** | Grass, grass tufts and low-poly trees around the barn. |
| **Wind streaks** | 1,500 particles moved through the solver's velocity field. They are coloured by germ load in X-Ray. |
| **Left panel: Crisis & response** (collapsible) | **Crisis**: heatwave peak and Fan B fault. **Disease response**: isolate, antibiotics. **Climate response**: ventilation, rebalance, misters. **When to act**, and **Floor map** layers. One-click *Use BarnTwin plan* / *No action*. |
| **Right panel: BarnTwin AI** (collapsible) | **1 · Senses** (worst pen's climate), **2 · Predicts** (hidden infections and the do-nothing outcome), **3 · Recommends** (4 actions and their payoff), with *Apply* and a compact 7-day projection. |
| **Full projection overlay** | Opens over the simulation, which keeps running behind it. It shows KPIs, a large chart, and a scenario table: Do nothing / Naive / BarnTwin / your custom plan, with an itemised cost breakdown. Close it with Esc. |

---

## How the model works

### 1 · Barn layout (`src/sim/constants.ts`)
- 24 × 12 grid of 2.5 m cells (60 m × 30 m barn, 4 m ceiling).
- West wall: fresh-air inlets and misters. North row: Pens 1–4. Centre: feed alley. South row: Pens 5–8.
- East wall: exhaust fan banks **A** (north), **B** (centre), **C** (south). The Hospital Pen sits in front of Fan C, downwind of every pen.
- 160 head (20 per pen) at $1,800 each, for a **$288,000** herd.

### 2 · Airflow, heat, ammonia & germ plume (`src/sim/physicsGrid.ts`)
- **Velocity field.** At the inlet the flow is uniform. Moving east, each row's flow blends toward the strength of the fan that serves it. Lateral velocity is computed from continuity (∂u/∂x + ∂w/∂z = 0).
- **Fan B failure.** Fan imbalance creates a dead zone and a counter-clockwise **recirculation eddy** over Pen 3. On the north side the eddy flows west (upwind, into Pen 2). On the east side it flows north into Pen 4. Boosting the side fans while Fan B is dead strengthens the shear, so the eddy grows and drifts toward Pens 4, 7 & 8. This is why the naive fix fails.
- **Quasi-steady transport.** Air takes ~30 s to cross the barn, or a few minutes inside the eddy. That is much shorter than the 1-hour step, so each hour is solved as a steady upwind finite-volume advection–diffusion(–decay) problem.
- For each ventilation configuration, the solver computes the **Green's function** of every pen once, using symmetric Gauss–Seidel, and caches it. Hourly temperature, humidity, NH₃ and pathogen fields are then linear combinations of these responses. That is what keeps a full 7-day coupled run in the millisecond range.
- **Heat.** 1.1 kW of sensible heat per animal, plus roof solar load, plus the outdoor diurnal cycle (heatwave peak adjustable from 30 to 42 °C). Humidity comes from vapour-pressure balance with cow moisture.
- **THI.** NRC (1971): `THI = 1.8T + 32 − (0.55 − 0.0055·RH)(1.8T − 26)`. It is then wind-adjusted following Mader et al. (2006): `+4.51 − 1.992·WS`. Misters cool the inlet air by 4.5 °C, add 14% RH, and give a direct soaking credit.
- **Ammonia.** Manure emission per animal, scaled by a temperature factor of 1.07^(T−20). In the stagnant zone it builds up to about 25–30 ppm.

### 3 · 160-cow BRD agent engine (`src/sim/cattleEngine.ts`)
- **States:** Healthy → Quietly Infected (incubating 36–72 h, sheds from 40% of incubation onward) → Visibly Sick, or a subclinical recovery. Other states: Treated & Protected, and Dead.
- **Hourly infection hazard per cow:**
  `λ = (β_air · germ_load_in_pen + β_contact · shedding_penmates · (1 + 1.8 · bunching)) × susceptibility × heat_stress × ammonia`
  Bunching rises as effective THI climbs from 76 to 84. Full bunching multiplies nose-to-nose contact by **2.8×**.
- **Common random numbers.** Each cow gets a fixed infection threshold, incubation length, and clinical, mortality and chronic draws. Every scenario uses the same herd with the same luck, so differences between trajectories come only from physics and interventions.
- **Interventions** take effect at the action hour (default **Hour 30**):
  - **Isolation.** Fever detection moves each visibly sick cow to the Hospital Pen right away. That shifts its germ source next to the exhaust and lowers its mortality.
  - **Ventilation.** +25% fans; rebalancing closes the baffles and adds a portable fan at B.
  - **Misters.**
  - **Antibiotics:**
    - *Reactive:* treat cows once visibly sick (farmer notices after 12 h).
    - *Whole-barn blanket:* 160 doses.
    - *Targeted:* the AI picks the 2 most-exposed pens, about 40 doses. Already-infected cows are cured with 60% probability, and the rest are protected (susceptibility × 0.15).
- **Five trajectories per change:** Do Nothing, Naive Fix (+25% fans only), BarnTwin Smart Protocol, a blanket-antibiotic reference (used for the antibiotic-reduction %), and your custom plan. The custom run is skipped when the plan matches one of the other three.

### 4 · Economics (published veterinary cost ranges)
| Item | Cost |
|---|---|
| Clinical pull + treatment | $45 |
| Targeted preventative dose | $28 |
| Sub-clinical lung-lesion weight-gain penalty | $115 |
| Chronic severe case penalty | $260 |
| Mortality | $1,800 |
| Heat-stress lost gain | $0.03 per cow-hour per THI point above 72 |

Cattle still incubating or sick at Hour 168 have their outcomes projected from their fixed draws, so the 7-day totals include the costs those infections have already committed.

### Calibrated scenario outputs (default crisis: 38 °C heatwave, Fan B fails at Hour 18, act at Hour 30)

| | Do Nothing | Naive Fan Boost | **BarnTwin Smart** |
|---|---|---|---|
| Sick (clinical) cattle | 76 | 81 | **3** |
| Deaths | 6 | 6 | **1** |
| Antibiotic doses | 76 | 81 | **41** (vs 160 blanket) |
| 7-day cost | $33,502 | $34,120 | **$6,537** |

Story checkpoints: **Hour 30**, 2 visibly sick calves. **Hour 36**, 8 cattle quietly infected across Pens 2, 3 & 4, invisible to the naked eye. Pen 3 at Hour 36 reads THI 87, NH₃ 22 ppm, air speed 0.65 m/s.

### Performance (Chrome, Apple M4 Max, 1600×900)
- Simulation page: **120 FPS idle, ~112 FPS while playing**, including grass, trees, day/night lighting, bloom and tone mapping. The landing and pasture pages also run at 120 FPS.
- Recompute after any control change (5 coupled 169-hour trajectories, 160 agents each): **6.6–9.2 ms** once warm. An idle-time warm-up runs at startup.
- Timeline scrubbing only indexes precomputed frames.

---

## Project structure

```
src/
  App.tsx, router.ts         hash routes: #/ landing, #/simulate wizard, #/run, #/lab, #/pasture
  pages/                     LandingPage, SetupPage (wizard), RunPage (clean view), LabPage (expert), PasturePage
  sim/
    constants.ts             geometry, THI/NH3 equations, BRD rates, economics
    physicsGrid.ts           velocity field, Fan-B eddy, cached Green's-function transport solver, weather
    cattleEngine.ts          160-cow agent engine, counterfactual runner, heat-bunching coordinates
    narrative.ts             plain-English story banner + pen status
    advisor.ts               BarnTwin AI: Sense -> Predict -> Recommend
    scenarioParser.ts        offline plain-English -> crisis translator
    daylight.ts              sun/moon cycle from the simulation clock
  store/useSimulationStore.ts  zustand: timeline, X-Ray, layers, crisis, plan, presets, panels, lighting
  audio/pastureAudio.ts      recorded moo/birds/crickets clips (public/sounds) + synthesised breeze & fallbacks
  components/
    canvas/                  BarnScene, CattleInstances, cowModel (spotted shader), Environment (grass/trees/day-night),
                             AirflowParticles, HeatmapFloor, PenOverlays, PastureScene
    hud/                     StoryStepper, ControlPanel, InsightsPanel, ProjectionOverlay, ProjectionChart,
                             TimelineBar, CowLegend, ChangeToast
```

## Limitations

This is a hackathon-grade, phenomenological world model built for explanation and what-if exploration. It is **not** CFD and **not** veterinary advice. The eddy is a parameterised recirculation model, not a solved Navier–Stokes field. Transmission coefficients were calibrated so the outbreak dynamics are plausible for a heat-stressed BRD event, not fitted to a specific herd. Every on-screen number is computed live from the model; none of them are hard-coded.
