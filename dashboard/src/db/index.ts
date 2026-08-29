import Dexie, { type Table } from 'dexie';
import type { TeacherConfig, MatrixSkill, Lesson, SyncLog } from '../types';

export class GemulDatabase extends Dexie {
  config!: Table<TeacherConfig>;
  matrix!: Table<MatrixSkill>;
  lessons!: Table<Lesson>;
  syncLog!: Table<SyncLog>;

  constructor() {
    super('GemulProfessorDB');
    this.version(1).stores({
      config: '++id',
      matrix: '++id, discipline, bimestre, thematicUnit',
      lessons: '++id, discipline, lessonNumber, month, year, status, [discipline+month+year]',
      syncLog: '++id, lessonId, injectedAt'
    });
  }
}

export const db = new GemulDatabase();

// Helper: get active teacher config
export async function getConfig(): Promise<TeacherConfig | undefined> {
  return await db.config.toCollection().last();
}

// Helper: save config (upsert)
export async function saveConfig(config: Omit<TeacherConfig, 'id' | 'createdAt'>): Promise<void> {
  const existing = await getConfig();
  if (existing?.id) {
    await db.config.update(existing.id, { ...config });
  } else {
    await db.config.add({ ...config, createdAt: new Date() });
  }
}

// Helper: get all matrix skills for a discipline
export async function getMatrixByDiscipline(discipline: string): Promise<MatrixSkill[]> {
  return await db.matrix.where('discipline').equals(discipline).toArray();
}

// Helper: get lessons for a month
export async function getLessonsForMonth(month: number, year: number): Promise<Lesson[]> {
  return await db.lessons
    .where('[discipline+month+year]')
    .between([Dexie.minKey, month, year], [Dexie.maxKey, month, year])
    .toArray();
}

// Helper: upsert a lesson
export async function upsertLesson(lesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }): Promise<number> {
  const now = new Date();
  if (lesson.id) {
    await db.lessons.update(lesson.id, { ...lesson, updatedAt: now });
    return lesson.id;
  } else {
    return await db.lessons.add({ ...lesson, createdAt: now, updatedAt: now });
  }
}

// Helper: log sync
export async function logSync(lessonId: number, discipline: string, lessonNumber: number, success: boolean, error?: string): Promise<void> {
  await db.syncLog.add({
    lessonId,
    discipline: discipline as any,
    lessonNumber,
    injectedAt: new Date(),
    success,
    error
  });
}

// Helper: export all data as JSON
export async function exportAllData(): Promise<string> {
  const [config, matrix, lessons, syncLog] = await Promise.all([
    db.config.toArray(),
    db.matrix.toArray(),
    db.lessons.toArray(),
    db.syncLog.toArray()
  ]);
  return JSON.stringify({ config, matrix, lessons, syncLog, exportedAt: new Date() }, null, 2);
}

// Helper: import data from JSON
export async function importFromJSON(jsonStr: string): Promise<void> {
  const data = JSON.parse(jsonStr);
  if (data.lessons && Array.isArray(data.lessons)) {
    await db.lessons.clear();
    await db.lessons.bulkAdd(data.lessons.map((l: any) => ({
      ...l,
      createdAt: new Date(l.createdAt),
      updatedAt: new Date(l.updatedAt)
    })));
  }
  if (data.matrix && Array.isArray(data.matrix)) {
    await db.matrix.clear();
    await db.matrix.bulkAdd(data.matrix.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt) })));
  }
}
