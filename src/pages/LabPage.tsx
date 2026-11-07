import { MotionConfig } from 'motion/react'
import BarnScene from '../components/canvas/BarnScene'
import ChangeToast from '../components/hud/ChangeToast'
import ControlPanel from '../components/hud/ControlPanel'
import CowLegend from '../components/hud/CowLegend'
import InsightsPanel from '../components/hud/InsightsPanel'
import ProjectionOverlay from '../components/hud/ProjectionOverlay'
import StoryStepper from '../components/hud/StoryStepper'
import TimelineBar from '../components/hud/TimelineBar'

/** Expert view: guided demo presets plus every control on one screen. */
export default function LabPage() {
  return (
    <MotionConfig reducedMotion="user">
    <div className="relative h-full w-full select-none font-sans">
      <div className="absolute inset-0">
        <BarnScene />
      </div>
      <StoryStepper />
      <ControlPanel />
      <InsightsPanel />
      <CowLegend />
      <ChangeToast />
      <TimelineBar presetKeys />
      <ProjectionOverlay />
    </div>
    </MotionConfig>
  )
}
