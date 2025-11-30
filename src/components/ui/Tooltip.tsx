import { useEffect, useState, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { scaleIn } from '../../lib/animations';

interface TooltipProps {
    content: ReactNode;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    disabled?: boolean;
}

export default function Tooltip({
    content,
    children,
    position = 'top',
    delay = 500,
    disabled = false
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [actualPosition, setActualPosition] = useState(position);
    const timeoutRef = useRef<number | undefined>(undefined);
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const showTooltip = () => {
        if (disabled) return;
        timeoutRef.current = window.setTimeout(() => {
            setIsVisible(true);
            adjustPosition();
        }, delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    const adjustPosition = () => {
        if (!triggerRef.current || !tooltipRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newPosition = position;

        // Check if tooltip goes off-screen and adjust
        if (position === 'top' && triggerRect.top - tooltipRect.height < 10) {
            newPosition = 'bottom';
        } else if (position === 'bottom' && triggerRect.bottom + tooltipRect.height > viewportHeight - 10) {
            newPosition = 'top';
        } else if (position === 'left' && triggerRect.left - tooltipRect.width < 10) {
            newPosition = 'right';
        } else if (position === 'right' && triggerRect.right + tooltipRect.width > viewportWidth - 10) {
            newPosition = 'left';
        }

        setActualPosition(newPosition);
    };

    const getPositionStyles = () => {
        const offset = 8;
        switch (actualPosition) {
            case 'top':
                return {
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: `${offset}px`,
                };
            case 'bottom':
                return {
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: `${offset}px`,
                };
            case 'left':
                return {
                    right: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    marginRight: `${offset}px`,
                };
            case 'right':
                return {
                    left: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    marginLeft: `${offset}px`,
                };
        }
    };

    const getArrowStyles = () => {
        const arrowSize = 6;
        const baseStyles = {
            position: 'absolute' as const,
            width: 0,
            height: 0,
            borderStyle: 'solid',
        };

        switch (actualPosition) {
            case 'top':
                return {
                    ...baseStyles,
                    bottom: -arrowSize,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
                    borderColor: '#30363d transparent transparent transparent',
                };
            case 'bottom':
                return {
                    ...baseStyles,
                    top: -arrowSize,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
                    borderColor: 'transparent transparent #30363d transparent',
                };
            case 'left':
                return {
                    ...baseStyles,
                    right: -arrowSize,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
                    borderColor: 'transparent transparent transparent #30363d',
                };
            case 'right':
                return {
                    ...baseStyles,
                    left: -arrowSize,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
                    borderColor: 'transparent #30363d transparent transparent',
                };
        }
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            ref={triggerRef}
            className="relative inline-block"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
            tabIndex={0}
        >
            {children}

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        ref={tooltipRef}
                        className="absolute z-[9999] pointer-events-none"
                        style={getPositionStyles()}
                        {...scaleIn}
                        transition={{ duration: 0.15 }}
                    >
                        <div className="bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 shadow-xl max-w-xs">
                            <div className="text-sm text-[#c9d1d9] whitespace-nowrap">
                                {content}
                            </div>
                            <div style={getArrowStyles()} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
