import { Suspense, lazy, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OutputConsole from '../components/editor/OutputConsole';
import SimulationCanvas from '../components/simulation/SimulationCanvas';
import MathCanvas from '../components/math/MathCanvas';
import TheoryPanel from '../components/theory/TheoryPanel';
import InteractivePanel from '../components/missions/InteractivePanel';
import ValidationFeedback from '../components/missions/ValidationFeedback';
import Tooltip from '../components/ui/Tooltip';
import { useAppStore } from '../store/useAppStore';
import { usePython } from '../hooks/usePython';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect';
import { getInteractiveConfig } from '../config/interactiveConfigs';
import { MissionValidator, type ValidationResult } from '../engine/validation/MissionValidator';

const CodeEditor = lazy(() => import('../components/editor/CodeEditor'));

export default function LabPage() {
    const navigate = useNavigate();
    const resetMission = useAppStore((state) => state.resetMission);
    const setCode = useAppStore((state) => state.setCode);
    const currentMission = useAppStore((state) => state.currentMission);
    const code = useAppStore((state) => state.code);
    const isRunning = useAppStore((state) => state.isRunning);
    const mathCanvasState = useAppStore((state) => state.mathCanvasState);
    const theoryPanelOpen = useAppStore((state) => state.theoryPanelOpen);
    const setTheoryPanelOpen = useAppStore((state) => state.setTheoryPanelOpen);
    const consoleOutput = useAppStore((state) => state.consoleOutput);
    const parameters = useAppStore((state) => state.parameters);
    const setParameter = useAppStore((state) => state.setParameter);
    const setParameters = useAppStore((state) => state.setParameters);

    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [showValidation, setShowValidation] = useState(false);

    const { runCode, isLoading, isPyodideReady } = usePython();

    const isMathMission = currentMission?.module === 5 || currentMission?.module === 6;

    const handleRun = async () => {
        await runCode(code);
        // Auto-validate after execution
        if (currentMission) {
            setTimeout(() => validateMission(), 500);
        }
    };

    const validateMission = async () => {
        if (!currentMission) return;

        const consoleText = consoleOutput.map(o => o.content);
        const result = await MissionValidator.validateMission(
            currentMission,
            code,
            consoleText,
            mathCanvasState
        );

        setValidationResult(result);
        setShowValidation(true);
    };

    const handleReset = () => {
        resetMission();
        if (currentMission) {
            const config = getInteractiveConfig(currentMission.id);
            if (config) {
                const defaults: Record<string, number> = {};
                config.parameters.forEach((p) => {
                    defaults[p.name] = p.defaultValue;
                });
                setParameters(defaults);
            }
        }
    };

    useDebouncedEffect(
        () => {
            if (currentMission) {
                const config = getInteractiveConfig(currentMission.id);
                if (config) {
                    const newCode = config.codeTemplate(parameters);
                    setCode(newCode);
                }
            }
        },
        [parameters, currentMission],
        150
    );

    const interactiveConfig = currentMission ? getInteractiveConfig(currentMission.id) : null;
    const interactiveParams = interactiveConfig
        ? interactiveConfig.parameters.map((p) => ({
            ...p,
            value: parameters[p.name] ?? p.defaultValue,
        }))
        : [];

    if (!currentMission) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[#0d1117]">
                <div className="text-center">
                    <div className="text-6xl mb-4">🎯</div>
                    <h2 className="text-2xl font-bold text-[#c9d1d9] mb-4">Выберите миссию</h2>
                    <p className="text-[#8b949e] mb-6">Сначала выберите миссию на карте</p>
                    <button
                        onClick={() => navigate('/missions')}
                        className="px-6 py-3 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg transition-colors"
                    >
                        → Перейти к миссиям
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-[#0d1117]">
            {/* Header */}
            <header className="h-14 border-b border-gray-700 bg-[#161b22] flex items-center px-4 gap-4">
                <button
                    onClick={() => navigate('/missions')}
                    className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded text-sm transition-colors"
                >
                    ← Миссии
                </button>

                <div className="flex-1 flex items-center gap-3">
                    <h1 className="text-lg font-semibold text-[#c9d1d9]">{currentMission.title}</h1>
                    <span className="text-sm text-[#8b949e]">•</span>
                    <span className="text-sm text-[#8b949e]">Модуль {currentMission.module}</span>
                </div>

                <Tooltip content="Открыть панель теории с объяснениями и формулами" position="bottom">
                    <button
                        onClick={() => setTheoryPanelOpen(!theoryPanelOpen)}
                        className={`px-4 py-2 rounded text-sm transition-colors ${theoryPanelOpen
                            ? 'bg-[#238636] text-white'
                            : 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]'
                            }`}
                    >
                        📚 Теория
                    </button>
                </Tooltip>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col tablet-lg:flex-row">
                {/* Theory Panel */}
                {theoryPanelOpen && (
                    <div className="w-full tablet-lg:w-80 border-b tablet-lg:border-b-0 tablet-lg:border-r border-gray-700 overflow-y-auto bg-[#161b22] p-4 tablet-lg:p-6 max-h-[300px] tablet-lg:max-h-none">
                        <TheoryPanel />
                    </div>
                )}

                {/* Visualization */}
                <div className="flex-1 border-b tablet-lg:border-b-0 tablet-lg:border-r border-gray-700 min-h-[300px] tablet-lg:min-h-0">
                    {isMathMission || mathCanvasState ? <MathCanvas /> : <SimulationCanvas />}
                </div>

                {/* Code Area */}
                <div className="w-full tablet-lg:w-1/2 flex flex-col min-h-[400px] tablet-lg:min-h-0">
                    {/* Controls */}
                    <div className="h-14 border-b border-gray-700 px-4 flex items-center gap-3 bg-[#161b22]">
                        <Tooltip content="Запустить код Python и увидеть результат" position="top">
                            <button
                                onClick={handleRun}
                                disabled={isRunning || !isPyodideReady}
                                className="px-6 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isRunning ? '⏳ Выполняется...' : '▶ Запустить'}
                            </button>
                        </Tooltip>
                        <Tooltip content="Вернуть исходный код миссии" position="top">
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded transition-colors"
                            >
                                🔄 Сброс
                            </button>
                        </Tooltip>
                        <span className="text-sm text-gray-400 ml-4">
                            {isLoading
                                ? 'Загрузка Python...'
                                : isPyodideReady
                                    ? '✓ Python готов'
                                    : 'Готов к запуску'}
                        </span>
                    </div>

                    {/* Interactive Parameters Panel */}
                    {interactiveParams.length > 0 && (
                        <div className="border-b border-gray-700 p-3 bg-[#0d1117]">
                            <InteractivePanel
                                parameters={interactiveParams}
                                onParameterChange={setParameter}
                                collapsible={true}
                            />
                        </div>
                    )}

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

                    {/* Console Output */}
                    <OutputConsole />
                </div>
            </div>

            {/* Validation Feedback */}
            {
                showValidation && (
                    <ValidationFeedback
                        result={validationResult}
                        onClose={() => setShowValidation(false)}
                    />
                )
            }
        </div >
    );
}
