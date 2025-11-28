import { useEffect } from 'react';
import Header from './components/layout/Header';
import { useAppStore } from './store/useAppStore';
import mission1_1 from './content/missions/mission1_1';

function App() {
  const setCurrentMission = useAppStore((state) => state.setCurrentMission);
  const code = useAppStore((state) => state.code);

  useEffect(() => {
    setCurrentMission(mission1_1);
  }, [setCurrentMission]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0d1117]">
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Visualization Area */}
        <div className="flex-1 flex items-center justify-center border-r border-gray-700">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">🚀</div>
            <p className="text-lg">Визуализация</p>
            <p className="text-sm mt-2">(PixiJS будет здесь)</p>
          </div>
        </div>

        {/* Code Area */}
        <div className="w-1/2 flex flex-col">
          {/* Controls */}
          <div className="h-14 border-b border-gray-700 px-4 flex items-center gap-3 bg-[#161b22]">
            <button className="px-4 py-2 rounded text-sm bg-blue-600 hover:bg-blue-700 text-white">
              ▶ Запустить
            </button>
            <button className="px-4 py-2 rounded text-sm bg-gray-700 hover:bg-gray-600 text-white">
              🔄 Сброс
            </button>
            <span className="text-sm text-gray-400 ml-4">Готов к запуску</span>
          </div>

          {/* Code Display (temporary) */}
          <div className="flex-1 bg-[#1e1e1e] p-4 overflow-auto">
            <pre className="text-sm text-gray-300 font-mono">
              {code || '// Код загружается...'}
            </pre>
            <div className="mt-4 text-xs text-gray-500">
              (Monaco Editor загрузится позже)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
