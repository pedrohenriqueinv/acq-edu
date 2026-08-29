import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Lesson, TeacherConfig } from '../types';

const MONTH_NAMES = [
  '', 'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function generatePDF(lessons: Lesson[], config: TeacherConfig, month: number, year: number): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const disciplineGroups = groupByDiscipline(lessons);

  let isFirstPage = true;

  for (const [discipline, disciplineLessons] of Object.entries(disciplineGroups)) {
    if (!isFirstPage) doc.addPage();
    isFirstPage = false;

    // Header
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PLANEJAMENTO DE AULAS — GEMUL ANAPOLIS', 105, 12, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Professora: ${config.teacherName}`, 15, 22);
    doc.text(`Escola: ${config.schoolName}`, 105, 22, { align: 'center' });
    doc.text(`${MONTH_NAMES[month]}/${year}`, 195, 22, { align: 'right' });
    doc.text(`Turma: ${config.grade} ${config.classGroup} | Turno: ${config.shift}`, 15, 29);

    // Discipline title
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(discipline.toUpperCase(), 15, 42);

    // Table
    autoTable(doc, {
      startY: 46,
      head: [['Aula', 'Data', 'Bimestre', 'Habilidades', 'Conteudo', 'Metodologia', 'Avaliacao']],
      body: disciplineLessons.map(l => [
        String(l.lessonNumber),
        l.lessonDate,
        l.bimestre,
        l.skills.substring(0, 100) + (l.skills.length > 100 ? '...' : ''),
        l.knowledgeObjects.substring(0, 80) + (l.knowledgeObjects.length > 80 ? '...' : ''),
        l.methodology.substring(0, 150) + (l.methodology.length > 150 ? '...' : ''),
        l.evaluation.substring(0, 80) + (l.evaluation.length > 80 ? '...' : ''),
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 18 },
        2: { cellWidth: 20 },
        3: { cellWidth: 35 },
        4: { cellWidth: 30 },
        5: { cellWidth: 45 },
        6: { cellWidth: 30 },
      },
      alternateRowStyles: { fillColor: [239, 246, 255] },
    });
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `GEMUL Professor — Gerado automaticamente | Pagina ${i} de ${totalPages}`,
      105, 290, { align: 'center' }
    );
  }

  doc.save(`planejamento_${MONTH_NAMES[month]}_${year}.pdf`);
}

function groupByDiscipline(lessons: Lesson[]): Record<string, Lesson[]> {
  return lessons.reduce((acc, lesson) => {
    if (!acc[lesson.discipline]) acc[lesson.discipline] = [];
    acc[lesson.discipline].push(lesson);
    return acc;
  }, {} as Record<string, Lesson[]>);
}
