import { useState, useCallback } from 'react';
import { runPythonCode, loadPyodide } from '../lib/pyodide';
import { useAppStore } from '../store/useAppStore';

export function usePython() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPyodideReady, setIsPyodideReady] = useState(false);

  const setIsRunning = useAppStore((state) => state.setIsRunning);
  const addConsoleOutput = useAppStore((state) => state.addConsoleOutput);
  const clearConsoleOutput = useAppStore((state) => state.clearConsoleOutput);

  // Initialize Pyodide
  const initialize = useCallback(async () => {
    if (isPyodideReady) return;

    setIsLoading(true);
    addConsoleOutput({
      type: 'log',
      content: 'Загрузка Python runtime...',
      timestamp: Date.now(),
    });

    try {
      await loadPyodide();
      setIsPyodideReady(true);
      addConsoleOutput({
        type: 'log',
        content: '✓ Python runtime готов',
        timestamp: Date.now(),
      });
    } catch (error: any) {
      addConsoleOutput({
        type: 'error',
        content: `Ошибка загрузки Python: ${error.message}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [isPyodideReady, addConsoleOutput]);

  // Run Python code
  const runCode = useCallback(
    async (code: string) => {
      setIsRunning(true);
      clearConsoleOutput();

      addConsoleOutput({
        type: 'log',
        content: '▶ Запуск кода...',
        timestamp: Date.now(),
      });

      try {
        // Initialize if not ready
        if (!isPyodideReady) {
          await initialize();
        }

        // Run the code
        const result = await runPythonCode(code);

        if (result.success) {
          if (result.output) {
            addConsoleOutput({
              type: 'log',
              content: result.output,
              timestamp: Date.now(),
            });
          }
          addConsoleOutput({
            type: 'log',
            content: '✓ Выполнено успешно',
            timestamp: Date.now(),
          });
        } else {
          addConsoleOutput({
            type: 'error',
            content: result.error || 'Неизвестная ошибка',
            timestamp: Date.now(),
          });
        }
      } catch (error: any) {
        addConsoleOutput({
          type: 'error',
          content: error.message || String(error),
          timestamp: Date.now(),
        });
      } finally {
        setIsRunning(false);
      }
    },
    [isPyodideReady, initialize, setIsRunning, clearConsoleOutput, addConsoleOutput]
  );

  return {
    runCode,
    initialize,
    isLoading,
    isPyodideReady,
  };
}
