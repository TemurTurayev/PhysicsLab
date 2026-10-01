import { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeIn, slideUp, scaleIn, staggerContainer } from '../lib/animations';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ui/ThemeToggle';
import UserProfile from '../components/profile/UserProfile';
import UserStats from '../components/profile/UserStats';

export default function HomePage() {
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    return (
        <motion.div
            className="min-h-screen w-full bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] overflow-auto"
            {...fadeIn}
            transition={{ duration: 0.5 }}
        >
            {/* Top Bar with Theme Toggle and Profile */}
            <div className="fixed top-2 tablet:top-4 right-2 tablet:right-4 z-50 flex items-center gap-2 tablet:gap-3">
                {/* Compact Stats - Hidden on small tablets */}
                <motion.div
                    className="hidden tablet:block px-3 tablet:px-4 py-2 rounded-lg border backdrop-blur-sm"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-primary)',
                    }}
                    {...scaleIn}
                    whileHover={{ scale: 1.05 }}
                >
                    <UserStats compact />
                </motion.div>

                {/* Profile Button */}
                <motion.button
                    onClick={() => setIsProfileOpen(true)}
                    className="px-3 tablet:px-4 py-2 rounded-lg border backdrop-blur-sm"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)',
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <span className="text-lg tablet:text-xl">👤</span>
                </motion.button>

                <ThemeToggle />
            </div>

            {/* User Profile Panel */}
            <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

            {/* Hero Section */}
            <div className="container mx-auto px-4 py-16">
                {/* Header */}
                <motion.header
                    className="text-center mb-16"
                    {...slideUp}
                    transition={{ duration: 0.6, delay: 0.1 }}
                >
                    <div className="inline-block mb-6">
                        <div className="flex items-center gap-2 tablet:gap-4 text-4xl tablet:text-6xl">
                            <motion.span
                                animate={{ y: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                            >
                                🚀
                            </motion.span>
                            <h1 className="text-4xl tablet:text-5xl md:text-7xl font-bold bg-gradient-to-r from-[#58a6ff] via-[#7ee787] to-[#d2a8ff] bg-clip-text text-transparent">
                                PhysicsCodeLab
                            </h1>
                            <motion.span
                                animate={{ y: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut', delay: 0.3 }}
                            >
                                ⚛️
                            </motion.span>
                        </div>
                    </div>

                    <motion.p
                        className="text-lg tablet:text-xl md:text-2xl text-[#8b949e] max-w-3xl mx-auto mb-8 px-4"
                        {...slideUp}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        Интерактивная платформа для изучения <span className="text-[#58a6ff] font-semibold">Python</span>,
                        <span className="text-[#7ee787] font-semibold"> математики</span> и
                        <span className="text-[#d2a8ff] font-semibold"> физики</span>
                    </motion.p>

                    <motion.div
                        className="flex flex-wrap gap-4 justify-center mb-12"
                        {...staggerContainer}
                    >
                        {[
                            { value: '7', label: 'Миссий', color: '#58a6ff' },
                            { value: '2', label: 'Модуля', color: '#7ee787' },
                            { value: '∞', label: 'Возможностей', color: '#d2a8ff' },
                        ].map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                className="bg-[#161b22] border border-[#30363d] rounded-lg px-6 py-3"
                                {...scaleIn}
                                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                                whileHover={{ scale: 1.05, borderColor: stat.color }}
                            >
                                <div className="text-3xl font-bold" style={{ color: stat.color }}>
                                    {stat.value}
                                </div>
                                <div className="text-sm text-[#8b949e]">{stat.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <motion.div
                        {...scaleIn}
                        transition={{ duration: 0.6, delay: 0.6 }}
                    >
                        <Link
                            to="/missions"
                            className="inline-block px-8 py-4 bg-gradient-to-r from-[#238636] to-[#2ea043] hover:from-[#2ea043] hover:to-[#238636] text-white text-lg font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                            🎯 Начать обучение
                        </Link>
                    </motion.div>
                </motion.header>

                {/* World 1: interactive trebuchet lab */}
                <Link
                    to="/trebuchet"
                    className="group block max-w-5xl mx-auto mb-10 rounded-2xl overflow-hidden border-2 border-[#f0a640]/40 hover:border-[#f0a640] transition-colors"
                    style={{ background: 'linear-gradient(120deg, #2a1d0c 0%, #5a3a14 45%, #c98a3d 100%)' }}
                >
                    <div className="p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex-1">
                            <div className="text-xs tracking-[0.2em] uppercase text-[#f6dcae]/80 mb-2">Новое · Мир 1</div>
                            <h3 className="text-3xl md:text-4xl font-bold text-[#fff4e0] mb-3">Требушет</h3>
                            <p className="text-[#f6dcae]/90 max-w-xl">
                                Настоящая физика броска в 3D. Ломай, промахивайся, пиши свой движок на Python —
                                и смотри, что случится. Ошибки здесь безопасны и попадают в журнал.
                            </p>
                        </div>
                        <span className="self-start md:self-center px-6 py-3 rounded-xl bg-[#f0a640] text-[#1a1206] font-semibold group-hover:bg-[#ffb85a] transition-colors">
                            Войти в мастерскую →
                        </span>
                    </div>
                </Link>

                {/* Modules Grid */}
                <motion.div
                    className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto"
                    {...staggerContainer}
                >
                    {/* Module 1: Physics */}
                    <motion.div
                        {...scaleIn}
                        transition={{ duration: 0.5, delay: 0.7 }}
                        whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                    >
                        <Link to="/missions?module=1" className="group block">
                            <div className="bg-[#161b22] border-2 border-[#30363d] rounded-xl p-8 hover:border-[#58a6ff] transition-all hover:shadow-2xl">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="text-5xl">⚛️</div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-[#c9d1d9] group-hover:text-[#58a6ff] transition-colors">
                                            Модуль 1: Физика
                                        </h2>
                                        <p className="text-[#8b949e]">Механика и движение</p>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center gap-2 text-[#8b949e]">
                                        <span className="text-[#7ee787]">✓</span>
                                        <span>Ball physics simulation</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#8b949e]">
                                        <span className="text-[#7ee787]">✓</span>
                                        <span>Gravity & collisions</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#8b949e]">
                                        <span className="text-[#7ee787]">✓</span>
                                        <span>Platform interactions</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-[#8b949e]">
                                        <span className="text-[#58a6ff] font-semibold">1</span> / 1 миссий
                                    </div>
                                    <motion.div
                                        className="text-[#58a6ff]"
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                    >
                                        →
                                    </motion.div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Module 5: Algebra */}
                    <motion.div
                        {...scaleIn}
                        transition={{ duration: 0.5, delay: 0.8 }}
                        whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                    >
                        <Link to="/missions?module=5" className="group block">
                            <div className="bg-[#161b22] border-2 border-[#30363d] rounded-xl p-8 hover:border-[#7ee787] transition-all hover:shadow-2xl">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="text-5xl">📊</div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-[#c9d1d9] group-hover:text-[#7ee787] transition-colors">
                                            Модуль 5: Алгебра
                                        </h2>
                                        <p className="text-[#8b949e]">Функции и графики</p>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center gap-2 text-[#8b949e]">
                                        <span className="text-[#7ee787]">✓</span>
                                        <span>6 типов функций</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#8b949e]">
                                        <span className="text-[#7ee787]">✓</span>
                                        <span>Интерактивные слайдеры 🎛️</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#8b949e]">
                                        <span className="text-[#7ee787]">✓</span>
                                        <span>Реал-тайм визуализация</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-[#8b949e]">
                                        <span className="text-[#7ee787] font-semibold">6</span> / 6 миссий ✨
                                    </div>
                                    <motion.div
                                        className="text-[#7ee787]"
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                                    >
                                        →
                                    </motion.div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Features Section */}
                <motion.div
                    className="mt-20 max-w-5xl mx-auto"
                    {...fadeIn}
                    transition={{ duration: 0.6, delay: 1.0 }}
                >
                    <h3 className="text-3xl font-bold text-center text-[#c9d1d9] mb-12">
                        ✨ Особенности платформы
                    </h3>

                    <motion.div
                        className="grid md:grid-cols-3 gap-6"
                        {...staggerContainer}
                    >
                        {[
                            { icon: '🐍', title: 'Python в браузере', description: 'Pyodide — полноценный Python прямо в браузере, без установки', hoverColor: '#58a6ff' },
                            { icon: '🎨', title: 'Визуализация', description: 'Графики, анимации и Canvas для наглядного обучения', hoverColor: '#7ee787' },
                            { icon: '🎯', title: 'Интерактивность', description: 'Слайдеры, параметры и мгновенная обратная связь', hoverColor: '#d2a8ff' },
                        ].map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 text-center transition-all"
                                {...scaleIn}
                                transition={{ duration: 0.5, delay: 1.1 + index * 0.1 }}
                                whileHover={{
                                    scale: 1.05,
                                    borderColor: feature.hoverColor,
                                    transition: { duration: 0.2 }
                                }}
                            >
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h4 className="text-lg font-semibold text-[#c9d1d9] mb-2">{feature.title}</h4>
                                <p className="text-sm text-[#8b949e]">{feature.description}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>

                {/* Footer */}
                <motion.footer
                    className="mt-20 text-center text-[#6e7681]"
                    {...fadeIn}
                    transition={{ duration: 0.6, delay: 1.4 }}
                >
                    <p className="mb-2">Made with ❤️ for learners</p>
                    <p className="text-sm">Inspired by Alan Becker's "Animation vs Math"</p>
                </motion.footer>
            </div>

            {/* Background decorations */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <motion.div
                    className="absolute top-20 left-10 w-64 h-64 bg-[#58a6ff] rounded-full opacity-5 blur-3xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.05, 0.08, 0.05],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 4,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    className="absolute bottom-20 right-10 w-96 h-96 bg-[#7ee787] rounded-full opacity-5 blur-3xl"
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.05, 0.08, 0.05],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 5,
                        ease: 'easeInOut',
                        delay: 1,
                    }}
                />
                <motion.div
                    className="absolute top-1/2 left-1/2 w-80 h-80 bg-[#d2a8ff] rounded-full opacity-5 blur-3xl"
                    animate={{
                        scale: [1, 1.25, 1],
                        opacity: [0.05, 0.08, 0.05],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 4.5,
                        ease: 'easeInOut',
                        delay: 2,
                    }}
                />
            </div>
        </motion.div>
    );
}
