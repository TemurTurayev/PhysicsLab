import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { ThemeProvider } from './contexts/ThemeContext';
import LoadingScreen from './components/common/LoadingScreen';
import PageTransition from './components/common/PageTransition';
import HomePage from './pages/HomePage';
import MissionsPage from './pages/MissionsPage';
import LabPage from './pages/LabPage';
import NotFoundPage from './pages/NotFoundPage';

const WorldMap = lazy(() => import('./lab/ui/WorldMap').then((m) => ({ default: m.WorldMap })));
const TrebuchetLab = lazy(() => import('./lab/ui/LabPage').then((m) => ({ default: m.LabPage })));

function App() {
  const setParameters = useAppStore((state) => state.setParameters);

  // Enable smooth scrolling globally
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';

    // Run animation and theme tests in development
    if (import.meta.env.DEV) {
      import('./utils/animationTest').then(({ AnimationTester, AnimationPerformance }) => {
        AnimationTester.runTests();
        AnimationPerformance.runTests();
      });

      import('./utils/themeTest').then(({ ThemeTester, ThemePersistenceTester }) => {
        ThemeTester.runTests();
        ThemePersistenceTester.runTests();
      });
    }

    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

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
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
            <Route path="/missions" element={<PageTransition><MissionsPage /></PageTransition>} />
            <Route path="/lab" element={<PageTransition><LabPage /></PageTransition>} />
            <Route path="/trebuchet" element={<WorldMap />} />
            <Route path="/trebuchet/:missionId" element={<TrebuchetLab />} />
            <Route path="*" element={<PageTransition><NotFoundPage /></PageTransition>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
