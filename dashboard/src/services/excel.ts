import * as XLSX from 'xlsx';
import type { Lesson, TeacherConfig } from '../types';

const MONTH_NAMES = [
  '', 'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function generateExcel(lessons: Lesson[], config: TeacherConfig, month: number, year: number): void {
  const wb = XLSX.utils.book_new();

  // Group by discipline
  const disciplineGroups = groupByDiscipline(lessons);

  // Create a sheet per discipline
  for (const [discipline, disciplineLessons] of Object.entries(disciplineGroups)) {
    const header = [
      'N° Aula', 'Data', 'Dia Semana', 'Bimestre', 'Unidade Tematica',
      'Habilidades (Codigo + Descricao)', 'Objetos de Conhecimento / Conteudo',
      'Metodologia', 'Avaliacao', 'Status'
    ];

    const rows = disciplineLessons.map(l => [
      l.lessonNumber,
      l.lessonDate,
      l.lessonDate, // Could add day-of-week later
      l.bimestre,
      l.thematicUnit,
      l.skills,
      l.knowledgeObjects,
      l.methodology,
      l.evaluation,
      translateStatus(l.status)
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

    // Column widths
    ws['!cols'] = [
      { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 25 },
      { wch: 50 }, { wch: 40 }, { wch: 60 }, { wch: 40 }, { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, discipline.substring(0, 31));
  }

  // Summary sheet
  const summaryData = [
    ['PLANEJAMENTO MENSAL — GEMUL ANAPOLIS'],
    [`Professora: ${config.teacherName}`],
    [`Escola: ${config.schoolName}`],
    [`Mes/Ano: ${MONTH_NAMES[month]}/${year}`],
    [`Turma: ${config.grade} ${config.classGroup} | Turno: ${config.shift}`],
    [],
    ['Disciplina', 'Total Aulas', 'Geradas', 'Revisadas', 'Injetadas no GEMUL'],
    ...Object.entries(disciplineGroups).map(([disc, ls]) => [
      disc,
      ls.length,
      ls.filter(l => l.status === 'generated').length,
      ls.filter(l => l.status === 'reviewed').length,
      ls.filter(l => l.status === 'injected').length,
    ])
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

  XLSX.writeFile(wb, `planejamento_${MONTH_NAMES[month]}_${year}.xlsx`);
}

function groupByDiscipline(lessons: Lesson[]): Record<string, Lesson[]> {
  return lessons.reduce((acc, lesson) => {
    if (!acc[lesson.discipline]) acc[lesson.discipline] = [];
    acc[lesson.discipline].push(lesson);
    return acc;
  }, {} as Record<string, Lesson[]>);
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendente',
    generated: 'Gerado pela IA',
    reviewed: 'Revisado',
    injected: 'Enviado ao GEMUL',
  };
  return map[status] || status;
}
