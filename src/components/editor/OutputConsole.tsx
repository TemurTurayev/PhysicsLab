import { useAppStore } from '../../store/useAppStore';

export default function OutputConsole() {
  const consoleOutput = useAppStore((state) => state.consoleOutput);
  const clearConsoleOutput = useAppStore((state) => state.clearConsoleOutput);

  if (consoleOutput.length === 0) {
    return (
      <div className="h-32 bg-[#1a1a1a] border-t border-gray-700 p-4 text-gray-500 text-sm">
        Консоль (вывод появится здесь после запуска)
      </div>
    );
  }

  return (
    <div className="h-32 bg-[#1a1a1a] border-t border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <span className="text-sm text-gray-400">Консоль</span>
        <button
          onClick={clearConsoleOutput}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Очистить
        </button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
        {consoleOutput.map((item, index) => (
          <div
            key={index}
            className={`mb-1 ${
              item.type === 'error'
                ? 'text-red-400'
                : item.type === 'result'
                ? 'text-green-400'
                : 'text-gray-300'
            }`}
          >
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
}
