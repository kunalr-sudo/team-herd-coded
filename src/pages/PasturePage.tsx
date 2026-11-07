import { ArrowLeft, Moon, Sun, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { pastureAudio } from '../audio/pastureAudio'
import PastureScene from '../components/canvas/PastureScene'

/** Low-key ambient page: the herd grazing, mooing, and birdsong. */
export default function PasturePage() {
  const [sound, setSound] = useState(false)
  const [night, setNight] = useState(false)

  useEffect(() => () => pastureAudio.disable(), [])

  const toggleSound = async () => {
    if (sound) {
      pastureAudio.disable()
      setSound(false)
    } else {
      await pastureAudio.enable()
      setSound(true)
    }
  }

  const toggleNight = () => {
    pastureAudio.setNight(!night)
    setNight(!night)
  }

  return (
    <div className="relative h-full w-full select-none font-sans">
      <PastureScene night={night} onMoo={(_, pan) => pastureAudio.moo(pan)} />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        <a
          href="#/"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-950/55 px-3 py-1.5 text-[13px] font-semibold text-white backdrop-blur hover:bg-slate-950/75"
        >
          <ArrowLeft size={15} /> BarnTwin
        </a>
        <a
          href="#/simulate"
          className="pointer-events-auto rounded-full bg-slate-950/55 px-3 py-1.5 text-[13px] font-semibold text-white backdrop-blur hover:bg-slate-950/75"
        >
          Open the barn simulation →
        </a>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
        <div className="max-w-[420px] rounded-2xl bg-slate-950/50 px-4 py-3 text-white backdrop-blur">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200">Pasture mode</div>
          <div className="text-[15px] leading-snug">
            {night ? 'A calm night on the farm. The herd is resting.' : 'A quiet afternoon with the herd — grazing, wandering and the odd moo.'}
          </div>
          <div className="mt-1 text-[12px] text-slate-300">Drag to look around · scroll to zoom</div>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={toggleNight}
            className="grid h-12 w-12 place-items-center rounded-full bg-slate-950/55 text-white backdrop-blur hover:bg-slate-950/75"
            aria-label={night ? 'Switch to day' : 'Switch to night'}
            title={night ? 'Daytime' : 'Night-time'}
          >
            {night ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            type="button"
            onClick={toggleSound}
            className={`flex h-12 items-center gap-2 rounded-full px-5 text-[14px] font-bold backdrop-blur transition-colors ${
              sound ? 'bg-slate-950/55 text-white hover:bg-slate-950/75' : 'bg-emerald-400 text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.6)] hover:bg-emerald-300'
            }`}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            {sound ? 'Sound on' : 'Turn on moos & birdsong'}
          </button>
        </div>
      </div>
    </div>
  )
}
