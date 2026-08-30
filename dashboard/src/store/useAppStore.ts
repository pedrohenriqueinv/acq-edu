import { create } from 'zustand';
import type { TeacherConfig, MatrixSkill, Lesson, Discipline } from '../types';
import { db, getConfig, saveConfig } from '../db';

interface AppState {
  config: TeacherConfig | null;
  lessons: Lesson[];
  matrixSkills: MatrixSkill[];
  isLoading: boolean;
  error: string | null;
  selectedMonth: number;
  selectedYear: number;

  // Actions
  loadConfig: () => Promise<void>;
  updateConfig: (config: Omit<TeacherConfig, 'id' | 'createdAt'>) => Promise<void>;
  loadLessons: (month: number, year: number) => Promise<void>;
  loadMatrixSkills: () => Promise<void>;
  updateLesson: (lesson: Lesson) => Promise<void>;
  deleteLessonsByMonth: (month: number, year: number) => Promise<void>;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  config: null,
  lessons: [],
  matrixSkills: [],
  isLoading: false,
  error: null,
  selectedMonth: 8,
  selectedYear: 2026,

  loadConfig: async () => {
    const config = await getConfig();
    set({ config: config || null });
  },

  updateConfig: async (config) => {
    await saveConfig(config);
    set({ config: { ...config, createdAt: new Date() } });
  },

  loadLessons: async (month, year) => {
    set({ isLoading: true });
    try {
      const lessons = await db.lessons
        .filter(l => l.month === month && l.year === year).toArray();
      // Fallback: get all for the month
      const allLessons = await db.lessons.filter(l => l.month === month && l.year === year).toArray();
      set({ lessons: allLessons, isLoading: false });
    } catch {
      const allLessons = await db.lessons.filter(l => l.month === month && l.year === year).toArray();
      set({ lessons: allLessons, isLoading: false });
    }
  },

  loadMatrixSkills: async () => {
    const skills = await db.matrix.toArray();
    set({ matrixSkills: skills });
  },

  updateLesson: async (lesson) => {
    const now = new Date();
    if (lesson.id) {
      await db.lessons.update(lesson.id, { ...lesson, updatedAt: now });
    } else {
      const id = await db.lessons.add({ ...lesson, createdAt: now, updatedAt: now });
      lesson = { ...lesson, id };
    }
    set(state => ({
      lessons: state.lessons.map(l => l.id === lesson.id ? lesson : l)
    }));
  },

  deleteLessonsByMonth: async (month, year) => {
    await db.lessons.filter(l => l.month === month && l.year === year).delete();
    set({ lessons: [] });
  },

  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// Fix: import Dexie for minKey/maxKey

