import { motion } from 'framer-motion';
import { fadeIn, scaleIn } from '../../lib/animations';

interface EmptyStateProps {
    title?: string;
    message: string;
    icon?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    variant?: 'default' | 'missions' | 'progress' | 'search';
}

export default function EmptyState({
    title,
    message,
    icon,
    action,
    variant = 'default',
}: EmptyStateProps) {
    const variants = {
        default: {
            iconBg: 'bg-[var(--border-primary)]',
            iconColor: 'text-[var(--text-secondary)]',
            borderColor: 'border-[var(--border-primary)]',
            defaultIcon: '📭',
        },
        missions: {
            iconBg: 'bg-blue-500/10',
            iconColor: 'text-blue-400',
            borderColor: 'border-blue-500/20',
            defaultIcon: '🎯',
        },
        progress: {
            iconBg: 'bg-purple-500/10',
            iconColor: 'text-purple-400',
            borderColor: 'border-purple-500/20',
            defaultIcon: '📊',
        },
        search: {
            iconBg: 'bg-gray-500/10',
            iconColor: 'text-gray-400',
            borderColor: 'border-gray-500/20',
            defaultIcon: '🔍',
        },
    };

    const style = variants[variant];
    const displayIcon = icon || style.defaultIcon;

    return (
        <motion.div
            className={`flex flex-col items-center justify-center p-12 rounded-lg border ${style.borderColor} bg-[var(--bg-secondary)]`}
            {...fadeIn}
        >
            <motion.div
                className={`w-20 h-20 rounded-full ${style.iconBg} flex items-center justify-center mb-6`}
                {...scaleIn}
            >
                <span className="text-5xl">{displayIcon}</span>
            </motion.div>

            {title && (
                <h3 className={`text-xl font-semibold mb-3 ${style.iconColor}`}>
                    {title}
                </h3>
            )}

            <p className="text-[var(--text-secondary)] text-center max-w-md mb-8">
                {message}
            </p>

            {action && (
                <motion.button
                    onClick={action.onClick}
                    className="px-6 py-3 rounded-lg bg-[var(--accent-blue)] text-white font-medium hover:opacity-90 transition-opacity"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {action.label}
                </motion.button>
            )}
        </motion.div>
    );
}

// Специализированные empty states
export function NoMissionsState({ onBrowse }: { onBrowse?: () => void }) {
    return (
        <EmptyState
            title="Нет доступных миссий"
            message="В этом модуле пока нет миссий. Попробуйте другой модуль или вернитесь позже."
            icon="🎯"
            variant="missions"
            action={
                onBrowse
                    ? {
                          label: 'Обзор модулей',
                          onClick: onBrowse,
                      }
                    : undefined
            }
        />
    );
}

export function NoProgressState({ onStart }: { onStart?: () => void }) {
    return (
        <EmptyState
            title="Начните свой путь"
            message="У вас пока нет прогресса. Начните выполнять миссии, чтобы отслеживать свои достижения!"
            icon="🚀"
            variant="progress"
            action={
                onStart
                    ? {
                          label: 'Начать обучение',
                          onClick: onStart,
                      }
                    : undefined
            }
        />
    );
}

export function NoSearchResultsState({ query, onClear }: { query?: string; onClear?: () => void }) {
    return (
        <EmptyState
            title="Ничего не найдено"
            message={
                query
                    ? `Не найдено результатов для "${query}". Попробуйте изменить поисковый запрос.`
                    : 'Не найдено результатов. Попробуйте изменить фильтры или поисковый запрос.'
            }
            icon="🔍"
            variant="search"
            action={
                onClear
                    ? {
                          label: 'Очистить поиск',
                          onClick: onClear,
                      }
                    : undefined
            }
        />
    );
}

export function NoAchievementsState() {
    return (
        <EmptyState
            title="Пока нет достижений"
            message="Выполняйте миссии, решайте задачи и зарабатывайте достижения! Каждый шаг приближает вас к новым наградам."
            icon="🏆"
            variant="progress"
        />
    );
}

export function CompletedAllState() {
    return (
        <EmptyState
            title="Все миссии завершены! 🎉"
            message="Поздравляем! Вы завершили все доступные миссии в этом модуле. Следите за обновлениями для новых челленджей."
            icon="✨"
            variant="missions"
        />
    );
}
