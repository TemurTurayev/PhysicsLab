import { useState } from 'react';
import ParameterSlider from '../common/ParameterSlider';

interface Parameter {
    name: string;
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    defaultValue: number;
}

interface InteractivePanelProps {
    title?: string;
    parameters: Parameter[];
    onParameterChange: (name: string, value: number) => void;
    collapsible?: boolean;
}

export default function InteractivePanel({
    title = '🎛️ Интерактивные параметры',
    parameters,
    onParameterChange,
    collapsible = true,
}: InteractivePanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (parameters.length === 0) {
        return null;
    }

    return (
        <div className="w-full bg-[#0d1117] border border-[#21262d] rounded-lg overflow-hidden">
            {/* Header */}
            <div
                className={`flex items-center justify-between p-3 bg-[#161b22] border-b border-[#21262d] ${collapsible ? 'cursor-pointer hover:bg-[#1c2128]' : ''
                    } transition-colors`}
                onClick={() => collapsible && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#c9d1d9]">{title}</span>
                    <span className="text-xs text-[#6e7681] bg-[#21262d] px-2 py-0.5 rounded">
                        {parameters.length}
                    </span>
                </div>

                {collapsible && (
                    <button
                        className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
                    >
                        {isExpanded ? '▼' : '▶'}
                    </button>
                )}
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-4 space-y-4">
                    {/* Info Text */}
                    <p className="text-xs text-[#8b949e] mb-4">
                        💡 Двигай слайдеры и смотри, как меняется график в реальном времени!
                    </p>

                    {/* Sliders */}
                    {parameters.map((param) => (
                        <ParameterSlider
                            key={param.name}
                            label={param.label}
                            value={param.value}
                            min={param.min}
                            max={param.max}
                            step={param.step}
                            unit={param.unit}
                            defaultValue={param.defaultValue}
                            onChange={(value) => onParameterChange(param.name, value)}
                        />
                    ))}

                    {/* Reset All Button */}
                    {parameters.some((p) => p.value !== p.defaultValue) && (
                        <button
                            onClick={() => {
                                parameters.forEach((param) => {
                                    if (param.value !== param.defaultValue) {
                                        onParameterChange(param.name, param.defaultValue);
                                    }
                                });
                            }}
                            className="w-full mt-4 px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] text-sm rounded-lg transition-colors border border-[#30363d]"
                        >
                            ↺ Сбросить все параметры
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
