import { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import LoadingScreen from './components/common/LoadingScreen';
import HomePage from './pages/HomePage';
import MissionsPage from './pages/MissionsPage';
import LabPage from './pages/LabPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const setParameters = useAppStore((state) => state.setParameters);

  // Initialize parameters when mission changes
  useEffect(() => {
    const currentMission = useAppStore.getState().currentMission;
    if (currentMission) {
      import('./config/interactiveConfigs').then(({ getInteractiveConfig }) => {
        const config = getInteractiveConfig(currentMission.id);
        if (config) {
          const defaults: Record<string, number> = {};
          config.parameters.forEach((p) => {
            defaults[p.name] = p.defaultValue;
          });
          setParameters(defaults);
        }
      });
    }
  }, [setParameters]);

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/lab" element={<LabPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
