import { Suspense, lazy } from 'react'
import { useRoute } from './router'

// One chunk per page, so each route only downloads what it renders.
const LandingPage = lazy(() => import('./pages/LandingPage'))
const SetupPage = lazy(() => import('./pages/SetupPage'))
const RunPage = lazy(() => import('./pages/RunPage'))
const LabPage = lazy(() => import('./pages/LabPage'))
const PasturePage = lazy(() => import('./pages/PasturePage'))

function Loading() {
  return (
    <div className="grid h-full place-items-center bg-[#05070b]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" aria-label="Loading" />
    </div>
  )
}

export default function App() {
  const route = useRoute()
  const page =
    route === 'simulate' ? <SetupPage /> : route === 'run' ? <RunPage /> : route === 'lab' ? <LabPage /> : route === 'pasture' ? <PasturePage /> : <LandingPage />
  return <Suspense fallback={<Loading />}>{page}</Suspense>
}
