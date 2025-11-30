/**
 * Progress Tracking Store
 * Tracks mission completion, scores, and user achievements
 * Data persists in localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MissionProgress {
    missionId: string;
    completed: boolean;
    score: number; // 0-3 stars
    attempts: number;
    bestTime?: number; // in seconds
    lastAttempt?: number; // timestamp
}

export interface UserProgress {
    missions: Record<string, MissionProgress>;
    totalStars: number;
    completedMissions: number;
    achievements: string[];
    startedAt: number;
    lastActivity: number;
}

interface ProgressStore {
    progress: UserProgress;

    // Actions
    markMissionComplete: (missionId: string, score: number) => void;
    incrementAttempts: (missionId: string) => void;
    addAchievement: (achievement: string) => void;
    getMissionProgress: (missionId: string) => MissionProgress | null;
    resetProgress: () => void;
    getModuleProgress: (moduleNum: number) => {
        total: number;
        completed: number;
        stars: number;
    };
}

const initialProgress: UserProgress = {
    missions: {},
    totalStars: 0,
    completedMissions: 0,
    achievements: [],
    startedAt: Date.now(),
    lastActivity: Date.now(),
};

export const useProgressStore = create<ProgressStore>()(
    persist(
        (set, get) => ({
            progress: initialProgress,

            markMissionComplete: (missionId: string, score: number) => {
                set((state) => {
                    const currentMission = state.progress.missions[missionId];
                    const isNewCompletion = !currentMission?.completed;
                    const scoreDiff = currentMission ? score - currentMission.score : score;

                    const updatedMissions = {
                        ...state.progress.missions,
                        [missionId]: {
                            missionId,
                            completed: true,
                            score: Math.max(currentMission?.score || 0, score),
                            attempts: (currentMission?.attempts || 0) + 1,
                            lastAttempt: Date.now(),
                            bestTime: currentMission?.bestTime,
                        },
                    };

                    return {
                        progress: {
                            ...state.progress,
                            missions: updatedMissions,
                            completedMissions: state.progress.completedMissions + (isNewCompletion ? 1 : 0),
                            totalStars: state.progress.totalStars + Math.max(0, scoreDiff),
                            lastActivity: Date.now(),
                        },
                    };
                });

                // Check for achievements
                const progress = get().progress;
                const achievements = get().progress.achievements;

                // First mission achievement
                if (progress.completedMissions === 1 && !achievements.includes('first_mission')) {
                    get().addAchievement('first_mission');
                }

                // Perfect score achievement
                if (score === 3 && !achievements.includes('perfect_first')) {
                    get().addAchievement('perfect_first');
                }

                // Module 5 master
                const module5Progress = get().getModuleProgress(5);
                if (module5Progress.completed === module5Progress.total && !achievements.includes('module5_complete')) {
                    get().addAchievement('module5_complete');
                }
            },

            incrementAttempts: (missionId: string) => {
                set((state) => {
                    const currentMission = state.progress.missions[missionId] || {
                        missionId,
                        completed: false,
                        score: 0,
                        attempts: 0,
                    };

                    return {
                        progress: {
                            ...state.progress,
                            missions: {
                                ...state.progress.missions,
                                [missionId]: {
                                    ...currentMission,
                                    attempts: currentMission.attempts + 1,
                                    lastAttempt: Date.now(),
                                },
                            },
                            lastActivity: Date.now(),
                        },
                    };
                });
            },

            addAchievement: (achievement: string) => {
                set((state) => {
                    if (state.progress.achievements.includes(achievement)) {
                        return state;
                    }

                    return {
                        progress: {
                            ...state.progress,
                            achievements: [...state.progress.achievements, achievement],
                        },
                    };
                });
            },

            getMissionProgress: (missionId: string) => {
                return get().progress.missions[missionId] || null;
            },

            resetProgress: () => {
                set({ progress: { ...initialProgress, startedAt: Date.now() } });
            },

            getModuleProgress: (moduleNum: number) => {
                const missions = get().progress.missions;
                const moduleMissions = Object.values(missions).filter((m) =>
                    m.missionId.startsWith(`${moduleNum}-`)
                );

                const completed = moduleMissions.filter((m) => m.completed).length;
                const stars = moduleMissions.reduce((sum, m) => sum + m.score, 0);

                // Calculate total missions in module (hardcoded for now)
                const totalByModule: Record<number, number> = {
                    1: 1,
                    5: 6,
                };

                return {
                    total: totalByModule[moduleNum] || 0,
                    completed,
                    stars,
                };
            },
        }),
        {
            name: 'physicslab-progress', // localStorage key
        }
    )
);
