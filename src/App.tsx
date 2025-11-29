import { useEffect, Suspense, lazy } from 'react';
import Header from './components/layout/Header';
import OutputConsole from './components/editor/OutputConsole';
import SimulationCanvas from './components/simulation/SimulationCanvas';
import MathCanvas from './components/math/MathCanvas';
import TheoryPanel from './components/theory/TheoryPanel';
import { useAppStore } from './store/useAppStore';
import { usePython } from './hooks/usePython';
import mission1_1 from './content/missions/mission1_1';
import mission5_1_1 from './content/missions/mission5_1_1';

// Lazy load Monaco Editor
const CodeEditor = lazy(() => import('./components/editor/CodeEditor'));

function App() {
  const setCurrentMission = useAppStore((state) => state.setCurrentMission);
  const resetMission = useAppStore((state) => state.resetMission);
  const currentMission = useAppStore((state) => state.currentMission);
  const code = useAppStore((state) => state.code);
  const isRunning = useAppStore((state) => state.isRunning);
  const mathCanvasState = useAppStore((state) => state.mathCanvasState);
  const pythonWorldState = useAppStore((state) => state.pythonWorldState);
  const theoryPanelOpen = useAppStore((state) => state.theoryPanelOpen);

  const { runCode, isLoading, isPyodideReady } = usePython();

  // Determine if current mission is math-based
  const isMathMission = currentMission?.module === 5 || currentMission?.module === 6;

  useEffect(() => {
    setCurrentMission(mission5_1_1);
  }, [setCurrentMission]);

  const handleRun = async () => {
    await runCode(code);
  };

  const handleReset = () => {
    resetMission();
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0d1117]">
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Theory Panel - Collapsible Side Panel */}
        {theoryPanelOpen && (
          <div className="w-80 border-r border-gray-700 overflow-y-auto bg-[#161b22] p-6">
            <TheoryPanel />
          </div>
        )}

        {/* Visualization - Switch between Physics and Math */}
        <div className="flex-1 border-r border-gray-700">
          {isMathMission || mathCanvasState ? (
            <MathCanvas />
          ) : (
            <SimulationCanvas />
          )}
        </div>

        {/* Code Area */}
        <div className="w-1/2 flex flex-col">
          {/* Controls */}
          <div className="h-14 border-b border-gray-700 px-4 flex items-center gap-3 bg-[#161b22]">
            <button
              onClick={handleRun}
              disabled={isRunning || isLoading}
              className="px-4 py-2 rounded text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? '⏳ Выполняется...' : '▶ Запустить'}
            </button>
            <button
              onClick={handleReset}
              disabled={isRunning}
              className="px-4 py-2 rounded text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50"
            >
              🔄 Сброс
            </button>
            <span className="text-sm text-gray-400 ml-4">
              {isLoading
                ? 'Загрузка Python...'
                : isPyodideReady
                ? '✓ Python готов'
                : 'Готов к запуску'}
            </span>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1">
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center bg-[#1e1e1e] text-gray-400">
                  <div className="text-center">
                    <div className="mb-2">⏳</div>
                    <div>Загрузка редактора...</div>
                  </div>
                </div>
              }
            >
              <CodeEditor />
            </Suspense>
          </div>

          {/* Console Output */}
          <OutputConsole />
        </div>
      </div>
    </div>
  );
}

export default App;
