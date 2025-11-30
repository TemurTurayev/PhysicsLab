import { useState, useEffect } from 'react';

interface TutorialStep {
    id: string;
    target: string; // CSS selector or element ID
    message: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TooltipTutorialOptions {
    steps: TutorialStep[];
    storageKey: string;
    autoStart?: boolean;
}

export function useTooltipTutorial({ steps, storageKey, autoStart = true }: TooltipTutorialOptions) {
    const [currentStep, setCurrentStep] = useState<number>(-1);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isActive, setIsActive] = useState(false);

    // Check if tutorial was already completed
    useEffect(() => {
        const completed = localStorage.getItem(storageKey);
        if (completed === 'true') {
            setIsCompleted(true);
            setIsActive(false);
        } else if (autoStart) {
            startTutorial();
        }
    }, [storageKey, autoStart]);

    const startTutorial = () => {
        if (isCompleted) return;
        setIsActive(true);
        setCurrentStep(0);
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            completeTutorial();
        }
    };

    const previousStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const skipTutorial = () => {
        completeTutorial();
    };

    const completeTutorial = () => {
        setIsActive(false);
        setCurrentStep(-1);
        setIsCompleted(true);
        localStorage.setItem(storageKey, 'true');
    };

    const resetTutorial = () => {
        localStorage.removeItem(storageKey);
        setIsCompleted(false);
        setCurrentStep(-1);
        setIsActive(false);
    };

    const getCurrentStep = (): TutorialStep | null => {
        if (currentStep >= 0 && currentStep < steps.length) {
            return steps[currentStep];
        }
        return null;
    };

    return {
        isActive,
        currentStep: getCurrentStep(),
        stepIndex: currentStep,
        totalSteps: steps.length,
        isCompleted,
        startTutorial,
        nextStep,
        previousStep,
        skipTutorial,
        resetTutorial,
    };
}
