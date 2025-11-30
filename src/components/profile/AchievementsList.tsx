import { motion } from 'framer-motion';
import { useProgressStore } from '../../store/useProgressStore';
import { scaleIn, staggerContainer } from '../../lib/animations';
import { useMemo } from 'react';

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
    progress?: number;
    total?: number;
}

export default function AchievementsList() {
    const progress = useProgressStore((state) => state.progress);

    const achievements = useMemo((): Achievement[] => {
        const missions = Object.values(progress.missions);
        const totalMissions = missions.filter(m => m.completed).length;
        const totalStars = missions.reduce((sum, m) => sum + m.score, 0);
        const perfectCount = missions.filter(m => m.score === 3).length;

        return [
            {
                id: 'first-steps',
                name: 'Первые шаги',
                description: 'Пройди первую миссию',
                icon: '🚀',
                unlocked: totalMissions >= 1,
                progress: Math.min(totalMissions, 1),
                total: 1,
            },
            {
                id: 'star-collector',
                name: 'Коллекционер звёзд',
                description: 'Собери 10 звёзд',
                icon: '⭐',
                unlocked: totalStars >= 10,
                progress: Math.min(totalStars, 10),
                total: 10,
            },
            {
                id: 'perfectionist',
                name: 'Перфекционист',
                description: 'Получи 3 звезды в 3 миссиях',
                icon: '🏆',
                unlocked: perfectCount >= 3,
                progress: Math.min(perfectCount, 3),
                total: 3,
            },
            {
                id: 'dedicated',
                name: 'Целеустремлённый',
                description: 'Пройди 5 миссий',
                icon: '💪',
                unlocked: totalMissions >= 5,
                progress: Math.min(totalMissions, 5),
                total: 5,
            },
            {
                id: 'master',
                name: 'Мастер',
                description: 'Собери все звёзды (18/18)',
                icon: '👑',
                unlocked: totalStars >= 18,
                progress: Math.min(totalStars, 18),
                total: 18,
            },
            {
                id: 'math-genius',
                name: 'Математический гений',
                description: 'Пройди все миссии по алгебре',
                icon: '📊',
                unlocked: ['5-1-1', '5-1-2', '5-1-3', '5-1-4', '5-1-5', '5-1-6'].every(id => progress.missions[id]?.completed),
                progress: ['5-1-1', '5-1-2', '5-1-3', '5-1-4', '5-1-5', '5-1-6'].filter(id => progress.missions[id]?.completed).length,
                total: 6,
            },
        ];
    }, [progress.missions]);

    const unlockedCount = achievements.filter(a => a.unlocked).length;

    return (
        <motion.div {...staggerContainer}>
            <div className="mb-6">
                <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    🏆 Достижения
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Разблокировано: {unlockedCount} / {achievements.length}
                </p>
            </div>

            <div className="space-y-3">
                {achievements.map((achievement, index) => (
                    <motion.div
                        key={achievement.id}
                        className="p-4 rounded-lg border"
                        style={{
                            backgroundColor: achievement.unlocked ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                            borderColor: achievement.unlocked ? 'var(--accent-green)' : 'var(--border-primary)',
                            opacity: achievement.unlocked ? 1 : 0.6,
                        }}
                        {...scaleIn}
                        transition={{ delay: index * 0.05 }}
                    >
                        <div className="flex items-start gap-3">
                            <div className="text-3xl flex-shrink-0">
                                {achievement.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        {achievement.name}
                                    </h4>
                                    {achievement.unlocked && (
                                        <span className="text-xs px-2 py-0.5 rounded" style={{
                                            backgroundColor: 'var(--success-green)',
                                            color: '#ffffff'
                                        }}>
                                            ✓
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                    {achievement.description}
                                </p>

                                {/* Progress bar for locked achievements */}
                                {!achievement.unlocked && achievement.progress !== undefined && achievement.total !== undefined && (
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                                            <span>Прогресс</span>
                                            <span>{achievement.progress} / {achievement.total}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: 'var(--accent-blue)' }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
                                                transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
