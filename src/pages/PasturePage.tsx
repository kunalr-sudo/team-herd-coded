import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Gamepad2, Moon, Sun, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { pastureAudio } from '../audio/pastureAudio'
import PastureScene from '../components/canvas/PastureScene'
import { SPRING } from '../components/ui/spring'

function Key({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <kbd
      className={`grid h-8 place-items-center rounded-[8px] bg-white/15 font-sans text-[13px] font-semibold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.35)] ${wide ? 'px-2.5' : 'w-8'}`}
    >
      {children}
    </kbd>
  )
}

/** Low-key ambient page: the herd grazing, birdsong, click a cow to hear it moo — or play as one. */
export default function PasturePage() {
  const [sound, setSound] = useState(true)
  const [audible, setAudible] = useState(false)
  const [night, setNight] = useState(false)
  const [playing, setPlaying] = useState(false)

  // Birdsong by default. If the browser still needs a gesture, the first click or key press starts it.
  useEffect(() => {
    void pastureAudio.enable().then(() => setAudible(pastureAudio.running))
    const unlock = () => {
      pastureAudio.unlock()
      window.setTimeout(() => setAudible(pastureAudio.running), 50)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      pastureAudio.disable()
      document.body.style.cursor = ''
    }
  }, [])

  const toggleSound = async () => {
    if (sound) {
      pastureAudio.disable()
      setSound(false)
    } else {
      await pastureAudio.enable()
      pastureAudio.unlock()
      setSound(true)
      setAudible(true)
    }
  }

  const setTime = (isNight: boolean) => {
    pastureAudio.setNight(isNight)
    setNight(isNight)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full select-none font-sans">
        <PastureScene night={night} playing={playing} onExitPlay={() => setPlaying(false)} onMoo={(pan) => pastureAudio.moo(pan)} />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <a href="#/" className="panel press pointer-events-auto flex items-center gap-1.5 !rounded-full py-2 pl-3 pr-4 text-[14px] font-medium text-white">
            <ChevronLeft size={17} /> BarnTwin
          </a>
          <AnimatePresence>
            {sound && !audible && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING} className="panel !rounded-full px-4 py-2 text-[13px] text-slate-200">
                Click anywhere to start the birdsong
              </motion.div>
            )}
          </AnimatePresence>
          <a href="#/simulate" className="panel press pointer-events-auto flex items-center gap-1.5 !rounded-full py-2 pl-4 pr-3 text-[14px] font-medium text-white">
            Try the barn simulation <ChevronRight size={17} />
          </a>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
          <AnimatePresence mode="wait" initial={false}>
            {playing ? (
              <motion.div key="keys" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={SPRING} className="panel pointer-events-auto flex items-center gap-5 px-5 py-3.5">
                <div className="grid grid-cols-3 gap-1">
                  <span />
                  <Key>W</Key>
                  <span />
                  <Key>A</Key>
                  <Key>S</Key>
                  <Key>D</Key>
                </div>
                <div className="text-[13px] leading-relaxed text-slate-300">
                  <div>
                    <span className="font-semibold text-white">Move</span> — W/S walk, A/D turn
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Key>M</Key> <span className="font-semibold text-white">Moo</span>
                    <Key wide>Shift</Key> <span className="font-semibold text-white">Run</span>
                    <Key wide>Esc</Key> <span className="font-semibold text-white">Stop</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="caption" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={SPRING} className="panel max-w-[400px] px-5 py-4">
                <div className="text-[13px] font-medium text-emerald-300">Pasture mode</div>
                <div className="mt-0.5 text-[16px] leading-snug text-white">
                  {night ? 'A calm night on the farm. Click a cow to hear it.' : 'A quiet afternoon with the herd. Click any cow to hear it moo.'}
                </div>
                <div className="mt-1.5 text-[12.5px] text-slate-400">Drag to look around · scroll to zoom</div>
              </motion.div>
            )}
          </AnimatePresence>

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
                  onClick={() => setTime(o.v)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors ${night === o.v ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'}`}
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
              aria-label={sound ? 'Mute' : 'Unmute'}
              title={sound ? 'Mute' : 'Unmute'}
              className="panel press grid h-[46px] w-[46px] place-items-center !rounded-full text-white"
            >
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              type="button"
              onClick={() => setPlaying(!playing)}
              className={`press flex h-[46px] items-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-colors ${
                playing ? 'panel !rounded-full text-white' : 'bg-white text-slate-950 shadow-[0_10px_30px_-10px_rgba(255,255,255,0.6)] hover:bg-slate-100'
              }`}
            >
              {playing ? <X size={18} /> : <Gamepad2 size={18} />}
              {playing ? 'Stop playing' : 'Play as a cow'}
            </button>
          </div>
        </div>
      </div>
    </MotionConfig>
  )
}
