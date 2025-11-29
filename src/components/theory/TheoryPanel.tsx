import { useAppStore } from '../../store/useAppStore';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function TheoryPanel() {
  const currentMission = useAppStore((state) => state.currentMission);
  const setTheoryPanelOpen = useAppStore((state) => state.setTheoryPanelOpen);

  if (!currentMission) {
    return (
      <div className="text-[var(--color-text-secondary)] text-sm">
        Выбери миссию, чтобы увидеть теорию
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">📖 Теория</h2>
        <button
          onClick={() => setTheoryPanelOpen(false)}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          ✕
        </button>
      </div>

      {/* Briefing */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-accent-blue)]">
          Задача
        </h3>
        <div className="text-sm space-y-2">
          <p><strong>Ситуация:</strong> {currentMission.briefing.situation}</p>
          <p><strong>Задача:</strong> {currentMission.briefing.task}</p>
          {currentMission.briefing.context && (
            <p className="text-[var(--color-text-secondary)]">
              {currentMission.briefing.context}
            </p>
          )}
        </div>
      </div>

      {/* Theory Content */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-accent-blue)]">
          Теоретическая справка
        </h3>
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {getTheoryContent(currentMission.theory)}
          </ReactMarkdown>
        </div>
      </div>

      {/* Hints */}
      {currentMission.hints.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-accent-orange)]">
            💡 Подсказки
          </h3>
          <HintSection />
        </div>
      )}
    </div>
  );
}

function HintSection() {
  const currentMission = useAppStore((state) => state.currentMission);
  const showHints = useAppStore((state) => state.showHints);
  const currentHintLevel = useAppStore((state) => state.currentHintLevel);
  const nextHint = useAppStore((state) => state.nextHint);
  const setShowHints = useAppStore((state) => state.setShowHints);

  if (!currentMission) return null;

  return (
    <div className="space-y-2">
      {!showHints ? (
        <button
          onClick={() => setShowHints(true)}
          className="text-sm text-[var(--color-accent-orange)] hover:underline"
        >
          Показать подсказку
        </button>
      ) : (
        <>
          {currentMission.hints
            .slice(0, currentHintLevel + 1)
            .map((hint, index) => (
              <div
                key={index}
                className="p-3 bg-[var(--color-bg-primary)] rounded border border-gray-700 text-sm"
              >
                <div className="font-semibold mb-1">Подсказка {index + 1}:</div>
                <div className="text-[var(--color-text-secondary)]">
                  {hint.text}
                </div>
              </div>
            ))}
          {currentHintLevel < currentMission.hints.length - 1 && (
            <button
              onClick={nextHint}
              className="text-sm text-[var(--color-accent-orange)] hover:underline"
            >
              Следующая подсказка
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Helper function to get theory content for a mission
function getTheoryContent(theoryRefs: string[]): string {
  // Mission theory is now directly passed as markdown strings
  // Join them with newlines to create the complete markdown content
  return theoryRefs.join('\n');
}
