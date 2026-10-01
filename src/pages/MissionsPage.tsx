import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
        1: {
            name: 'Физика',
            icon: '⚛️',
            color: '#58a6ff',
            gradient: 'from-blue-500/20 to-cyan-500/20',
            borderGradient: 'from-blue-500 to-cyan-500',
        },
        5: {
            name: 'Алгебра',
            icon: '📊',
            color: '#7ee787',
            gradient: 'from-green-500/20 to-emerald-500/20',
            borderGradient: 'from-green-500 to-emerald-500',
        },
    };

    // Skill tree layout for module 5 - с большими расстояниями
    const module5Nodes: MissionNode[] = [
        { mission: mission5_1_1, x: 50, y: 6, connections: ['5-1-2'] },
        { mission: mission5_1_2, x: 50, y: 24, connections: ['5-1-3'] },
        { mission: mission5_1_3, x: 50, y: 42, connections: ['5-1-4', '5-1-5'] },
        { mission: mission5_1_4, x: 25, y: 62, connections: ['5-1-6'] },
        { mission: mission5_1_5, x: 75, y: 62, connections: ['5-1-6'] },
        { mission: mission5_1_6, x: 50, y: 78, connections: [] },
    ];

    const handleMissionClick = (mission: Mission) => {
        setCurrentMission(mission);
        navigate('/lab');
    };

    const renderSkillTree = (nodes: MissionNode[], moduleNum: number) => {
        const info = moduleInfo[moduleNum as keyof typeof moduleInfo];
        const moduleProgress = getModuleProgress(moduleNum);
        const percentage = (moduleProgress.completed / moduleProgress.total) * 100;

        return (
            <div className="space-y-4">
                <div className="relative w-full h-[800px] bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] rounded-2xl border border-[#30363d] overflow-hidden shadow-2xl">
                    {/* Animated background particles - уменьшено до 8 для производительности */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-1 h-1 bg-white/20 rounded-full"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                }}
                                animate={{
                                    y: [0, -20, 0],
                                    opacity: [0.2, 0.4, 0.2],
                                }}
                                transition={{
                                    duration: 4,
                                    repeat: Infinity,
                                    delay: i * 0.5,
                                    ease: 'linear',
                                }}
                            />
                        ))}
                </div>

                {/* Grid background */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `
                            linear-gradient(${info?.color}40 1px, transparent 1px),
                            linear-gradient(90deg, ${info?.color}40 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px',
                    }}
                />

                {/* SVG for connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet" style={{ transform: 'translate(50px, 50px)' }}>
                    <defs>
                        <linearGradient id={`lineGradient-${moduleNum}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={info?.color} stopOpacity="0.6" />
                            <stop offset="100%" stopColor={info?.color} stopOpacity="0.4" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    {nodes.map((node) =>
                        node.connections.map((targetId) => {
                            const target = nodes.find((n) => n.mission.id === targetId);
                            if (!target) return null;

                            const isComplete = getMissionProgress(node.mission.id)?.completed;

                            return (
                                <line
                                    key={`${node.mission.id}-${targetId}`}
                                    x1={`${node.x}%`}
                                    y1={`${node.y}%`}
                                    x2={`${target.x}%`}
                                    y2={`${target.y}%`}
                                    stroke={info?.color}
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    opacity={isComplete ? 0.7 : 0.3}
                                    style={{
                                        filter: isComplete ? 'url(#glow)' : 'none',
                                        transition: 'opacity 0.3s ease',
                                    }}
                                />
                            );
                        })
                    )}
                </svg>

                {/* Mission nodes */}
                {nodes.map((node, index) => {
                    const isHovered = hoveredMission === node.mission.id;
                    const progress = getMissionProgress(node.mission.id);
                    const isCompleted = progress?.completed;
                    const isLocked = false; // TODO: implement lock logic based on previous missions

                    const missionIcons: Record<string, string> = {
                        '5-1-1': '📐',
                        '5-1-2': '📏',
                        '5-1-3': '⏸',
                        '5-1-4': '🐍',
                        '5-1-5': '♾️',
                        '5-1-6': '🎨',
                    };

                    return (
                        <motion.div
                            key={node.mission.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: `${node.x}%`,
                                top: `${node.y}%`,
                                zIndex: isHovered ? 50 : 10,
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                        >
                            <motion.button
                                onClick={() => !isLocked && handleMissionClick(node.mission)}
                                onMouseEnter={() => setHoveredMission(node.mission.id)}
                                onMouseLeave={() => setHoveredMission(null)}
                                className="relative group"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={isLocked}
                            >
                                {/* Glow effect - только при hover для производительности */}
                                {isHovered && (
                                    <div
                                        className="absolute inset-0 rounded-full blur-xl"
                                        style={{
                                            backgroundColor: info?.color,
                                            opacity: 0.4,
                                        }}
                                    />
                                )}

                                {/* Main node */}
                                <div
                                    className={`relative w-28 h-28 rounded-full flex items-center justify-center text-4xl transition-all duration-500 ${
                                        isLocked ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                    style={{
                                        background: isCompleted
                                            ? `linear-gradient(135deg, ${info?.color}30, ${info?.color}10)`
                                            : 'linear-gradient(135deg, #161b22, #0d1117)',
                                        border: `3px solid ${isHovered || isCompleted ? info?.color : '#30363d'}`,
                                        boxShadow: isHovered
                                            ? `0 0 40px ${info?.color}80, inset 0 0 20px ${info?.color}40`
                                            : isCompleted
                                            ? `0 0 20px ${info?.color}40`
                                            : '0 4px 20px #00000080',
                                    }}
                                >
                                    {/* Inner decorative rings */}
                                    <div className="absolute inset-2 rounded-full border border-white/10" />
                                    <div className="absolute inset-4 rounded-full border border-white/5" />

                                    {/* Icon */}
                                    <span className="relative z-10 select-none" style={{ filter: 'none' }}>
                                        {isLocked ? '🔒' : missionIcons[node.mission.id] || '📝'}
                                    </span>

                                    {/* Completion badge */}
                                    {isCompleted && (
                                        <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-1.5 shadow-lg border-2 border-[#0d1117]">
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3].map((star) => (
                                                    <span
                                                        key={star}
                                                        className={`text-[10px] ${
                                                            star <= (progress?.score || 0)
                                                                ? 'text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]'
                                                                : 'text-yellow-900'
                                                        }`}
                                                    >
                                                        ⭐
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Mission number badge */}
                                <div
                                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                                    style={{
                                        background: `linear-gradient(135deg, ${info?.color}40, ${info?.color}20)`,
                                        color: info?.color,
                                        border: `1px solid ${info?.color}60`,
                                    }}
                                >
                                    {node.mission.id.split('-').pop()}
                                </div>

                                {/* Hover label */}
                                <AnimatePresence>
                                    {isHovered && (
                                        <motion.div
                                            className="absolute left-1/2 transform -translate-x-1/2 w-72 pointer-events-none"
                                            style={{
                                                [node.y > 60 ? 'bottom' : 'top']: '100%',
                                                [node.y > 60 ? 'marginBottom' : 'marginTop']: '1rem',
                                            }}
                                            initial={{ opacity: 0, y: node.y > 60 ? 10 : -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: node.y > 60 ? 10 : -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="bg-gradient-to-br from-[#161b22] to-[#0d1117] border-2 rounded-xl p-4 shadow-2xl"
                                                style={{ borderColor: info?.color }}
                                            >
                                                <h4 className="font-bold text-[#c9d1d9] mb-2 text-sm">
                                                    {node.mission.title}
                                                </h4>
                                                <p className="text-xs text-[#8b949e] mb-3 line-clamp-2">
                                                    {node.mission.briefing.situation}
                                                </p>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span
                                                        className="font-medium"
                                                        style={{ color: info?.color }}
                                                    >
                                                        {isCompleted ? '✓ Пройдено' : 'Нажми для старта →'}
                                                    </span>
                                                    {isCompleted && progress && (
                                                        <span className="text-yellow-400 font-bold">
                                                            {progress.score}/3 ⭐
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Progress panel - вынесена за пределы карты */}
            <motion.div
                className="bg-gradient-to-br from-[#161b22]/90 to-[#0d1117]/90 backdrop-blur-sm border rounded-xl p-5 shadow-xl"
                style={{ borderColor: `${info?.color}40` }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[#c9d1d9]">
                            Прогресс модуля
                        </h3>
                        <span className="text-xs text-[#8b949e]">
                            {moduleProgress.completed} / {moduleProgress.total} миссий
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-2 bg-[#21262d] rounded-full overflow-hidden">
                        <motion.div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{
                                background: `linear-gradient(90deg, ${info?.color}, ${info?.color}80)`,
                                boxShadow: `0 0 10px ${info?.color}`,
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                        />
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-400">⭐</span>
                            <span className="text-[#8b949e]">
                                {moduleProgress.stars} звёзд
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: info?.color }}
                            />
                            <span className="text-[#8b949e]">
                                {percentage.toFixed(0)}% завершено
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
        );
    };

    const renderModuleCard = (moduleNum: number) => {
        const missions = modules[moduleNum] || [];
        const info = moduleInfo[moduleNum as keyof typeof moduleInfo];
        if (!info) return null;

        return (
            <motion.div
                key={moduleNum}
                className="mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Module header */}
                <div className="relative mb-8 p-8 rounded-2xl border overflow-hidden"
                    style={{
                        background: `linear-gradient(135deg, ${info.color}10, transparent)`,
                        borderColor: `${info.color}40`,
                    }}
                >
                    <div className="relative z-10 flex items-center gap-6">
                        <motion.div
                            className="text-7xl"
                            animate={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                            {info.icon}
                        </motion.div>
                        <div className="flex-1">
                            <h2 className="text-4xl font-bold text-[#c9d1d9] mb-2">
                                Модуль {moduleNum}: {info.name}
                            </h2>
                            <p className="text-[#8b949e] text-lg">
                                {missions.length} миссий • Погрузись в мир {info.name.toLowerCase()}
                            </p>
                        </div>
                    </div>

                    {/* Decorative gradient */}
                    <div
                        className="absolute top-0 right-0 w-1/3 h-full opacity-20 blur-3xl"
                        style={{ background: `radial-gradient(circle, ${info.color}, transparent)` }}
                    />
                </div>

                {/* Content */}
                {moduleNum === 5 ? (
                    renderSkillTree(module5Nodes, moduleNum)
                ) : (
                    <div className="grid gap-4">
                        {missions.map((mission, index) => (
                            <motion.button
                                key={mission.id}
                                onClick={() => handleMissionClick(mission)}
                                className="bg-gradient-to-br from-[#161b22] to-[#0d1117] border border-[#30363d] rounded-xl p-6 hover:border-[#58a6ff] transition-all text-left group overflow-hidden relative"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="relative z-10">
                                    <h3 className="text-xl font-semibold text-[#c9d1d9] group-hover:text-[#58a6ff] mb-2 transition-colors">
                                        {mission.title}
                                    </h3>
                                    <p className="text-sm text-[#8b949e]">{mission.briefing.situation}</p>
                                </div>

                                {/* Hover effect */}
                                <div
                                    className="absolute top-0 right-0 w-1/3 h-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-2xl"
                                    style={{ background: `radial-gradient(circle, ${info.color}, transparent)` }}
                                />
                            </motion.button>
                        ))}
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen w-full bg-[#0d1117] overflow-auto">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header */}
                <motion.div
                    className="flex items-center justify-between mb-10"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div>
                        <h1 className="text-5xl font-bold text-[#c9d1d9] mb-3 bg-gradient-to-r from-[#58a6ff] to-[#7ee787] bg-clip-text text-transparent">
                            🗺️ Карта миссий
                        </h1>
                        <p className="text-[#8b949e] text-lg">
                            Выбери своё приключение в мире науки
                        </p>
                    </div>
                    <motion.button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-gradient-to-r from-[#21262d] to-[#161b22] hover:from-[#30363d] hover:to-[#21262d] text-[#c9d1d9] rounded-xl transition-all border border-[#30363d] shadow-lg"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        ← На главную
                    </motion.button>
                </motion.div>

                {/* Module filter tabs */}
                <motion.div
                    className="flex gap-3 mb-10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <motion.button
                        onClick={() => navigate('/missions')}
                        className={`px-6 py-3 rounded-xl font-medium transition-all ${
                            !selectedModule
                                ? 'bg-gradient-to-r from-[#238636] to-[#2ea043] text-white shadow-lg'
                                : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] border border-[#30363d]'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Все модули
                    </motion.button>
                    {Object.keys(modules).map((mod) => {
                        const moduleNum = parseInt(mod);
                        const info = moduleInfo[moduleNum as keyof typeof moduleInfo];
                        const isSelected = selectedModule === mod;

                        return (
                            <motion.button
                                key={mod}
                                onClick={() => navigate(`/missions?module=${mod}`)}
                                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                                    isSelected
                                        ? 'text-white shadow-lg'
                                        : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] border border-[#30363d]'
                                }`}
                                style={{
                                    background: isSelected
                                        ? `linear-gradient(135deg, ${info?.color}, ${info?.color}cc)`
                                        : undefined,
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {info?.icon} {info?.name}
                            </motion.button>
                        );
                    })}
                </motion.div>

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
