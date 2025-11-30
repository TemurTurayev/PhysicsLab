/**
 * Theme Testing Utilities
 * Verifies that theme switching works correctly
 */

export const ThemeTester = {
    /**
     * Get current theme from CSS variables
     */
    getCurrentTheme(): 'dark' | 'light' | 'unknown' {
        const root = document.documentElement;
        const bgColor = getComputedStyle(root).getPropertyValue('--bg-primary').trim();

        // Dark theme typically has dark background
        if (bgColor === '#0d1117' || bgColor.startsWith('rgb(13, 17, 23)')) {
            return 'dark';
        } else if (bgColor === '#ffffff' || bgColor.startsWith('rgb(255, 255, 255)')) {
            return 'light';
        }

        return 'unknown';
    },

    /**
     * Check if all CSS variables are defined
     */
    checkCSSVariables(): { missing: string[]; total: number } {
        const requiredVars = [
            '--bg-primary',
            '--bg-secondary',
            '--bg-tertiary',
            '--text-primary',
            '--text-secondary',
            '--accent-blue',
            '--accent-green',
            '--border-primary',
        ];

        const root = document.documentElement;
        const missing: string[] = [];

        for (const varName of requiredVars) {
            const value = getComputedStyle(root).getPropertyValue(varName);
            if (!value || value.trim() === '') {
                missing.push(varName);
            }
        }

        return { missing, total: requiredVars.length };
    },

    /**
     * Test theme contrast ratios for accessibility
     */
    checkContrast(): { passes: boolean; ratio: number } {
        const root = document.documentElement;
        const bg = getComputedStyle(root).getPropertyValue('--bg-primary');
        const text = getComputedStyle(root).getPropertyValue('--text-primary');

        // Simple contrast check (not perfect but good enough)
        const bgLuminance = this.getLuminance(bg);
        const textLuminance = this.getLuminance(text);

        const ratio =
            bgLuminance > textLuminance
                ? (bgLuminance + 0.05) / (textLuminance + 0.05)
                : (textLuminance + 0.05) / (bgLuminance + 0.05);

        // WCAG AA standard requires 4.5:1 for normal text
        return { passes: ratio >= 4.5, ratio };
    },

    /**
     * Calculate relative luminance (simplified)
     */
    getLuminance(color: string): number {
        // This is a simplified version - just for testing
        const rgb = color.match(/\d+/g);
        if (!rgb) return 0.5;

        const [r, g, b] = rgb.map((val) => {
            const num = parseInt(val) / 255;
            return num <= 0.03928 ? num / 12.92 : Math.pow((num + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    },

    /**
     * Run all theme tests
     */
    runTests(): void {
        console.group('🎨 Theme System Test');

        const theme = this.getCurrentTheme();
        console.log('Current theme:', theme);

        const { missing, total } = this.checkCSSVariables();
        console.log(`CSS Variables: ${total - missing.length}/${total} defined`);
        if (missing.length > 0) {
            console.warn('Missing variables:', missing);
        } else {
            console.log('✅ All CSS variables defined');
        }

        const { passes, ratio } = this.checkContrast();
        console.log(`Contrast ratio: ${ratio.toFixed(2)}:1`);
        if (passes) {
            console.log('✅ Meets WCAG AA standards');
        } else {
            console.warn('⚠️ Contrast ratio below WCAG AA standards (4.5:1)');
        }

        console.groupEnd();
    },
};

/**
 * Theme persistence test
 */
export const ThemePersistenceTester = {
    /**
     * Test if theme persists in localStorage
     */
    testPersistence(): boolean {
        const stored = localStorage.getItem('theme');
        return stored === 'dark' || stored === 'light';
    },

    /**
     * Run persistence tests
     */
    runTests(): void {
        console.group('💾 Theme Persistence Test');

        const hasPersistence = this.testPersistence();
        if (hasPersistence) {
            const theme = localStorage.getItem('theme');
            console.log('✅ Theme persisted:', theme);
        } else {
            console.log('ℹ️ No theme preference stored (using system default)');
        }

        console.groupEnd();
    },
};
