import BarnScene from './components/canvas/BarnScene'
import CowLegend from './components/hud/CowLegend'
import ImpactDashboard from './components/hud/ImpactDashboard'
import InterventionDeck from './components/hud/InterventionDeck'
import StoryStepper from './components/hud/StoryStepper'
import TimelineBar from './components/hud/TimelineBar'

export default function App() {
  return (
    <div className="relative h-full w-full select-none font-sans">
      <div className="absolute inset-0">
        <BarnScene />
      </div>
      <StoryStepper />
      <InterventionDeck />
      <ImpactDashboard />
      <CowLegend />
      <TimelineBar />
    </div>
  )
}
