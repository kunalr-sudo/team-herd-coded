# BarnTwin — 3D Cattle Barn World Model

**team-herd-coded** · A 100% client-side digital twin of a **320-head cattle barn** (8 pens × 40 head + a downwind Hospital Pen).
A deterministic, coupled **airflow + heat + ammonia + airborne-BRD** engine runs every scenario for a 7-day window. The result is shown as an isometric 3D scene with plain-English text that a non-expert can follow in about five seconds.

> **The pitch in one line:** a broken fan on a hot night makes one pen stagnant. Swirling air quietly infects the cows around it. The farmer sees 2 sick calves. BarnTwin's X-Ray sees 15 more, about 48 hours before anyone could react.

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

---

## 90-second live demo script

Run it at 1600×900 or larger. Projector-friendly keyboard shortcuts: **1–4** presets, **X** X-Ray, **Space** play/pause, **← / →** step one hour.

| Step | Click | What judges see | Say |
|---|---|---|---|
| 0 | *(page load)* | Barn at Hour 24 with a red, stopped **FAN B FAILED** on the east wall. Heat map is orange over Pen 3, and cows are huddled. | "A 320-head barn in a 38 °C heatwave, and one exhaust fan just died." |
| 1 | **1. Crisis Hits** | Hour 18. Fan B stops, 1 red calf appears in Pen 3, and the rest of the herd is green. | "This is everything the farmer can see." |
| 2 | **2. Hidden Spread** | Hour 36. X-Ray switches on and the floor shows the germ plume. **15 glowing yellow cows** appear in Pens 2, 3, 4 & 8. | "Same barn, same hour. BRD incubates for 36–72 h with no symptoms, so these cows are already infected." Toggle **Farmer's Eye ↔ AI X-Ray** a few times. |
| 3 | **3. Why Naive Fan Boost Fails** | Hour 72. Fans A/C run at +25%. The barn barely cools (THI −0.6). The banner reports germs pushed downwind into **Pens 4, 7 & 8**. The ROI card turns red: **Extra herd loss $4,000** (123 → 129 sick, 6 → 8 deaths). | "The obvious fix makes it worse, because the sick cows are still shedding and the faster swirl carries their germs further." |
| 4 | **4. BarnTwin Smart Fix** | Sick calves walk to the downwind Hospital Pen. Misters and a portable fan come on, and cows stop huddling. Pens 3 & 4 turn cyan (targeted doses). The green curve flattens. | "Isolate first, then ventilate, cool, and treat only the exposed pens. Result: **123 → 8 sick cattle, 6 → 0 deaths, $40,816 herd loss prevented, 74% fewer antibiotic doses** than blanket-treating the barn." |

Drag the timeline at any point. The story banner, pen cards, cows, wind streaks and charts all follow the hour you select.

---

## What's on screen

| Element | Meaning |
|---|---|
| **Story banner** (top) | One plain-English sentence generated from the simulation state for the selected hour and view (`src/sim/narrative.ts`). |
| **Pen blocks + fences** | Green (OK), Amber (Watch), Orange (Danger), pulsing Red (Critical). In Farmer's Eye, the status uses only visible signs (heat, visibly sick cows). X-Ray adds hidden infections and germ load. |
| **320 cows** | Instanced low-poly cattle. 🟢 healthy · 🟡 quietly infected (X-Ray only) · 🔴 fever / visibly sick · 🔵 treated & protected · ⚫ dead. They huddle when hot, spread out when cooled, and walk to the Hospital Pen when isolated. |
| **Wind streaks** | 1,500 particles moved through the solver's velocity field. They are pale blue in Farmer's Eye. In X-Ray they are coloured by airborne germ load. |
| **Floor layers** | *Germ Plume & Disease Risk* (X-Ray), *Heat Stress Zone* (effective THI), *Stagnant Air & Ammonia* (NH₃ ppm). |
| **Pen cards** | Plain English first (`PEN 3 · CRITICAL — Hot & Stagnant Air + Germ Plume — 2 Visibly Sick · 10 Quietly Infected`), with telemetry underneath. Click a card for temperature, RH, heat category, % bunching and germ load. |
| **Left panel** | Crisis setup (heatwave peak, Fan B fault) and interventions (action hour, isolation, +25% ventilation, airflow rebalancing, misters, antibiotic strategy). |
| **Right panel** | 7-day impact, Do Nothing vs. current plan: herd loss prevented (itemised), sick cows, deaths, antibiotic reduction vs. whole-barn blanket, and infection curves. |

---

## How the model works

### 1 · Barn layout (`src/sim/constants.ts`)
- 24 × 12 grid of 2.5 m cells (60 m × 30 m barn, 4 m ceiling).
- West wall: fresh-air inlets and misters. North row: Pens 1–4. Centre: feed alley. South row: Pens 5–8.
- East wall: exhaust fan banks **A** (north), **B** (centre), **C** (south). The Hospital Pen sits in front of Fan C, downwind of every pen.
- 320 head at $1,800 each, for a **$576,000** herd.

