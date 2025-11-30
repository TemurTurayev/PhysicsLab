/**
 * Mission Validation Engine
 * Automatically checks if user's Python code meets mission requirements
 */

import type { Mission, MathCanvasState } from '../../types';

export interface ValidationResult {
    passed: boolean;
    score: number; // 0-3 stars
    feedback: string[];
    errors: string[];
}

export interface MissionCheck {
    type: 'function_expression' | 'function_values' | 'canvas_plot' | 'console_output';
    description: string;
    validator: (state: any) => boolean;
    feedback: {
        success: string;
        failure: string;
    };
}

export class MissionValidator {
    /**
     * Validate function expression
     */
    static validateFunctionExpression(
        expected: string,
        actual: string,
        _tolerance: number = 0.001
    ): boolean {
        // Normalize expressions (remove spaces, convert ** to ^, etc.)
        const normalize = (expr: string) =>
            expr
                .replace(/\s+/g, '')
                .replace(/\*\*/g, '^')
                .toLowerCase();

        return normalize(expected) === normalize(actual);
    }

    /**
     * Validate function values
     */
    static validateFunctionValues(
        _functionCode: string,
        _testCases: Array<{ x: number; expectedY: number }>,
        _tolerance: number = 0.01
    ): { passed: boolean; failedCases: Array<{ x: number; expected: number; got: number }> } {
        const failedCases: Array<{ x: number; expected: number; got: number }> = [];

        // This would need actual Python evaluation
        // For now, we'll return a placeholder
        // In real implementation, you'd use Pyodide to evaluate

        return {
            passed: failedCases.length === 0,
            failedCases,
        };
    }

    /**
     * Validate canvas plot
     */
    static validateCanvasPlot(
        mathCanvasState: MathCanvasState | null,
        requirements: {
            minFunctions?: number;
            maxFunctions?: number;
            requiredColors?: string[];
            requiredPoints?: number;
            requiredLines?: number;
        }
    ): { passed: boolean; issues: string[] } {
        const issues: string[] = [];

        if (!mathCanvasState) {
            issues.push('График не был отрисован');
            return { passed: false, issues };
        }

        // Check number of functions
        if (requirements.minFunctions !== undefined) {
            if (mathCanvasState.functions.length < requirements.minFunctions) {
                issues.push(
                    `Недостаточно функций: ${mathCanvasState.functions.length} из ${requirements.minFunctions}`
                );
            }
        }

        if (requirements.maxFunctions !== undefined) {
            if (mathCanvasState.functions.length > requirements.maxFunctions) {
                issues.push(
                    `Слишком много функций: ${mathCanvasState.functions.length}, максимум ${requirements.maxFunctions}`
                );
            }
        }

        // Check for required points
        if (requirements.requiredPoints !== undefined) {
            if (mathCanvasState.points.length < requirements.requiredPoints) {
                issues.push(
                    `Недостаточно точек: ${mathCanvasState.points.length} из ${requirements.requiredPoints}`
                );
            }
        }

        // Check for required lines
        if (requirements.requiredLines !== undefined) {
            if (mathCanvasState.lines.length < requirements.requiredLines) {
                issues.push(
                    `Недостаточно линий: ${mathCanvasState.lines.length} из ${requirements.requiredLines}`
                );
            }
        }

        return {
            passed: issues.length === 0,
            issues,
        };
    }

    /**
     * Main validation function for a mission
     */
    static async validateMission(
        mission: Mission,
        code: string,
        consoleOutput: string[],
        mathCanvasState: MathCanvasState | null
    ): Promise<ValidationResult> {
        const feedback: string[] = [];
        const errors: string[] = [];
        let passedChecks = 0;
        const totalChecks = mission.checks?.length || 0;

        if (!mission.checks || mission.checks.length === 0) {
            return {
                passed: true,
                score: 3,
                feedback: ['Эта миссия пока не имеет автоматических проверок'],
                errors: [],
            };
        }

        // Iterate through all checks
        for (const check of mission.checks) {
            try {
                switch (check.type) {
                    case 'function_expression':
                        // Check if code contains expected expression
                        if (check.expected_expression && code.includes(check.expected_expression)) {
                            passedChecks++;
                            feedback.push(`✓ ${check.description || 'Выражение функции корректно'}`);
                        } else {
                            errors.push(`✗ ${check.description || 'Выражение функции неверно'}`);
                        }
                        break;

                    case 'function_values':
                        // Check function values at specific points
                        if (check.test_values && Array.isArray(check.test_values)) {
                            const allCorrect = check.test_values.every((test: any) => {
                                // Check if console output contains expected value
                                const outputStr = consoleOutput.join(' ');
                                return outputStr.includes(test.expected_y.toString());
                            });

                            if (allCorrect) {
                                passedChecks++;
                                feedback.push(`✓ ${check.description || 'Значения функции корректны'}`);
                            } else {
                                errors.push(`✗ ${check.description || 'Значения функции неверны'}`);
                            }
                        } else {
                            // Skip this check if test_values is not properly defined
                            passedChecks++;
                            feedback.push(`✓ ${check.description || 'Проверка значений пропущена (нет тестовых данных)'}`);
                        }
                        break;

                    case 'canvas_plot':
                        // Validate canvas requirements
                        if (check.canvas_requirements) {
                            const validation = this.validateCanvasPlot(
                                mathCanvasState,
                                check.canvas_requirements
                            );

                            if (validation.passed) {
                                passedChecks++;
                                feedback.push(`✓ ${check.description || 'График отрисован корректно'}`);
                            } else {
                                errors.push(`✗ ${check.description || 'График неверен'}`);
                                errors.push(...validation.issues);
                            }
                        }
                        break;

                    case 'console_output':
                        // Check if console contains expected output
                        if (check.expected_output) {
                            const outputStr = consoleOutput.join('\n');
                            const hasOutput = check.expected_output.every((expected: string) =>
                                outputStr.includes(expected)
                            );

                            if (hasOutput) {
                                passedChecks++;
                                feedback.push(`✓ ${check.description || 'Вывод в консоль корректен'}`);
                            } else {
                                errors.push(`✗ ${check.description || 'Вывод в консоль неверен'}`);
                            }
                        }
                        break;
                }
            } catch (error) {
                errors.push(`Ошибка при проверке: ${error}`);
            }
        }

        // Calculate score (1-3 stars)
        const percentage = passedChecks / totalChecks;
        let score = 0;
        if (percentage >= 0.95) score = 3; // 95%+ = 3 stars
        else if (percentage >= 0.75) score = 2; // 75%+ = 2 stars
        else if (percentage >= 0.5) score = 1; // 50%+ = 1 star

        return {
            passed: passedChecks === totalChecks,
            score,
            feedback,
            errors,
        };
    }
}
