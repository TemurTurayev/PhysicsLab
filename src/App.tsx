import { useEffect, Suspense, lazy } from 'react';
import Header from './components/layout/Header';
import { useAppStore } from './store/useAppStore';
import mission1_1 from './content/missions/mission1_1';

// Lazy load Monaco Editor
const CodeEditor = lazy(() => import('./components/editor/CodeEditor'));

function App() {
  const setCurrentMission = useAppStore((state) => state.setCurrentMission);

  useEffect(() => {
    setCurrentMission(mission1_1);
  }, [setCurrentMission]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0d1117]">
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Visualization - Simple for now */}
        <div className="flex-1 flex items-center justify-center border-r border-gray-700 bg-[#0d1117]">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">🚀</div>
            <p className="text-lg">Визуализация</p>
            <p className="text-sm mt-2 text-gray-500">
              (Canvas появится после запуска кода)
            </p>
          </div>
        </div>

        {/* Code Area */}
        <div className="w-1/2 flex flex-col">
          {/* Controls */}
          <div className="h-14 border-b border-gray-700 px-4 flex items-center gap-3 bg-[#161b22]">
            <button className="px-4 py-2 rounded text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors">
              ▶ Запустить
            </button>
            <button className="px-4 py-2 rounded text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors">
              🔄 Сброс
            </button>
            <span className="text-sm text-gray-400 ml-4">Готов к запуску</span>
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
        </div>
      </div>
    </div>
  );
}

export default App;
