import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
    type?: 'text' | 'card' | 'avatar' | 'graph' | 'code';
    width?: string;
    height?: string;
    className?: string;
}

export default function LoadingSkeleton({
    type = 'text',
    width,
    height,
    className = '',
}: LoadingSkeletonProps) {
    const baseClasses = 'rounded animate-pulse';

    const skeletonStyles = {
        text: 'h-4 w-3/4 bg-[var(--border-primary)]',
        card: 'h-32 w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)]',
        avatar: 'h-12 w-12 rounded-full bg-[var(--border-primary)]',
        graph: 'h-64 w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)]',
        code: 'h-48 w-full bg-[#1e1e1e] border border-[var(--border-primary)]',
    };

    const style = {
        width: width || undefined,
        height: height || undefined,
    };

    return (
        <motion.div
            className={`${baseClasses} ${skeletonStyles[type]} ${className}`}
            style={style}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />
    );
}

// Skeleton для списка миссий
export function MissionListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                    <div className="flex items-start gap-4">
                        <LoadingSkeleton type="avatar" />
                        <div className="flex-1 space-y-3">
                            <LoadingSkeleton width="60%" height="20px" />
                            <LoadingSkeleton width="100%" height="16px" />
                            <LoadingSkeleton width="80%" height="16px" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Skeleton для теории
export function TheoryPanelSkeleton() {
    return (
        <div className="space-y-6 p-6">
            <div className="space-y-3">
                <LoadingSkeleton width="40%" height="24px" />
                <LoadingSkeleton width="100%" height="16px" />
                <LoadingSkeleton width="90%" height="16px" />
                <LoadingSkeleton width="95%" height="16px" />
            </div>
            <div className="space-y-3">
                <LoadingSkeleton width="50%" height="20px" />
                <LoadingSkeleton type="code" />
            </div>
        </div>
    );
}

// Skeleton для графика
export function GraphSkeleton() {
    return (
        <div className="w-full h-full flex items-center justify-center bg-[var(--bg-primary)]">
            <div className="text-center space-y-4">
                <LoadingSkeleton type="graph" className="mx-auto" />
                <div className="space-y-2">
                    <LoadingSkeleton width="200px" height="16px" className="mx-auto" />
                    <LoadingSkeleton width="150px" height="14px" className="mx-auto" />
                </div>
            </div>
        </div>
    );
}

// Skeleton для кода
export function CodeEditorSkeleton() {
    return (
        <div className="h-full bg-[#1e1e1e] p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
                <LoadingSkeleton
                    key={i}
                    width={`${Math.random() * 40 + 40}%`}
                    height="18px"
                    className="bg-[#2d2d2d]"
                />
            ))}
        </div>
    );
}
