import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';
import { hoverScale, tapScale } from '../../lib/motionConfig';

interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: ReactNode;
    loading?: boolean;
}

export default function AnimatedButton({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    loading = false,
    className = '',
    disabled,
    ...props
}: AnimatedButtonProps) {
    const variants = {
        primary: 'bg-[var(--accent-blue)] hover:opacity-90 text-white',
        secondary: 'bg-[var(--btn-secondary-bg)] hover:bg-[var(--btn-secondary-hover)] text-[var(--text-primary)]',
        success: 'bg-[var(--success-green)] hover:opacity-90 text-white',
        danger: 'bg-[var(--error-red)] hover:opacity-90 text-white',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    return (
        <motion.button
            className={`
                inline-flex items-center justify-center gap-2 rounded-lg font-medium
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                ${variants[variant]} ${sizes[size]} ${className}
            `}
            whileHover={!disabled && !loading ? hoverScale : undefined}
            whileTap={!disabled && !loading ? tapScale : undefined}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <motion.div
                        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span>Загрузка...</span>
                </>
            ) : (
                <>
                    {icon && <span className="inline-flex">{icon}</span>}
                    {children}
                </>
            )}
        </motion.button>
    );
}

// Icon button variant
export function AnimatedIconButton({
    children,
    size = 'md',
    className = '',
    disabled,
    ...props
}: Omit<AnimatedButtonProps, 'variant' | 'icon'>) {
    const sizes = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
    };

    return (
        <motion.button
            className={`
                inline-flex items-center justify-center rounded-lg
                bg-[var(--btn-secondary-bg)] hover:bg-[var(--btn-secondary-hover)]
                text-[var(--text-primary)] transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${sizes[size]} ${className}
            `}
            whileHover={!disabled ? hoverScale : undefined}
            whileTap={!disabled ? tapScale : undefined}
            disabled={disabled}
            {...props}
        >
            {children}
        </motion.button>
    );
}
