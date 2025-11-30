import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useProgressStore } from '../store/useProgressStore';
import mission1_1 from '../content/missions/mission1_1';
import mission5_1_1 from '../content/missions/mission5_1_1';
import mission5_1_2 from '../content/missions/mission5_1_2';
import mission5_1_3 from '../content/missions/mission5_1_3';
import mission5_1_4 from '../content/missions/mission5_1_4';
import mission5_1_5 from '../content/missions/mission5_1_5';
import mission5_1_6 from '../content/missions/mission5_1_6';
import type { Mission } from '../types';

interface MissionNode {
    mission: Mission;
    x: number;
    y: number;
    connections: string[];
}

export default function MissionsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const selectedModule = searchParams.get('module');
    const setCurrentMission = useAppStore((state) => state.setCurrentMission);
    const getMissionProgress = useProgressStore((state) => state.getMissionProgress);
    const getModuleProgress = useProgressStore((state) => state.getModuleProgress);

    const [hoveredMission, setHoveredMission] = useState<string | null>(null);

    const allMissions: Mission[] = [
        mission1_1,
        mission5_1_1,
        mission5_1_2,
        mission5_1_3,
        mission5_1_4,
        mission5_1_5,
        mission5_1_6,
    ];

    // Group missions by module
    const modules = allMissions.reduce((acc, mission) => {
        if (!acc[mission.module]) {
            acc[mission.module] = [];
        }
        acc[mission.module].push(mission);
        return acc;
    }, {} as Record<number, Mission[]>);

    const moduleInfo = {
        1: { name: 'Физика', icon: '⚛️', color: '#58a6ff' },
        5: { name: 'Алгебра', icon: '📊', color: '#7ee787' },
    };

    // Skill tree layout for module 5
    const module5Nodes: MissionNode[] = [
        { mission: mission5_1_1, x: 50, y: 20, connections: ['5-1-2'] },
        { mission: mission5_1_2, x: 30, y: 40, connections: ['5-1-3'] },
        { mission: mission5_1_3, x: 50, y: 60, connections: ['5-1-4', '5-1-5'] },
        { mission: mission5_1_4, x: 35, y: 80, connections: ['5-1-6'] },
        { mission: mission5_1_5, x: 65, y: 80, connections: ['5-1-6'] },
        { mission: mission5_1_6, x: 50, y: 95, connections: [] },
    ];

    const handleMissionClick = (mission: Mission) => {
        setCurrentMission(mission);
        navigate('/lab');
    };

    const renderSkillTree = (nodes: MissionNode[], moduleNum: number) => (
        <div className="relative w-full h-[600px] bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden">
            {/* SVG for connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {nodes.map((node) =>
                    node.connections.map((targetId) => {
                        const target = nodes.find((n) => n.mission.id === targetId);
                        if (!target) return null;

                        const x1 = `${node.x}%`;
                        const y1 = `${node.y}%`;
                        const x2 = `${target.x}%`;
                        const y2 = `${target.y}%`;

                        return (
                            <line
                                key={`${node.mission.id}-${targetId}`}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="#30363d"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                                className="transition-all"
                            />
                        );
                    })
                )}
            </svg>

            {/* Mission nodes */}
            {nodes.map((node) => {
                const isHovered = hoveredMission === node.mission.id;
                const nodeColor = moduleInfo[moduleNum as keyof typeof moduleInfo]?.color || '#58a6ff';

                return (
                    <button
                        key={node.mission.id}
                        onClick={() => handleMissionClick(node.mission)}
                        onMouseEnter={() => setHoveredMission(node.mission.id)}
                        onMouseLeave={() => setHoveredMission(null)}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all group"
                        style={{
                            left: `${node.x}%`,
                            top: `${node.y}%`,
                        }}
                    >
                        {/* Node circle */}
                        <div
                            className={`relative w-20 h-20 rounded-full flex items-center justify-center text-2xl border-4 transition-all ${isHovered
                                ? 'scale-125 shadow-2xl'
                                : 'scale-100 hover:scale-110'
                                }`}
                            style={{
                                backgroundColor: '#161b22',
                                borderColor: isHovered ? nodeColor : '#30363d',
                                boxShadow: isHovered ? `0 0 30px ${nodeColor}40` : 'none',
                            }}
                        >
                            {node.mission.id.includes('5-1-1') && '📐'}
                            {node.mission.id.includes('5-1-2') && '📏'}
                            {node.mission.id.includes('5-1-3') && '⏸'}
                            {node.mission.id.includes('5-1-4') && '🐍'}
                            {node.mission.id.includes('5-1-5') && '♾️'}
                            {node.mission.id.includes('5-1-6') && '🎨'}

                            {/* Stars indicator */}
                            {(() => {
                                const progress = getMissionProgress(node.mission.id);
                                if (progress && progress.completed) {
                                    return (
                                        <div className="absolute -top-1 -right-1 flex gap-0.5">
                                            {[1, 2, 3].map((star) => (
                                                <span
                                                    key={star}
                                                    className={`text-xs ${star <= progress.score
                                                            ? 'text-yellow-400'
                                                            : 'text-gray-700'
                                                        }`}
                                                >
                                                    ⭐
                                                </span>
                                            ))}
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        {/* Label */}
                        <div
                            className={`mt-2 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                            style={{
                                backgroundColor: `${nodeColor}20`,
                                color: nodeColor,
                                border: `1px solid ${nodeColor}40`,
                            }}
                        >
                            {node.mission.title}
                        </div>

                        {/* Tooltip on hover */}
                        {isHovered && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 w-64 bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-xl z-10 pointer-events-none">
                                <h4 className="font-semibold text-[#c9d1d9] mb-1">{node.mission.title}</h4>
                                <p className="text-xs text-[#8b949e] mb-2">{node.mission.briefing.situation}</p>
                                <div className="text-xs text-[#6e7681]">
                                    Click to start mission →
                                </div>
                            </div>
                        )}
                    </button>
                );
            })}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-[#161b22] border border-[#30363d] rounded-lg p-3">
                <div className="text-xs text-[#8b949e] mb-2">Skill Tree Progress:</div>
                {(() => {
                    const moduleProgress = getModuleProgress(moduleNum);
                    return (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#7ee787]"></div>
                                <span className="text-xs text-[#8b949e]">
                                    {moduleProgress.completed} / {moduleProgress.total} миссий
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-yellow-400">⭐</span>
                                <span className="text-xs text-[#8b949e]">
                                    {moduleProgress.stars} звёзд
                                </span>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );

    const renderModuleCard = (moduleNum: number) => {
        const missions = modules[moduleNum] || [];
        const info = moduleInfo[moduleNum as keyof typeof moduleInfo];
        if (!info) return null;

        return (
            <div key={moduleNum} className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                    <div className="text-5xl">{info.icon}</div>
                    <div>
                        <h2 className="text-3xl font-bold text-[#c9d1d9]">
                            Модуль {moduleNum}: {info.name}
                        </h2>
                        <p className="text-[#8b949e]">{missions.length} миссий</p>
                    </div>
                </div>

                {moduleNum === 5 ? (
                    renderSkillTree(module5Nodes, moduleNum)
                ) : (
                    <div className="grid gap-4">
                        {missions.map((mission) => (
                            <button
                                key={mission.id}
                                onClick={() => handleMissionClick(mission)}
                                className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 hover:border-[#58a6ff] transition-all text-left group"
                            >
                                <h3 className="text-xl font-semibold text-[#c9d1d9] group-hover:text-[#58a6ff] mb-2">
                                    {mission.title}
                                </h3>
                                <p className="text-sm text-[#8b949e]">{mission.briefing.situation}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen w-full bg-[#0d1117] overflow-auto">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-[#c9d1d9] mb-2">🗺️ Карта миссий</h1>
                        <p className="text-[#8b949e]">Выбери миссию и начни своё путешествие</p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded-lg transition-colors"
                    >
                        ← На главную
                    </button>
                </div>

                {/* Module filter tabs */}
                <div className="flex gap-2 mb-8">
                    <button
                        onClick={() => navigate('/missions')}
                        className={`px-4 py-2 rounded-lg transition-colors ${!selectedModule
                            ? 'bg-[#238636] text-white'
                            : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]'
                            }`}
                    >
                        Все модули
                    </button>
                    {Object.keys(modules).map((mod) => {
                        const moduleNum = parseInt(mod);
                        const info = moduleInfo[moduleNum as keyof typeof moduleInfo];
                        return (
                            <button
                                key={mod}
                                onClick={() => navigate(`/missions?module=${mod}`)}
                                className={`px-4 py-2 rounded-lg transition-colors ${selectedModule === mod
                                    ? 'text-white'
                                    : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]'
                                    }`}
                                style={{
                                    backgroundColor: selectedModule === mod ? info?.color : undefined,
                                }}
                            >
                                {info?.icon} {info?.name}
                            </button>
                        );
                    })}
                </div>

                {/* Modules */}
                <div>
                    {selectedModule
                        ? renderModuleCard(parseInt(selectedModule))
                        : Object.keys(modules)
                            .map(Number)
                            .sort()
                            .map((mod) => renderModuleCard(mod))}
                </div>
            </div>
        </div>
    );
}
