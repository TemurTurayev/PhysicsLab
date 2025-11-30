import { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { ThemeProvider } from './contexts/ThemeContext';
import LoadingScreen from './components/common/LoadingScreen';
import PageTransition from './components/common/PageTransition';
import HomePage from './pages/HomePage';
import MissionsPage from './pages/MissionsPage';
import LabPage from './pages/LabPage';
import NotFoundPage from './pages/NotFoundPage';

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
          <PageTransition>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/missions" element={<MissionsPage />} />
              <Route path="/lab" element={<LabPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </PageTransition>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
