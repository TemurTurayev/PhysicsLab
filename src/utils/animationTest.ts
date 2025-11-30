/**
 * Animation Testing Utilities
 * Checks if animations work correctly across different browsers
 */

export const AnimationTester = {
    /**
     * Check if browser supports CSS animations
     */
    supportsAnimations(): boolean {
        const element = document.createElement('div');
        return (
            'animation' in element.style ||
            'webkitAnimation' in element.style ||
            'MozAnimation' in element.style
        );
    },

    /**
     * Check if browser supports CSS transitions
     */
    supportsTransitions(): boolean {
        const element = document.createElement('div');
        return (
            'transition' in element.style ||
            'webkitTransition' in element.style ||
            'MozTransition' in element.style
        );
    },

    /**
     * Check if browser supports transform
     */
    supportsTransform(): boolean {
        const element = document.createElement('div');
        return (
            'transform' in element.style ||
            'webkitTransform' in element.style ||
            'MozTransform' in element.style
        );
    },

    /**
     * Check if user prefers reduced motion
     */
    prefersReducedMotion(): boolean {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    /**
     * Get browser info
     */
    getBrowserInfo(): {
        name: string;
        version: string;
        supportsAnimations: boolean;
        supportsTransitions: boolean;
        supportsTransform: boolean;
        prefersReducedMotion: boolean;
    } {
        const userAgent = navigator.userAgent;
        let name = 'Unknown';
        let version = 'Unknown';

        if (userAgent.includes('Firefox')) {
            name = 'Firefox';
            version = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Chrome')) {
            name = 'Chrome';
            version = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Safari')) {
            name = 'Safari';
            version = userAgent.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
        } else if (userAgent.includes('Edge')) {
            name = 'Edge';
            version = userAgent.match(/Edge\/([0-9.]+)/)?.[1] || 'Unknown';
        }

        return {
            name,
            version,
            supportsAnimations: this.supportsAnimations(),
            supportsTransitions: this.supportsTransitions(),
            supportsTransform: this.supportsTransform(),
            prefersReducedMotion: this.prefersReducedMotion(),
        };
    },

    /**
     * Run all tests and log results
     */
    runTests(): void {
        const info = this.getBrowserInfo();
        console.group('🎨 Animation Support Test');
        console.log('Browser:', `${info.name} ${info.version}`);
        console.log('CSS Animations:', info.supportsAnimations ? '✅' : '❌');
        console.log('CSS Transitions:', info.supportsTransitions ? '✅' : '❌');
        console.log('CSS Transform:', info.supportsTransform ? '✅' : '❌');
        console.log('Prefers Reduced Motion:', info.prefersReducedMotion ? '⚠️ Yes' : '✅ No');
        console.groupEnd();

        if (!info.supportsAnimations || !info.supportsTransitions) {
            console.warn(
                '⚠️ Warning: This browser may not fully support animations. Consider providing fallbacks.'
            );
        }
    },
};

/**
 * Performance monitoring for animations
 */
export const AnimationPerformance = {
    /**
     * Measure animation performance
     */
    measureFrameRate(duration: number = 1000): Promise<number> {
        return new Promise((resolve) => {
            let frameCount = 0;
            const startTime = performance.now();
            const endTime = startTime + duration;

            const countFrame = () => {
                frameCount++;
                if (performance.now() < endTime) {
                    requestAnimationFrame(countFrame);
                } else {
                    const fps = (frameCount / duration) * 1000;
                    resolve(Math.round(fps));
                }
            };

            requestAnimationFrame(countFrame);
        });
    },

    /**
     * Check if device is low-end
     */
    async isLowEndDevice(): Promise<boolean> {
        const fps = await this.measureFrameRate(1000);
        const cores = navigator.hardwareConcurrency || 1;
        const memory = (navigator as any).deviceMemory || 4;

        return fps < 30 || cores < 4 || memory < 4;
    },

    /**
     * Run performance tests
     */
    async runTests(): Promise<void> {
        console.group('⚡ Animation Performance Test');

        const fps = await this.measureFrameRate(1000);
        console.log('Average FPS:', fps);

        const isLowEnd = await this.isLowEndDevice();
        console.log('Low-end device:', isLowEnd ? '⚠️ Yes' : '✅ No');

        if (fps < 30) {
            console.warn('⚠️ Warning: FPS is below 30. Consider reducing animation complexity.');
        }

        console.groupEnd();
    },
};
