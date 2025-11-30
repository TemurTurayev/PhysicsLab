/**
 * Framer Motion Performance Configuration
 * Optimizes animations for better performance
 */

import { type Transition } from 'framer-motion';

// Reduced motion preference
export const shouldReduceMotion = () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Optimized transition configs
export const fastTransition: Transition = {
    type: 'tween',
    duration: 0.2,
    ease: 'easeOut',
};

export const normalTransition: Transition = {
    type: 'tween',
    duration: 0.3,
    ease: [0.25, 0.1, 0.25, 1], // Ease-in-out
};

export const slowTransition: Transition = {
    type: 'tween',
    duration: 0.5,
    ease: [0.25, 0.1, 0.25, 1],
};

// Spring configurations
export const springFast = {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
};

export const springNormal = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 25,
};

export const springSlow = {
    type: 'spring' as const,
    stiffness: 200,
    damping: 20,
};

// Layout animation config
export const layoutTransition: Transition = {
    type: 'spring',
    stiffness: 500,
    damping: 30,
};

// Performance optimization: Use GPU-accelerated properties
export const gpuAcceleration = {
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0,
    transformPerspective: 1000,
};

// Hover animations
export const hoverScale = {
    scale: 1.05,
    transition: fastTransition,
};

export const hoverBrightness = {
    filter: 'brightness(1.1)',
    transition: fastTransition,
};

// Tap animations
export const tapScale = {
    scale: 0.95,
    transition: { duration: 0.1 },
};

// Will-change optimization
export const willChange = {
    willChange: 'transform, opacity',
};
