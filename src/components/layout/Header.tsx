import { useAppStore } from '../../store/useAppStore';
import { useState, useEffect, useRef } from 'react';
import mission5_1_1 from '../../content/missions/mission5_1_1';
import mission5_1_2 from '../../content/missions/mission5_1_2';
import mission5_1_3 from '../../content/missions/mission5_1_3';

export default function Header() {
  const currentMission = useAppStore((state) => state.currentMission);
  const theoryPanelOpen = useAppStore((state) => state.theoryPanelOpen);
  const setTheoryPanelOpen = useAppStore((state) => state.setTheoryPanelOpen);
  const setCurrentMission = useAppStore((state) => state.setCurrentMission);
  const resetMission = useAppStore((state) => state.resetMission);

  const [missionSelectorOpen, setMissionSelectorOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const missions = [mission5_1_1, mission5_1_2, mission5_1_3];

  const handleMissionChange = (mission: typeof mission5_1_1) => {
    resetMission();
    setCurrentMission(mission);
    setMissionSelectorOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMissionSelectorOpen(false);
      }
    };

    if (missionSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [missionSelectorOpen]);

  return (
    <header className="h-16 bg-[var(--color-bg-secondary)] border-b border-gray-700 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">PhysicsCodeLab</h1>
        {currentMission && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-text-secondary)]">•</span>
            <span className="text-sm">
              Миссия {currentMission.id}: {currentMission.title}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Mission Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setMissionSelectorOpen(!missionSelectorOpen)}
            className="px-4 py-2 rounded text-sm font-medium bg-gray-700 text-[var(--color-text-primary)] hover:bg-gray-600 transition-colors"
          >
            🎯 Миссии
          </button>

          {missionSelectorOpen && (
            <div className="absolute top-full mt-2 right-0 bg-[#161b22] border border-gray-700 rounded shadow-lg min-w-[250px] z-50">
              {missions.map((mission) => (
                <button
                  key={mission.id}
                  onClick={() => handleMissionChange(mission)}
                  className={`
                    w-full text-left px-4 py-3 text-sm hover:bg-gray-700 transition-colors border-b border-gray-800 last:border-b-0
                    ${currentMission?.id === mission.id ? 'bg-gray-700 text-[var(--color-accent-blue)]' : 'text-[var(--color-text-primary)]'}
                  `}
                >
                  <div className="font-medium">Миссия {mission.id}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {mission.title}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setTheoryPanelOpen(!theoryPanelOpen)}
          className={`
            px-4 py-2 rounded text-sm font-medium transition-colors
            ${
              theoryPanelOpen
                ? 'bg-[var(--color-accent-blue)] text-white'
                : 'bg-gray-700 text-[var(--color-text-primary)] hover:bg-gray-600'
            }
          `}
        >
          📖 Теория
        </button>
      </div>
    </header>
  );
}
