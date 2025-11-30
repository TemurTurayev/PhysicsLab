import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlay, modalPanel, modalPanelTransition } from '../../lib/animations';

interface TutorialOverlayProps {
    isActive: boolean;
    message: string;
    stepIndex: number;
    totalSteps: number;
    position?: { x: number; y: number };
    onNext: () => void;
    onPrevious: () => void;
    onSkip: () => void;
}

export default function TutorialOverlay({
    isActive,
    message,
    stepIndex,
    totalSteps,
    position,
    onNext,
    onPrevious,
    onSkip,
}: TutorialOverlayProps) {
    if (!isActive) return null;

    const overlayPosition = position || { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 };

    return (
        <AnimatePresence>
            {isActive && (
                <>
                    {/* Dark overlay */}
                    <motion.div
                        className="fixed inset-0 bg-black/50 z-[9998]"
                        {...modalOverlay}
                        onClick={onSkip}
                    />

                    {/* Tutorial card */}
                    <motion.div
                        className="fixed z-[9999] bg-[#161b22] border-2 border-[#58a6ff] rounded-lg shadow-2xl p-6 max-w-sm"
                        style={{
                            left: overlayPosition.x,
                            top: overlayPosition.y,
                        }}
                        {...modalPanel}
                        transition={modalPanelTransition}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">💡</span>
                                <h3 className="text-lg font-semibold text-[#c9d1d9]">
                                    Подсказка {stepIndex + 1}/{totalSteps}
                                </h3>
                            </div>
                            <button
                                onClick={onSkip}
                                className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Message */}
                        <p className="text-[#c9d1d9] mb-6">{message}</p>

                        {/* Navigation */}
                        <div className="flex items-center justify-between gap-4">
                            <button
                                onClick={onPrevious}
                                disabled={stepIndex === 0}
                                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ← Назад
                            </button>

                            <div className="flex gap-1">
                                {Array.from({ length: totalSteps }).map((_, index) => (
                                    <div
                                        key={index}
                                        className={`w-2 h-2 rounded-full transition-colors ${index === stepIndex ? 'bg-[#58a6ff]' : 'bg-[#30363d]'
                                            }`}
                                    />
                                ))}
                            </div>

                            {stepIndex < totalSteps - 1 ? (
                                <button
                                    onClick={onNext}
                                    className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors"
                                >
                                    Далее →
                                </button>
                            ) : (
                                <button
                                    onClick={onNext}
                                    className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors"
                                >
                                    Готово ✓
                                </button>
                            )}
                        </div>

                        {/* Skip button */}
                        <button
                            onClick={onSkip}
                            className="w-full mt-4 text-sm text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
                        >
                            Пропустить туториал
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