### 2 · Airflow, heat, ammonia & germ plume (`src/sim/physicsGrid.ts`)
- **Velocity field.** At the inlet the flow is uniform. Moving east, each row's flow blends toward the strength of the fan that serves it. Lateral velocity is computed from continuity (∂u/∂x + ∂w/∂z = 0).
- **Fan B failure.** Fan imbalance creates a dead zone and a counter-clockwise **recirculation eddy** over Pen 3. On the north side the eddy flows west (upwind, into Pen 2). On the east side it flows north into Pen 4. Boosting the side fans while Fan B is dead strengthens the shear, so the eddy grows and drifts toward Pens 4, 7 & 8. This is why the naive fix fails.
- **Quasi-steady transport.** Air takes ~30 s to cross the barn, or a few minutes inside the eddy. That is much shorter than the 1-hour step, so each hour is solved as a steady upwind finite-volume advection–diffusion(–decay) problem.
- For each ventilation configuration, the solver computes the **Green's function** of every pen once, using symmetric Gauss–Seidel, and caches it. Hourly temperature, humidity, NH₃ and pathogen fields are then linear combinations of these responses. That is what keeps a full 7-day coupled run in the millisecond range.
- **Heat.** 1.1 kW of sensible heat per animal, plus roof solar load, plus the outdoor diurnal cycle (heatwave peak adjustable from 30 to 42 °C). Humidity comes from vapour-pressure balance with cow moisture.
- **THI.** NRC (1971): `THI = 1.8T + 32 − (0.55 − 0.0055·RH)(1.8T − 26)`. It is then wind-adjusted following Mader et al. (2006): `+4.51 − 1.992·WS`. Misters cool the inlet air by 4.5 °C, add 14% RH, and give a direct soaking credit.
- **Ammonia.** Manure emission per animal, scaled by a temperature factor of 1.07^(T−20). In the stagnant zone it builds up to about 25–30 ppm.

### 3 · 320-cow BRD agent engine (`src/sim/cattleEngine.ts`)
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
    - *Whole-barn blanket:* 320 doses.
    - *Targeted:* the AI picks the 2 most-exposed pens, about 80 doses. Already-infected cows are cured with 60% probability, and the rest are protected (susceptibility × 0.15).
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
| Sick (clinical) cattle | 123 | 129 | **8** |
| Deaths | 6 | 8 | **0** |
| Antibiotic doses | 123 | 129 | **86** (vs 325 blanket) |
| 7-day cost | $51,216 | $55,216 | **$10,400** |
| Pens hit hardest | 2, 3, 4, 8 | 3, 4, **7, 8** (pushed downwind) | 3 (contained) |

Story checkpoints: **Hour 30**, 2 visibly sick calves. **Hour 36**, 15 cattle quietly infected across Pens 2, 3, 4 & 8, invisible to the naked eye. Pen 3 at Hour 36 reads THI 88, NH₃ 27 ppm, wind 0.65 m/s.

### Performance (Chrome, Apple M4 Max, 1600×900)
- Rendering: **120 FPS** (display-capped) idle, while playing, and in every preset.
- Timeline scrub → next painted frame: **9 ms median, 14 ms max**. Scrubbing only indexes precomputed frames.
- Full recompute after an intervention change (5 coupled 169-hour trajectories, 320 agents each): **8.5–11 ms** once warm. An idle-time warm-up runs at startup.
- Flow fields are cached by ventilation configuration. A cold solve takes about 4 ms.

---

## Project structure

```
src/
  sim/
    constants.ts        geometry, THI/NH3 equations, BRD rates, economics
    physicsGrid.ts      velocity field, Fan-B eddy, cached Green's-function transport solver, weather
    cattleEngine.ts     320-cow agent engine, counterfactual runner, heat-bunching coordinates
    narrative.ts        plain-English story banner + pen status cards
  store/
    useSimulationStore.ts   zustand: timeline, X-Ray, layers, crisis, plan, presets
  components/
    canvas/             BarnScene, CattleInstances, AirflowParticles, HeatmapFloor, PenOverlays
    hud/                StoryStepper, InterventionDeck, ImpactDashboard, TimelineBar, CowLegend
```

## Limitations

This is a hackathon-grade, phenomenological world model built for explanation and what-if exploration. It is **not** CFD and **not** veterinary advice. The eddy is a parameterised recirculation model, not a solved Navier–Stokes field. Transmission coefficients were calibrated so the outbreak dynamics are plausible for a heat-stressed BRD event, not fitted to a specific herd. Every on-screen number is computed live from the model; none of them are hard-coded.
