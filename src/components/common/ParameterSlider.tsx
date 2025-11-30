import { useState } from 'react';

interface ParameterSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    unit?: string;
    defaultValue?: number;
}

export default function ParameterSlider({
    label,
    value,
    min,
    max,
    step,
    onChange,
    unit = '',
    defaultValue,
}: ParameterSliderProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleReset = () => {
        if (defaultValue !== undefined) {
            onChange(defaultValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            e.preventDefault();
            onChange(Math.min(max, value + step));
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            e.preventDefault();
            onChange(Math.max(min, value - step));
        }
    };

    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className="flex flex-col gap-2 p-3 bg-[#161b22] rounded-lg border border-[#21262d] hover:border-[#30363d] transition-colors">
            {/* Label and Value Display */}
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[#8b949e]">
                    {label}
                </label>
                <div className="flex items-center gap-2">
                    <span className="text-base font-mono text-[#58a6ff] font-semibold min-w-[60px] text-right">
                        {value.toFixed(step < 1 ? 1 : 0)}{unit}
                    </span>
                    {defaultValue !== undefined && value !== defaultValue && (
                        <button
                            onClick={handleReset}
                            className="text-xs text-[#6e7681] hover:text-[#8b949e] transition-colors"
                        >
                            ↺ сброс
                        </button>
                    )}
                </div>
            </div>

            {/* Slider */}
            <div className="relative">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    onMouseDown={() => setIsDragging(true)}
                    onMouseUp={() => setIsDragging(false)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-2 bg-[#21262d] rounded-lg appearance-none cursor-pointer slider"
                    style={{
                        background: `linear-gradient(to right, #58a6ff 0%, #58a6ff ${percentage}%, #21262d ${percentage}%, #21262d 100%)`,
                    }}
                />

                {/* Min/Max Labels */}
                <div className="flex justify-between mt-1 text-xs text-[#6e7681]">
                    <span>{min}{unit}</span>
                    <span>{max}{unit}</span>
                </div>
            </div>

            {/* Dragging Indicator */}
            {isDragging && (
                <div className="absolute top-0 right-0 text-xs text-[#7ee787] animate-pulse">
                    ✓ изменяется
                </div>
            )}

            {/* CSS for slider thumb */}
            <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #58a6ff;
          cursor: pointer;
          border: 2px solid #0d1117;
          transition: all 0.15s ease;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          background: #79c0ff;
        }

        .slider::-webkit-slider-thumb:active {
          transform: scale(0.9);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #58a6ff;
          cursor: pointer;
          border: 2px solid #0d1117;
          transition: all 0.15s ease;
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          background: #79c0ff;
        }

        .slider::-moz-range-thumb:active {
          transform: scale(0.9);
        }

        .slider:focus {
          outline: none;
          box-shadow: 0 0 0 2px #58a6ff40;
        }
      `}</style>
        </div>
    );
}
