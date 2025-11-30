import { motion } from 'framer-motion';
import { fadeIn, scaleIn } from '../../lib/animations';

interface ErrorStateProps {
    title?: string;
    message: string;
    icon?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    variant?: 'error' | 'warning' | 'info';
}

export default function ErrorState({
    title,
    message,
    icon,
    action,
    variant = 'error',
}: ErrorStateProps) {
    const variants = {
        error: {
            iconBg: 'bg-red-500/10',
            iconColor: 'text-red-500',
            borderColor: 'border-red-500/20',
            defaultIcon: '❌',
        },
        warning: {
            iconBg: 'bg-yellow-500/10',
            iconColor: 'text-yellow-500',
            borderColor: 'border-yellow-500/20',
            defaultIcon: '⚠️',
        },
        info: {
            iconBg: 'bg-blue-500/10',
            iconColor: 'text-blue-500',
            borderColor: 'border-blue-500/20',
            defaultIcon: 'ℹ️',
        },
    };

    const style = variants[variant];
    const displayIcon = icon || style.defaultIcon;

    return (
        <motion.div
            className={`flex flex-col items-center justify-center p-8 rounded-lg border ${style.borderColor} bg-[var(--bg-secondary)]`}
            {...fadeIn}
        >
            <motion.div
                className={`w-16 h-16 rounded-full ${style.iconBg} flex items-center justify-center mb-4`}
                {...scaleIn}
            >
                <span className="text-4xl">{displayIcon}</span>
            </motion.div>

            {title && (
                <h3 className={`text-lg font-semibold mb-2 ${style.iconColor}`}>
                    {title}
                </h3>
            )}

            <p className="text-[var(--text-secondary)] text-center max-w-md mb-6">
                {message}
            </p>

            {action && (
                <motion.button
                    onClick={action.onClick}
                    className="px-6 py-2 rounded-lg bg-[var(--accent-blue)] text-white font-medium hover:opacity-90 transition-opacity"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {action.label}
                </motion.button>
            )}
        </motion.div>
    );
}

// Специализированные error states
export function PythonErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
    return (
        <ErrorState
            title="Ошибка выполнения Python"
            message={error}
            icon="🐍"
            variant="error"
            action={
                onRetry
                    ? {
                          label: 'Попробовать снова',
                          onClick: onRetry,
                      }
                    : undefined
            }
        />
    );
}

export function NetworkErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <ErrorState
            title="Ошибка сети"
            message="Не удалось загрузить данные. Проверьте подключение к интернету и попробуйте снова."
            icon="🌐"
            variant="error"
            action={{
                label: 'Повторить попытку',
                onClick: onRetry,
            }}
        />
    );
}

export function NotFoundState({ message }: { message?: string }) {
    return (
        <ErrorState
            title="Не найдено"
            message={message || 'Запрашиваемый ресурс не найден.'}
            icon="🔍"
            variant="info"
        />
    );
}
