import { motion } from 'framer-motion';
import { useProgressStore } from '../../store/useProgressStore';
import { scaleIn, staggerContainer } from '../../lib/animations';
import { useMemo } from 'react';

interface UserStatsProps {
    compact?: boolean;
}

export default function UserStats({ compact = false }: UserStatsProps) {
    const progress = useProgressStore((state) => state.progress);

    // Calculate statistics
    const stats = useMemo(() => {
        const missions = Object.values(progress.missions);
        const totalMissions = missions.filter(m => m.completed).length;
        const totalStars = missions.reduce((sum, m) => sum + m.score, 0);
        const maxStars = totalMissions * 3;
        const perfectCount = missions.filter(m => m.score === 3).length;
        const averageScore = totalMissions > 0 ? (totalStars / totalMissions).toFixed(1) : '0';

        return {
            totalMissions,
            totalStars,
            maxStars,
            perfectCount,
            averageScore,
        };
    }, [progress.missions]);

    if (compact) {
        return (
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                    <span className="text-yellow-400">⭐</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {stats.totalStars}
                    </span>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {stats.totalMissions} миссий
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="p-6 rounded-lg border"
            style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
            }}
            {...staggerContainer}
        >
            <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                📊 Статистика
            </h3>

            <div className="grid grid-cols-2 gap-4">
                {/* Missions Completed */}
                <motion.div
                    className="p-4 rounded-lg"
                    style={{
                        backgroundColor: 'var(--bg-tertiary)',
                    }}
                    {...scaleIn}
                    transition={{ delay: 0.1 }}
                >
                    <div className="text-3xl font-bold" style={{ color: 'var(--accent-blue)' }}>
                        {stats.totalMissions}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Миссий пройдено
                    </div>
                </motion.div>

                {/* Total Stars */}
                <motion.div
                    className="p-4 rounded-lg"
                    style={{
                        backgroundColor: 'var(--bg-tertiary)',
                    }}
                    {...scaleIn}
                    transition={{ delay: 0.2 }}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold" style={{ color: 'var(--accent-orange)' }}>
                            {stats.totalStars}
                        </span>
                        <span className="text-2xl">⭐</span>
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        из {stats.maxStars} звёзд
                    </div>
                </motion.div>

                {/* Perfect Missions */}
                <motion.div
                    className="p-4 rounded-lg"
                    style={{
                        backgroundColor: 'var(--bg-tertiary)',
                    }}
                    {...scaleIn}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold" style={{ color: 'var(--accent-green)' }}>
                            {stats.perfectCount}
                        </span>
                        <span className="text-2xl">🏆</span>
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Идеальных решений
                    </div>
                </motion.div>

                {/* Average Score */}
                <motion.div
                    className="p-4 rounded-lg"
                    style={{
                        backgroundColor: 'var(--bg-tertiary)',
                    }}
                    {...scaleIn}
                    transition={{ delay: 0.4 }}
                >
                    <div className="text-3xl font-bold" style={{ color: 'var(--accent-purple)' }}>
                        {stats.averageScore}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Средний балл
                    </div>
                </motion.div>
            </div>

            {/* Progress Bar */}
            <motion.div
                className="mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    <span>Прогресс сбора звёзд</span>
                    <span>{stats.totalStars} / {stats.maxStars}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <motion.div
                        className="h-full rounded-full"
                        style={{
                            background: 'linear-gradient(90deg, var(--accent-orange), var(--accent-green))',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.maxStars > 0 ? (stats.totalStars / stats.maxStars) * 100 : 0}%` }}
                        transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
                    />
                </div>
            </motion.div>
        </motion.div>
    );
}
