import { useEffect, Suspense, lazy } from 'react';
import Header from './components/layout/Header';
import OutputConsole from './components/editor/OutputConsole';
import { useAppStore } from './store/useAppStore';
import { usePython } from './hooks/usePython';
import mission1_1 from './content/missions/mission1_1';

// Lazy load Monaco Editor
const CodeEditor = lazy(() => import('./components/editor/CodeEditor'));

function App() {
  const setCurrentMission = useAppStore((state) => state.setCurrentMission);
  const resetMission = useAppStore((state) => state.resetMission);
  const code = useAppStore((state) => state.code);
  const isRunning = useAppStore((state) => state.isRunning);

  const { runCode, isLoading, isPyodideReady } = usePython();

  useEffect(() => {
    setCurrentMission(mission1_1);
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
        {/* Visualization - Simple for now */}
        <div className="flex-1 flex items-center justify-center border-r border-gray-700 bg-[#0d1117]">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">🚀</div>
            <p className="text-lg">Визуализация</p>
            <p className="text-sm mt-2 text-gray-500">
              (Появится после запуска кода)
            </p>
          </div>
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
