import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] flex items-center justify-center overflow-hidden">
            <div className="text-center relative z-10">
                {/* 404 Animation */}
                <div className="mb-8 relative">
                    <div className="text-[150px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#58a6ff] via-[#7ee787] to-[#d2a8ff] animate-pulse">
                        404
                    </div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl animate-bounce">
                        🤔
                    </div>
                </div>

                {/* Message */}
                <h1 className="text-3xl md:text-5xl font-bold text-[#c9d1d9] mb-4">
                    Страница не найдена
                </h1>
                <p className="text-lg text-[#8b949e] mb-8 max-w-md mx-auto">
                    Похоже, вы отправились в неизведанную область пространства.
                    Давайте вернём вас в безопасное место!
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-gradient-to-r from-[#238636] to-[#2ea043] hover:from-[#2ea043] hover:to-[#238636] text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
                    >
                        🏠 На главную
                    </button>
                    <button
                        onClick={() => navigate('/missions')}
                        className="px-6 py-3 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] font-semibold rounded-lg transition-colors border border-[#30363d]"
                    >
                        🗺️ К миссиям
                    </button>
                </div>

                {/* Fun Facts */}
                <div className="mt-12 p-6 bg-[#161b22] border border-[#30363d] rounded-lg max-w-md mx-auto">
                    <p className="text-sm text-[#8b949e] mb-2">💡 А знаете ли вы?</p>
                    <p className="text-sm text-[#c9d1d9]">
                        HTTP код 404 означает "Not Found". Впервые был использован в 1992 году
                        в CERN, где изобрели WorldWideWeb!
                    </p>
                </div>
            </div>

            {/* Background decorations */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-20 left-10 w-96 h-96 bg-[#58a6ff] rounded-full opacity-10 blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#d2a8ff] rounded-full opacity-10 blur-3xl animate-pulse delay-1000"></div>
            </div>

            <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.15;
          }
        }

        .animate-pulse {
          animation: pulse 3s ease-in-out infinite;
        }

        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
        </div>
    );
}
