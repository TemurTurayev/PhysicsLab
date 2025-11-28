import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '../../store/useAppStore';

export default function CodeEditor() {
  const code = useAppStore((state) => state.code);
  const setCode = useAppStore((state) => state.setCode);
  const isRunning = useAppStore((state) => state.isRunning);
  const [loadError, setLoadError] = useState(false);

  // Fallback to textarea if Monaco fails
  if (loadError) {
    return (
      <div className="h-full flex flex-col bg-[#1e1e1e]">
        <div className="px-4 py-2 bg-yellow-900/20 text-yellow-400 text-sm border-b border-yellow-700">
          Monaco Editor не загрузился. Используется базовый редактор.
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={isRunning}
          className="flex-1 w-full p-4 bg-[#1e1e1e] text-gray-300 font-mono text-sm resize-none focus:outline-none"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      defaultLanguage="python"
      value={code}
      onChange={(value) => setCode(value || '')}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
        lineNumbers: 'on',
        roundedSelection: true,
        scrollBeyondLastLine: false,
        readOnly: isRunning,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: 'on',
        suggestOnTriggerCharacters: true,
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
      }}
      loading={
        <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
          <div className="text-[var(--color-text-secondary)]">
            Загрузка редактора...
          </div>
        </div>
      }
      onMount={() => {
        console.log('Monaco Editor mounted successfully');
      }}
      beforeMount={() => {
        console.log('Monaco Editor initializing...');
      }}
      onValidate={() => {
        // Called when content is validated
      }}
    />
  );
}
