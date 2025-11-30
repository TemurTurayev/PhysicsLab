export default function LoadingScreen() {
    return (
        <div className="fixed inset-0 bg-[#0d1117] flex items-center justify-center z-50">
            <div className="text-center">
                {/* Animated Logo */}
                <div className="mb-8">
                    <div className="flex items-center justify-center gap-4 text-6xl mb-4">
                        <span className="animate-bounce">🚀</span>
                        <span className="text-4xl font-bold bg-gradient-to-r from-[#58a6ff] via-[#7ee787] to-[#d2a8ff] bg-clip-text text-transparent">
                            PhysicsCodeLab
                        </span>
                        <span className="animate-bounce delay-200">⚛️</span>
                    </div>
                </div>

                {/* Loading Spinner */}
                <div className="flex justify-center mb-4">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-4 border-[#21262d] rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-[#58a6ff] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    </div>
                </div>

                {/* Loading Text */}
                <p className="text-[#8b949e] animate-pulse">
                    Загрузка Python окружения...
                </p>

                {/* Progress Dots */}
                <div className="flex justify-center gap-2 mt-4">
                    <div className="w-2 h-2 bg-[#58a6ff] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#7ee787] rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-[#d2a8ff] rounded-full animate-bounce delay-200"></div>
                </div>
            </div>

            <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-bounce {
          animation: bounce 1s ease-in-out infinite;
        }

        .delay-100 {
          animation-delay: 0.1s;
        }

        .delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>
        </div>
    );
}
