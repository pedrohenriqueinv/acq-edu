export type LessonStatus = 'pending' | 'generated' | 'reviewed' | 'injected';

export type Discipline =
  | 'Arte'
  | 'Ciencias'
  | 'Educacao Fisica'
  | 'Ensino Religioso'
  | 'Geografia'
  | 'Historia'
  | 'Lingua Portuguesa'
  | 'Matematica'
  | 'Producao Textual';

export type Bimestre = '1 Bimestre' | '2 Bimestre' | '3 Bimestre' | '4 Bimestre';

export interface TeacherConfig {
  id?: number;
  teacherName: string;
  schoolName: string;
  year: number;
  shift: string;
  grade: string;
  classGroup: string;
  geminiApiKey: string;
  disciplines: Discipline[];
  createdAt: Date;
}

export interface MatrixSkill {
  id?: number;
  discipline: Discipline;
  bimestre: Bimestre;
  thematicUnit: string;
  skillCode: string;
  skillDescription: string;
  knowledgeObjects: string;
  createdAt: Date;
}

export interface Lesson {
  id?: number;
  discipline: Discipline;
  lessonNumber: number;
  lessonDate: string;
  month: number;
  year: number;
  grade: string;
  classGroup: string;
  bimestre: Bimestre;
  thematicUnit: string;
  skills: string;
  knowledgeObjects: string;
  methodology: string;
  evaluation: string;
  status: LessonStatus;
  groupIndex?: number;
  groupSize?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncLog {
  id?: number;
  lessonId: number;
  discipline: Discipline;
  lessonNumber: number;
  injectedAt: Date;
  success: boolean;
  error?: string;
}

export interface CalendarLesson {
  lessonNumber: number;
  date: string;
  dayOfWeek: string;
  isHighlighted?: boolean;
}

export interface CalendarDiscipline {
  discipline: Discipline;
  lessons: CalendarLesson[];
}