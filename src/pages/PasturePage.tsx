import { ChevronLeft, ChevronRight, Moon, Sun, Volume2, VolumeX } from 'lucide-react'
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

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <a href="#/" className="panel press pointer-events-auto flex items-center gap-1.5 !rounded-full py-2 pl-3 pr-4 text-[14px] font-medium text-white">
          <ChevronLeft size={17} /> BarnTwin
        </a>
        <a href="#/simulate" className="panel press pointer-events-auto flex items-center gap-1.5 !rounded-full py-2 pl-4 pr-3 text-[14px] font-medium text-white">
          Try the barn simulation <ChevronRight size={17} />
        </a>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
        <div className="panel max-w-[400px] px-5 py-4">
          <div className="text-[13px] font-medium text-emerald-300">Pasture mode</div>
          <div className="mt-0.5 text-[16px] leading-snug text-white">
            {night ? 'A calm night on the farm. The herd is resting.' : 'A quiet afternoon with the herd — grazing, wandering, and the odd moo.'}
          </div>
          <div className="mt-1.5 text-[12.5px] text-slate-400">Drag to look around · scroll to zoom</div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="panel flex !rounded-full p-1" role="radiogroup" aria-label="Time of day">
            {[
              { v: false, label: 'Day', icon: <Sun size={15} /> },
              { v: true, label: 'Night', icon: <Moon size={15} /> },
            ].map((o) => (
              <button
                type="button"
                role="radio"
                aria-checked={night === o.v}
                key={o.label}
                onClick={() => night !== o.v && toggleNight()}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors ${
                  night === o.v ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                {o.icon}
                {o.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            className={`press flex h-[46px] items-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-colors ${
              sound ? 'panel !rounded-full text-white' : 'bg-white text-slate-950 shadow-[0_10px_30px_-10px_rgba(255,255,255,0.6)] hover:bg-slate-100'
            }`}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            {sound ? 'Sound on' : night ? 'Play the night sounds' : 'Play moos & birdsong'}
          </button>
        </div>
      </div>
    </div>
  )
}
