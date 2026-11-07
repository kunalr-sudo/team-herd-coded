import LabPage from './pages/LabPage'
import LandingPage from './pages/LandingPage'
import PasturePage from './pages/PasturePage'
import RunPage from './pages/RunPage'
import SetupPage from './pages/SetupPage'
import { useRoute } from './router'

export default function App() {
  const route = useRoute()
  if (route === 'simulate') return <SetupPage />
  if (route === 'run') return <RunPage />
  if (route === 'lab') return <LabPage />
  if (route === 'pasture') return <PasturePage />
  return <LandingPage />
}
