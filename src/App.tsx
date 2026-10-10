import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './home/HomePage'
import { NotFound } from './home/NotFound'
import { GameConsole } from './lab/console/GameConsole'

const WorldMap = lazy(() => import('./lab/ui/WorldMap').then((m) => ({ default: m.WorldMap })))
const TrebuchetLab = lazy(() => import('./lab/ui/LabPage').then((m) => ({ default: m.LabPage })))

export default function App() {
  return (
    <BrowserRouter>
      <GameConsole />
      <Suspense fallback={<div className="min-h-screen" style={{ background: '#0e0c0a' }} />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/trebuchet" element={<WorldMap />} />
          <Route path="/trebuchet/:missionId" element={<TrebuchetLab />} />
          {/* The old course pages are gone; old links land on the home page. */}
          <Route path="/missions" element={<Navigate to="/" replace />} />
          <Route path="/lab" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
