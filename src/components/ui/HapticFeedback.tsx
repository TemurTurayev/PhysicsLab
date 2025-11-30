import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, type ReactNode } from 'react';

interface HapticFeedbackProps {
    children: ReactNode;
    type?: 'success' | 'error' | 'warning' | 'info';
    message?: string;
    duration?: number;
}

export default function HapticFeedback({
    children,
    type = 'success',
    message,
    duration = 2000,
}: HapticFeedbackProps) {
    const [show, setShow] = useState(false);

    const triggerFeedback = useCallback(() => {
        setShow(true);
        setTimeout(() => setShow(false), duration);
    }, [duration]);

    const colors = {
        success: '#7ee787',
        error: '#f85149',
        warning: '#ffa657',
        info: '#58a6ff',
    };

    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ',
    };

    return (
        <div className="relative inline-block" onClick={triggerFeedback}>
            {children}

            <AnimatePresence>
                {show && message && (
                    <motion.div
                        className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg whitespace-nowrap z-50"
                        style={{
                            backgroundColor: colors[type],
                            color: 'white',
                        }}
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{icons[type]}</span>
                            <span className="text-sm font-medium">{message}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Ripple effect component
export function RippleEffect({ children, color = 'rgba(255, 255, 255, 0.5)' }: { children: ReactNode; color?: string }) {
    const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();

        setRipples((prev) => [...prev, { x, y, id }]);

        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 600);
    };

    return (
        <div className="relative overflow-hidden" onClick={handleClick}>
            {children}

            {ripples.map((ripple) => (
                <motion.span
                    key={ripple.id}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        backgroundColor: color,
                    }}
                    initial={{ width: 0, height: 0, opacity: 0.5 }}
                    animate={{
                        width: 500,
                        height: 500,
                        opacity: 0,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            ))}
        </div>
    );
}

// Shake animation for errors
export function ShakeOnError({ children, trigger }: { children: ReactNode; trigger: boolean }) {
    return (
        <motion.div
            animate={
                trigger
                    ? {
                          x: [0, -10, 10, -10, 10, 0],
                          transition: { duration: 0.4 },
                      }
                    : {}
            }
        >
            {children}
        </motion.div>
    );
}

// Success pulse animation
export function SuccessPulse({ children, trigger }: { children: ReactNode; trigger: boolean }) {
    return (
        <motion.div
            animate={
                trigger
                    ? {
                          scale: [1, 1.1, 1],
                          transition: { duration: 0.3 },
                      }
                    : {}
            }
        >
            {children}
        </motion.div>
    );
}
