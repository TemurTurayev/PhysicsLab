import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { modalPanel, modalPanelTransition, scaleIn } from '../../lib/animations';
import UserStats from './UserStats';
import AchievementsList from './AchievementsList';
import ThemeToggle from '../ui/ThemeToggle';

interface UserProfileProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function UserProfile({ isOpen, onClose }: UserProfileProps) {
    const [activeTab, setActiveTab] = useState<'stats' | 'achievements'>('stats');

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        className="fixed inset-0 z-[9998]"
                        style={{ backgroundColor: 'var(--overlay-bg)' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Profile Panel */}
                    <motion.div
                        className="fixed right-0 top-0 bottom-0 w-full md:w-96 z-[9999] shadow-2xl overflow-y-auto"
                        style={{
                            backgroundColor: 'var(--bg-primary)',
                        }}
                        {...modalPanel}
                        transition={modalPanelTransition}
                    >
                        {/* Header */}
                        <div
                            className="sticky top-0 z-10 px-6 py-4 border-b"
                            style={{
                                backgroundColor: 'var(--bg-secondary)',
                                borderColor: 'var(--border-primary)',
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                    👤 Профиль
                                </h2>
                                <div className="flex items-center gap-3">
                                    <ThemeToggle />
                                    <motion.button
                                        onClick={onClose}
                                        className="text-2xl"
                                        style={{ color: 'var(--text-secondary)' }}
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        ✕
                                    </motion.button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => setActiveTab('stats')}
                                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                    style={{
                                        backgroundColor: activeTab === 'stats' ? 'var(--btn-primary-bg)' : 'var(--bg-tertiary)',
                                        color: activeTab === 'stats' ? '#ffffff' : 'var(--text-secondary)',
                                    }}
                                >
                                    📊 Статистика
                                </button>
                                <button
                                    onClick={() => setActiveTab('achievements')}
                                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                    style={{
                                        backgroundColor: activeTab === 'achievements' ? 'var(--btn-primary-bg)' : 'var(--bg-tertiary)',
                                        color: activeTab === 'achievements' ? '#ffffff' : 'var(--text-secondary)',
                                    }}
                                >
                                    🏆 Достижения
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <AnimatePresence mode="wait">
                                {activeTab === 'stats' ? (
                                    <motion.div
                                        key="stats"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <UserStats />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="achievements"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <AchievementsList />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
