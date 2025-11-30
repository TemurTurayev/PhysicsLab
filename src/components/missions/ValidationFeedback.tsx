import { useEffect } from 'react';
import { useProgressStore } from '../../store/useProgressStore';
import { useAppStore } from '../../store/useAppStore';
import type { ValidationResult } from '../../engine/validation/MissionValidator';

interface ValidationFeedbackProps {
    result: ValidationResult | null;
    onClose?: () => void;
}

export default function ValidationFeedback({ result, onClose }: ValidationFeedbackProps) {
    const currentMission = useAppStore((state) => state.currentMission);
    const markMissionComplete = useProgressStore((state) => state.markMissionComplete);

    // Auto-save progress when validation passes
    useEffect(() => {
        if (result && result.passed && currentMission) {
            markMissionComplete(currentMission.id, result.score);
        }
    }, [result, currentMission, markMissionComplete]);

    if (!result) return null;

    const { passed, score, feedback, errors } = result;

    return (
        <div className="fixed bottom-4 right-4 w-96 bg-[#161b22] border-2 rounded-lg shadow-2xl z-50 overflow-hidden animate-slide-up"
            style={{
                borderColor: passed ? '#7ee787' : errors.length > 0 ? '#f85149' : '#58a6ff',
            }}
        >
            {/* Header */}
            <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                    backgroundColor: passed ? '#23863620' : errors.length > 0 ? '#f8514920' : '#58a6ff20',
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="text-2xl">
                        {passed ? '✅' : errors.length > 0 ? '❌' : '⏳'}
                    </div>
                    <div>
                        <h3 className="font-semibold text-[#c9d1d9]">
                            {passed ? 'Отличная работа!' : errors.length > 0 ? 'Есть ошибки' : 'Проверка...'}
                        </h3>
                        <div className="flex gap-1 mt-1">
                            {[1, 2, 3].map((star) => (
                                <span
                                    key={star}
                                    className={`text-lg transition-all ${star <= score ? 'text-yellow-400 scale-110' : 'text-gray-600'}`}
                                >
                                    ⭐
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-4 max-h-64 overflow-y-auto">
                {/* Success feedback */}
                {feedback.length > 0 && (
                    <div className="mb-3">
                        <p className="text-xs text-[#8b949e] mb-2 font-semibold">✓ Выполнено:</p>
                        <ul className="space-y-1">
                            {feedback.map((item, index) => (
                                <li key={index} className="text-sm text-[#7ee787] flex items-start gap-2">
                                    <span className="mt-0.5">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Errors */}
                {errors.length > 0 && (
                    <div>
                        <p className="text-xs text-[#8b949e] mb-2 font-semibold">✗ Требуется исправить:</p>
                        <ul className="space-y-1">
                            {errors.map((error, index) => (
                                <li key={index} className="text-sm text-[#f85149] flex items-start gap-2">
                                    <span className="mt-0.5">•</span>
                                    <span>{error}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Hint */}
                {!passed && errors.length > 0 && (
                    <div className="mt-4 p-3 bg-[#0d1117] border border-[#30363d] rounded">
                        <p className="text-xs text-[#8b949e]">
                            💡 <span className="font-semibold">Подсказка:</span> Проверьте требования миссии
                            и убедитесь, что ваш код точно соответствует заданию.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            {passed && (
                <div className="px-4 py-3 bg-[#0d1117] border-t border-[#30363d] flex justify-between items-center">
                    <p className="text-xs text-[#8b949e]">
                        {score === 3 ? '🏆 Идеально!' : score === 2 ? '✨ Хорошо!' : '👍 Неплохо!'}
                    </p>
                    <button
                        className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-sm rounded transition-colors"
                        onClick={() => {
                            if (onClose) onClose();
                            // Navigate to missions could be added here
                        }}
                    >
                        Продолжить →
                    </button>
                </div>
            )}

            <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
        </div>
    );
}
