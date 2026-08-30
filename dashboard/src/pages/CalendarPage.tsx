import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Zap, FileDown, RefreshCw, CheckCircle,
  Clock, Eye, AlertCircle, Loader2, Play, Pause,
  Square, Sparkles, Check, ChevronRight, Target, BookOpen, Lightbulb, CheckSquare, RotateCcw, Database,
  FileSpreadsheet, Code
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/useAppStore';
import { db } from '../db';
import { generateLesson } from '../services/ai';
import { generatePDF } from '../services/pdf';
import { generateExcel } from '../services/excel';
import { normalizeDiscipline, normalizeBimestre } from '../services/normalizer';
import { BNCC_1ANO } from '../data/bncc';
import type { Lesson, Discipline, Bimestre } from '../types';

const MONTH_NAMES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DISCIPLINE_LABELS: Record<string, string> = {
  'Arte': 'Arte',
  'Ciencias': 'Ciências',
  'Educacao Fisica': 'Educação Física',
  'Ensino Religioso': 'Ensino Religioso',
  'Geografia': 'Geografia',
  'Historia': 'História',
  'Lingua Portuguesa': 'Língua Portuguesa',
  'Matematica': 'Matemática',
  'Producao Textual': 'Produção Textual',
};

const DISCIPLINE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  'Arte': { bg: 'bg-pink-50/70', border: 'border-pink-200', text: 'text-pink-800', badge: 'bg-pink-100 text-pink-700' },
  'Ciencias': { bg: 'bg-emerald-50/70', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700' },
  'Educacao Fisica': { bg: 'bg-orange-50/70', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-700' },
  'Ensino Religioso': { bg: 'bg-purple-50/70', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-700' },
  'Geografia': { bg: 'bg-blue-50/70', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-700' },
  'Historia': { bg: 'bg-amber-50/70', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-700' },
  'Lingua Portuguesa': { bg: 'bg-red-50/70', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-700' },
  'Matematica': { bg: 'bg-indigo-50/70', border: 'border-indigo-200', text: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-700' },
  'Producao Textual': { bg: 'bg-teal-50/70', border: 'border-teal-200', text: 'text-teal-800', badge: 'bg-teal-100 text-teal-700' },
};

function isVacationMonth(month: number): boolean {
  return month === 1 || month === 7;
}

function getBimestreForMonth(month: number): Bimestre | null {
  if (month === 1 || month === 7) return null; // Férias
  if (month >= 2 && month <= 4) return '1 Bimestre';
  if (month >= 5 && month <= 6) return '2 Bimestre';
  if (month >= 8 && month <= 9) return '3 Bimestre';
  if (month >= 10 && month <= 12) return '4 Bimestre';
  return null;
}

function getStartingLessonNumber(discipline: string, month: number): number {
  const norm = normalizeDiscipline(discipline);
  
  const START_MAP: Record<number, Record<string, number>> = {
    // 1º Bimestre (Fev, Mar, Abr)
    2: { 'Arte': 1, 'Ciencias': 1, 'Educacao Fisica': 1, 'Ensino Religioso': 1, 'Geografia': 1, 'Historia': 1, 'Lingua Portuguesa': 1, 'Matematica': 1, 'Producao Textual': 1 },
    3: { 'Arte': 5, 'Ciencias': 13, 'Educacao Fisica': 5, 'Ensino Religioso': 5, 'Geografia': 13, 'Historia': 13, 'Lingua Portuguesa': 21, 'Matematica': 21, 'Producao Textual': 5 },
    4: { 'Arte': 9, 'Ciencias': 25, 'Educacao Fisica': 9, 'Ensino Religioso': 9, 'Geografia': 25, 'Historia': 25, 'Lingua Portuguesa': 41, 'Matematica': 41, 'Producao Textual': 9 },
    // 2º Bimestre (Mai, Jun)
    5: { 'Arte': 13, 'Ciencias': 37, 'Educacao Fisica': 13, 'Ensino Religioso': 13, 'Geografia': 37, 'Historia': 37, 'Lingua Portuguesa': 61, 'Matematica': 61, 'Producao Textual': 13 },
    6: { 'Arte': 17, 'Ciencias': 49, 'Educacao Fisica': 17, 'Ensino Religioso': 17, 'Geografia': 49, 'Historia': 49, 'Lingua Portuguesa': 81, 'Matematica': 81, 'Producao Textual': 17 },
    // 3º Bimestre (Ago, Set)
    8: { 'Arte': 21, 'Ciencias': 67, 'Educacao Fisica': 21, 'Ensino Religioso': 22, 'Geografia': 64, 'Historia': 64, 'Lingua Portuguesa': 106, 'Matematica': 106, 'Producao Textual': 22 },
    9: { 'Arte': 25, 'Ciencias': 79, 'Educacao Fisica': 25, 'Ensino Religioso': 26, 'Geografia': 76, 'Historia': 76, 'Lingua Portuguesa': 126, 'Matematica': 126, 'Producao Textual': 26 },
    // 4º Bimestre (Out, Nov, Dez)
    10: { 'Arte': 29, 'Ciencias': 91, 'Educacao Fisica': 29, 'Ensino Religioso': 30, 'Geografia': 88, 'Historia': 88, 'Lingua Portuguesa': 146, 'Matematica': 146, 'Producao Textual': 30 },
    11: { 'Arte': 33, 'Ciencias': 103, 'Educacao Fisica': 33, 'Ensino Religioso': 34, 'Geografia': 100, 'Historia': 100, 'Lingua Portuguesa': 166, 'Matematica': 166, 'Producao Textual': 34 },
    12: { 'Arte': 37, 'Ciencias': 115, 'Educacao Fisica': 37, 'Ensino Religioso': 38, 'Geografia': 112, 'Historia': 112, 'Lingua Portuguesa': 186, 'Matematica': 186, 'Producao Textual': 38 },
  };

  return START_MAP[month]?.[norm] || 1;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { config, selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useAppStore();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [matrixSkillsCount, setMatrixSkillsCount] = useState<number>(0);
  
  // Generation State (Modo B - Piloto Total)
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentGeneratingId, setCurrentGeneratingId] = useState<number | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, discipline: '', lessonNum: 0, statusText: '' });
  
  // Quick View Drawer for a lesson
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  const isVacation = isVacationMonth(selectedMonth);
  const currentBimestre = getBimestreForMonth(selectedMonth);

  const loadLessons = useCallback(async () => {
    const isVac = isVacationMonth(selectedMonth);
    const bim = getBimestreForMonth(selectedMonth);

    // Se for mês de férias, limpa qualquer resquício
    if (isVac || !bim) {
      await db.lessons.filter(l => l.month === selectedMonth && l.year === selectedYear).delete();
      setLessons([]);
      setMatrixSkillsCount(0);
      return;
    }

    const allMatrixSkills = await db.matrix.toArray();
    const skillsInDb = allMatrixSkills.filter(s => normalizeBimestre(s.bimestre) === bim);
    setMatrixSkillsCount(skillsInDb.length);

    // Se a Matriz Curricular deste bimestre específico NÃO foi enviada pelo professor,
    // não permite nenhuma aula fictícia salva no banco
    if (skillsInDb.length === 0) {
      await db.lessons.filter(l => l.month === selectedMonth && l.year === selectedYear).delete();
      setLessons([]);
      return;
    }

    const matrixByDisc = skillsInDb.reduce((acc, s) => {
      const norm = normalizeDiscipline(s.discipline);
      if (!acc[norm]) acc[norm] = [];
      acc[norm].push(s);
      return acc;
    }, {} as Record<string, typeof skillsInDb>);

    const all = await db.lessons.filter(l => l.month === selectedMonth && l.year === selectedYear).toArray();
    const repairedLessons: Lesson[] = [];

    for (const l of all) {
      const norm = normalizeDiscipline(l.discipline);
      const availableSkills = matrixByDisc[norm] || [];
      const mappedSkill = availableSkills.length > 0 ? availableSkills[l.lessonNumber % availableSkills.length] : null;

      const isInvalid = (val?: string) => !val || val === '...' || val.trim() === '' || val.length < 5;
      const needsRepair = isInvalid(l.skills) || isInvalid(l.knowledgeObjects) || isInvalid(l.methodology) || isInvalid(l.evaluation);

      if (needsRepair && mappedSkill) {
        const thematicUnit = (!isInvalid(l.thematicUnit)) ? l.thematicUnit : (mappedSkill.thematicUnit || 'Unidade Temática');
        const skills = (!isInvalid(l.skills)) ? l.skills : `${mappedSkill.skillCode} - ${mappedSkill.skillDescription}`;
        const knowledgeObjects = (!isInvalid(l.knowledgeObjects)) ? l.knowledgeObjects : mappedSkill.knowledgeObjects;
        const methodology = (!isInvalid(l.methodology)) ? l.methodology : `1. Acolhida e Sondagem (5 min): Roda de conversa inicial sobre ${thematicUnit}.\n2. Apresentação (10 min): Introdução lúdica e contextualizada de ${knowledgeObjects}.\n3. Desenvolvimento (20 min): Atividade prática orientada e no livro didático.\n4. Registro (10 min): Escrita espontânea e fixação no caderno individual.\n5. Fechamento (5 min): Síntese coletiva e avaliação formativa.`;
        const evaluation = (!isInvalid(l.evaluation)) ? l.evaluation : `Avaliação formativa e contínua observando a participação ativa, cooperação nas atividades e o registro individual no caderno sobre ${knowledgeObjects}.`;

        const repaired: Lesson = {
          ...l,
          thematicUnit,
          skills,
          knowledgeObjects,
          methodology,
          evaluation,
          status: 'generated',
        };

        if (l.id) {
          await db.lessons.update(l.id, repaired);
        }
        repairedLessons.push(repaired);
      } else {
        repairedLessons.push(l);
      }
    }

    setLessons(repairedLessons);
  }, [selectedMonth, selectedYear]);

  useEffect(() => { loadLessons(); }, [loadLessons]);

  const hasUploadedMatrixForMonth = matrixSkillsCount > 0;

  // Group lessons by discipline
  const byDiscipline = lessons.reduce((acc, l) => {
    const norm = normalizeDiscipline(l.discipline);
    if (!acc[norm]) acc[norm] = [];
    acc[norm].push(l);
    return acc;
  }, {} as Record<string, Lesson[]>);

  const totalLessons = lessons.length;
  const generatedCount = lessons.filter(l => l.status !== 'pending').length;
  const injectedCount = lessons.filter(l => l.status === 'injected').length;

  /**
   * MODO B: PILOTO TOTAL DE GERAÇÃO EM LOTE
   */
  const handleStartBatchGeneration = async (targetDiscipline?: Discipline) => {
    if (!config) return toast.error('Configure os dados da professora nas Configurações!');
    if (!config.geminiApiKey) return toast.error('Configure a chave de API do Gemini nas Configurações!');

    let targetLessons = lessons.filter(l => {
      const matchDisc = targetDiscipline ? normalizeDiscipline(l.discipline) === targetDiscipline : true;
      return matchDisc && (l.status === 'pending' || !l.methodology || l.methodology === '...' || l.methodology.length < 15);
    });

    if (targetLessons.length === 0) {
      targetLessons = lessons.filter(l => {
        return targetDiscipline ? normalizeDiscipline(l.discipline) === targetDiscipline : true;
      });
    }

    setIsGenerating(true);
    setIsPaused(false);
    isPausedRef.current = false;
    isCancelledRef.current = false;

    const total = targetLessons.length;
    let completed = 0;

    const sameDayGroups = new Map<string, Lesson[]>();
    for (const l of lessons) {
      const key = `${normalizeDiscipline(l.discipline)}|${l.lessonDate}`;
      if (!sameDayGroups.has(key)) sameDayGroups.set(key, []);
      sameDayGroups.get(key)!.push(l);
    }

    const allMatrixSkills = await db.matrix.toArray();

    for (const lesson of targetLessons) {
      if (isCancelledRef.current) break;

      while (isPausedRef.current) {
        await new Promise(r => setTimeout(r, 400));
        if (isCancelledRef.current) break;
      }
      if (isCancelledRef.current) break;

      const normDisc = normalizeDiscipline(lesson.discipline);
      const discLessons = byDiscipline[normDisc] || [lesson];
      const lessonIndexInMonth = discLessons.findIndex(l => l.lessonNumber === lesson.lessonNumber);
      const totalLessonsInMonth = discLessons.length;

      const groupKey = `${normDisc}|${lesson.lessonDate}`;
      const group = sameDayGroups.get(groupKey) || [lesson];
      const groupIndex = group.findIndex(l => l.lessonNumber === lesson.lessonNumber);
      const groupSize = group.length;

      setCurrentGeneratingId(lesson.id || null);
      setProgress({
        current: ++completed,
        total,
        discipline: DISCIPLINE_LABELS[normDisc] || normDisc,
        lessonNum: lesson.lessonNumber,
        statusText: `Cruzando Matriz enviada e escrevendo Metodologia da Aula ${lesson.lessonNumber}...`
      });

      try {
        const generated = await generateLesson(
          {
            discipline: normDisc as Discipline,
            lessonNumber: lesson.lessonNumber,
            lessonDate: lesson.lessonDate,
            month: lesson.month,
            year: lesson.year,
            grade: lesson.grade,
            classGroup: lesson.classGroup,
            bimestre: lesson.bimestre,
            thematicUnit: lesson.thematicUnit,
            matrixSkills: allMatrixSkills,
            groupIndex: Math.max(0, groupIndex),
            groupSize,
            teacherName: config.teacherName,
            schoolName: config.schoolName,
            lessonIndexInMonth,
            totalLessonsInMonth,
          },
          config.geminiApiKey
        );

        const updatedLesson: Lesson = {
          ...lesson,
          ...generated,
          status: 'generated',
          groupIndex,
          groupSize,
          updatedAt: new Date(),
        };

        if (lesson.id) {
          await db.lessons.update(lesson.id, updatedLesson);
        }

        setLessons(prev => prev.map(l => l.id === lesson.id ? updatedLesson : l));

      } catch (err: any) {
        console.error(`Erro na aula ${lesson.lessonNumber} (${normDisc}):`, err);
      }

      await new Promise(r => setTimeout(r, 450));
    }

    setIsGenerating(false);
    setCurrentGeneratingId(null);
    setProgress({ current: 0, total: 0, discipline: '', lessonNum: 0, statusText: '' });
    await loadLessons();
    toast.success('Geração concluída com sucesso!');
  };

  const handlePauseToggle = () => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
    toast(isPausedRef.current ? 'Geração pausada.' : 'Retomando geração...', { icon: isPausedRef.current ? '⏸️' : '▶️' });
  };

  const handleCancelGeneration = () => {
    isCancelledRef.current = true;
    setIsGenerating(false);
    setCurrentGeneratingId(null);
    toast('Geração interrompida. As aulas já geradas continuam salvas!', { icon: '🛑' });
  };

  const handleCreateMonthLessons = async () => {
    if (!config) return toast.error('Configure os dados da professora primeiro!');
    if (isVacationMonth(selectedMonth)) {
      return toast.error('Janeiro e Julho são meses de férias escolares no GEMUL. Não há aulas letivas.');
    }

    const bimestre = getBimestreForMonth(selectedMonth);
    if (!bimestre) return;

    const allMatrixSkills = await db.matrix.toArray();
    const skillsInDb = allMatrixSkills.filter(s => normalizeBimestre(s.bimestre) === bimestre);

    if (skillsInDb.length === 0) {
      toast.error(`A Matriz Curricular de ${MONTH_NAMES[selectedMonth]} (${bimestre}) ainda não foi enviada!`);
      setTimeout(() => navigate('/matriz'), 1200);
      return;
    }

    const matrixByDisc = skillsInDb.reduce((acc, s) => {
      const norm = normalizeDiscipline(s.discipline);
      if (!acc[norm]) acc[norm] = [];
      acc[norm].push(s);
      return acc;
    }, {} as Record<string, typeof skillsInDb>);

    // Gera a grade de aulas dinamicamente para o mês e ano selecionados
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const mondays: number[] = [];
    const tuesdays: number[] = [];
    const wednesdays: number[] = [];
    const thursdays: number[] = [];
    const fridays: number[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(selectedYear, selectedMonth - 1, d).getDay();
      if (dayOfWeek === 1) mondays.push(d);
      if (dayOfWeek === 2) tuesdays.push(d);
      if (dayOfWeek === 3) wednesdays.push(d);
      if (dayOfWeek === 4) thursdays.push(d);
      if (dayOfWeek === 5) fridays.push(d);
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const mStr = pad(selectedMonth);

    const startArte = getStartingLessonNumber('Arte', selectedMonth);
    const arteDates = (fridays.length >= 4 ? fridays.slice(0, 4) : fridays).map((d, i) => ({
      num: startArte + i,
      date: `${pad(d)}/${mStr}/${selectedYear}`,
      day: 'Sexta'
    }));

    const startCiencias = getStartingLessonNumber('Ciencias', selectedMonth);
    const cienciasDates: { num: number; date: string; day: string }[] = [];
    const wedList = wednesdays.length >= 4 ? wednesdays.slice(0, 4) : wednesdays;
    let cCount = 0;
    for (const w of wedList) {
      for (let k = 0; k < 3; k++) {
        if (cCount < 12) {
          cienciasDates.push({ num: startCiencias + cCount, date: `${pad(w)}/${mStr}/${selectedYear}`, day: 'Quarta' });
          cCount++;
        }
      }
    }

    const startEdF = getStartingLessonNumber('Educacao Fisica', selectedMonth);
    const edfDates = (fridays.length >= 4 ? fridays.slice(0, 4) : fridays).map((d, i) => ({
      num: startEdF + i,
      date: `${pad(d)}/${mStr}/${selectedYear}`,
      day: 'Sexta'
    }));

    const startER = getStartingLessonNumber('Ensino Religioso', selectedMonth);
    const erDates = (thursdays.length >= 4 ? thursdays.slice(0, 4) : thursdays).map((d, i) => ({
      num: startER + i,
      date: `${pad(d)}/${mStr}/${selectedYear}`,
      day: 'Quinta'
    }));

    const startGeo = getStartingLessonNumber('Geografia', selectedMonth);
    const geoDates: { num: number; date: string; day: string }[] = [];
    const tueList = tuesdays.length >= 4 ? tuesdays.slice(0, 4) : tuesdays;
    let gCount = 0;
    for (const t of tueList) {
      for (let k = 0; k < 3; k++) {
        if (gCount < 12) {
          geoDates.push({ num: startGeo + gCount, date: `${pad(t)}/${mStr}/${selectedYear}`, day: 'Terça' });
          gCount++;
        }
      }
    }

    const startHist = getStartingLessonNumber('Historia', selectedMonth);
    const histDates: { num: number; date: string; day: string }[] = [];
    const monList = mondays.length >= 4 ? mondays.slice(0, 4) : mondays;
    let hCount = 0;
    for (const m of monList) {
      for (let k = 0; k < 3; k++) {
        if (hCount < 12) {
          histDates.push({ num: startHist + hCount, date: `${pad(m)}/${mStr}/${selectedYear}`, day: 'Segunda' });
          hCount++;
        }
      }
    }

    const startLP = getStartingLessonNumber('Lingua Portuguesa', selectedMonth);
    const lpDates: { num: number; date: string; day: string }[] = [];
    let lpCount = 0;
    for (let w = 0; w < 4; w++) {
      const weekDays = [mondays[w], tuesdays[w], wednesdays[w], thursdays[w], fridays[w]].filter(Boolean);
      for (const d of weekDays) {
        if (lpCount < 20) {
          lpDates.push({ num: startLP + lpCount, date: `${pad(d)}/${mStr}/${selectedYear}`, day: 'Dia Útil' });
          lpCount++;
        }
      }
    }

    const startMat = getStartingLessonNumber('Matematica', selectedMonth);
    const matDates: { num: number; date: string; day: string }[] = [];
    let matCount = 0;
    for (let w = 0; w < 4; w++) {
      const weekDays = [mondays[w], tuesdays[w], wednesdays[w], thursdays[w], fridays[w]].filter(Boolean);
      for (const d of weekDays) {
        if (matCount < 20) {
          matDates.push({ num: startMat + matCount, date: `${pad(d)}/${mStr}/${selectedYear}`, day: 'Dia Útil' });
          matCount++;
        }
      }
    }

    const startProd = getStartingLessonNumber('Producao Textual', selectedMonth);
    const prodDates = (thursdays.length >= 4 ? thursdays.slice(0, 4) : thursdays).map((d, i) => ({
      num: startProd + i,
      date: `${pad(d)}/${mStr}/${selectedYear}`,
      day: 'Quinta'
    }));

    const schedule: { discipline: Discipline; lessons: { num: number; date: string; day: string }[] }[] = [
      { discipline: 'Arte', lessons: arteDates },
      { discipline: 'Ciencias', lessons: cienciasDates },
      { discipline: 'Educacao Fisica', lessons: edfDates },
      { discipline: 'Ensino Religioso', lessons: erDates },
      { discipline: 'Geografia', lessons: geoDates },
      { discipline: 'Historia', lessons: histDates },
      { discipline: 'Lingua Portuguesa', lessons: lpDates },
      { discipline: 'Matematica', lessons: matDates },
      { discipline: 'Producao Textual', lessons: prodDates },
    ];

    const sampleData: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    for (const { discipline, lessons: lessonList } of schedule) {
      const norm = normalizeDiscipline(discipline);
      const skillsToUse = matrixByDisc[norm] || [];

      lessonList.forEach((item, index) => {
        const matrixIndex = skillsToUse.length > 0 ? index % skillsToUse.length : 0;
        const mappedSkill = skillsToUse.length > 0 ? skillsToUse[matrixIndex] : null;
        const thematicUnit = mappedSkill?.thematicUnit || 'Unidade Temática';
        const skills = mappedSkill ? `${mappedSkill.skillCode} - ${mappedSkill.skillDescription}` : 'Habilidade da Matriz';
        const knowledgeObjects = mappedSkill?.knowledgeObjects || 'Objetos de Conhecimento';

        const methodology = `1. Acolhida e Sondagem (5 min): Roda de conversa inicial para acolher as crianças e sondar os saberes prévios sobre ${thematicUnit}.\n2. Apresentação e Motivação (10 min): Explicação dialogada e contextualizada com recursos visuais do conteúdo ${knowledgeObjects}.\n3. Desenvolvimento da Atividade (20 min): Realização de atividade pedagógica prática orientada e no material didático com mediação da professora.\n4. Registro e Sistematização (10 min): Fixação e registro no caderno por meio de escrita espontânea e ilustrações.\n5. Fechamento da Aula (5 min): Roda de síntese coletiva e avaliação formativa do aprendizado.`;

        const evaluation = `Avaliação formativa e contínua observando a participação, o engajamento na exploração do conteúdo (${knowledgeObjects}) e a compreensão evidenciada no registro individual no caderno.`;

        sampleData.push({
          discipline: norm as Discipline,
          lessonNumber: item.num,
          lessonDate: item.date,
          month: selectedMonth,
          year: selectedYear,
          grade: config.grade,
          classGroup: config.classGroup,
          bimestre,
          thematicUnit,
          skills,
          knowledgeObjects,
          methodology,
          evaluation,
          status: 'generated',
        });
      });
    }

    await db.lessons.filter(l => l.month === selectedMonth && l.year === selectedYear).delete();
    await db.lessons.bulkAdd(sampleData.map(l => ({ ...l, createdAt: new Date(), updatedAt: new Date() })));
    await loadLessons();
    toast.success(`🎉 ${sampleData.length} aulas de ${MONTH_NAMES[selectedMonth]}/${selectedYear} (${bimestre}) montadas com sucesso!`);
  };

  const handleExportJSON = () => {
    if (lessons.length === 0) {
      toast.error('Nenhuma aula para exportar.');
      return;
    }
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      month: selectedMonth,
      year: selectedYear,
      monthName: MONTH_NAMES[selectedMonth],
      teacher: config?.teacherName || '',
      school: config?.schoolName || '',
      grade: config?.grade || '',
      totalLessons: lessons.length,
      lessons: lessons.map(l => ({
        id: l.id,
        discipline: l.discipline,
        lessonNumber: l.lessonNumber,
        lessonDate: l.lessonDate,
        month: l.month,
        year: l.year,
        grade: l.grade,
        classGroup: l.classGroup,
        bimestre: l.bimestre,
        thematicUnit: l.thematicUnit,
        skills: l.skills,
        knowledgeObjects: l.knowledgeObjects,
        methodology: l.methodology,
        evaluation: l.evaluation,
        status: l.status,
        groupIndex: l.groupIndex,
        groupSize: l.groupSize,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planejamento_${MONTH_NAMES[selectedMonth].toLowerCase()}_${selectedYear}_gemul.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`🎉 JSON de ${MONTH_NAMES[selectedMonth]} exportado! Agora importe-o na extensão do GEMUL para preenchimento em 1 clique.`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Grade Mensal — Acompanhamento de Aulas
            </h2>
            {!isVacation && hasUploadedMatrixForMonth && (
              <span className="text-xs font-bold px-3 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Matriz Enviada ({currentBimestre}: {matrixSkillsCount} habilidades)</span>
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1">
            Gere com IA e acompanhe o preenchimento de cada aula a partir da Matriz Curricular enviada.
          </p>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
          <select
            className="input-field font-semibold text-blue-700 w-36"
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.slice(1).map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            className="input-field font-semibold text-slate-700 w-24"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {[2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* CONDITIONAL RENDERING: Férias vs Sem Matriz Enviada vs Grade Normal Ativa */}
      {isVacation ? (
        /* Estado 1: Férias / Recesso Escolar */
        <div className="card bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-200 p-10 text-center space-y-4 rounded-2xl shadow-xs">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mx-auto shadow-xs text-3xl">
            🏖️
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-amber-900">
              {MONTH_NAMES[selectedMonth]} — Mês de Férias / Recesso Escolar
            </h3>
            <p className="text-sm text-amber-700 max-w-lg mx-auto">
              No calendário escolar oficial do GEMUL, o mês de {MONTH_NAMES[selectedMonth]} não possui dias letivos ou aulas para planejamento.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setSelectedMonth(8)}
              className="btn-primary text-xs py-2.5 px-5 shadow-sm"
            >
              Ir para Agosto (3º Bimestre Letivo)
            </button>
          </div>
        </div>
      ) : !hasUploadedMatrixForMonth ? (
        /* Estado 2: Matriz do Bimestre Selecionado NÃO Enviada */
        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50/50 border-blue-200 p-10 text-center space-y-4 rounded-2xl shadow-xs">
          <div className="w-16 h-16 bg-blue-100 text-[#00236f] rounded-3xl flex items-center justify-center mx-auto shadow-xs">
            <Database className="w-8 h-8 text-[#00236f]" />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Matriz Curricular de {MONTH_NAMES[selectedMonth]} ({currentBimestre}) Não Enviada</span>
            </div>
            <h3 className="text-xl font-bold text-[#00236f]">
              Envie a Matriz Curricular para {MONTH_NAMES[selectedMonth]} ({currentBimestre})
            </h3>
            <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
              O sistema monta e gera as aulas <strong>exclusivamente a partir da Matriz Curricular real enviada pelo professor</strong>.
              Como a Matriz do <strong>{currentBimestre}</strong> ainda não foi anexada, envie o arquivo Word ou PDF na aba <strong>Matriz Curricular</strong> para liberar o planejamento deste mês.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/matriz')}
              className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 shadow-sm"
            >
              <Database className="w-4 h-4" />
              <span>📂 Enviar Matriz do {currentBimestre}</span>
            </button>
            <button
              onClick={() => setSelectedMonth(8)}
              className="btn-secondary text-xs py-2.5 px-4"
            >
              Ir para Agosto (3º Bimestre Cadastrado)
            </button>
          </div>
        </div>
      ) : (
        /* Estado 3: Grade Normal Ativa (Matriz Enviada com Sucesso) */
        <>
          {/* Stats Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center py-4 bg-white border-slate-200">
              <p className="text-3xl font-bold text-slate-800">{totalLessons}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Total de Aulas no Mês</p>
            </div>
            <div className="card text-center py-4 bg-yellow-50/50 border-yellow-200">
              <p className="text-3xl font-bold text-yellow-600">{generatedCount}</p>
              <p className="text-xs text-yellow-700 font-medium mt-1">Geradas com a Matriz</p>
            </div>
            <div className="card text-center py-4 bg-emerald-50/50 border-emerald-200">
              <p className="text-3xl font-bold text-emerald-600">{injectedCount}</p>
              <p className="text-xs text-emerald-700 font-medium mt-1">Enviadas ao GEMUL</p>
            </div>
            <div className="card text-center py-4 bg-blue-50/50 border-blue-200">
              <p className="text-3xl font-bold text-blue-600">
                {totalLessons > 0 ? `${Math.round((generatedCount / totalLessons) * 100)}%` : '0%'}
              </p>
              <p className="text-xs text-blue-700 font-medium mt-1">Progresso do Mês</p>
            </div>
          </div>

          {/* Main Action Bar (Modo B - Piloto Total) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            {lessons.length === 0 ? (
              <div className="flex flex-wrap items-center gap-3 w-full justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Nenhuma aula montada para {MONTH_NAMES[selectedMonth]}/{selectedYear}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Clique ao lado para criar as 92 aulas de {MONTH_NAMES[selectedMonth]} ({currentBimestre}) casadas com a Matriz Curricular enviada.
                  </p>
                </div>
                <button onClick={handleCreateMonthLessons} className="btn-primary flex items-center gap-2 shadow-md hover:scale-105 transition-all">
                  <Calendar className="w-4 h-4" />
                  <span>Montar Grade de Aulas ({MONTH_NAMES[selectedMonth]})</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 w-full justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleStartBatchGeneration()}
                    disabled={isGenerating}
                    className="btn-primary flex items-center gap-2 shadow-md hover:scale-105 transition-all bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-2.5 px-5"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>🚀 Piloto Total: Gerar Mês Completo com IA</span>
                  </button>

                  <button
                    onClick={() => config && generatePDF(lessons, config, selectedMonth, selectedYear)}
                    className="btn-secondary text-xs flex items-center gap-1.5 py-2 hover:bg-red-50 text-slate-700 hover:text-red-700"
                    title="Exportar documento PDF pronto para impressão ou envio à coordenação"
                  >
                    <FileDown className="w-4 h-4 text-red-600" />
                    <span>Exportar PDF</span>
                  </button>

                  <button
                    onClick={() => config && generateExcel(lessons, config, selectedMonth, selectedYear)}
                    className="btn-secondary text-xs flex items-center gap-1.5 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700"
                    title="Exportar planilha Excel (.xlsx) com todas as matérias e resumos"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Exportar Excel</span>
                  </button>

                  <button
                    onClick={handleExportJSON}
                    className="btn-secondary text-xs flex items-center gap-1.5 py-2 bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 font-semibold shadow-xs transition-all"
                    title="Exportar arquivo JSON para injeção automática no GEMUL em 1 clique"
                  >
                    <Code className="w-4 h-4 text-purple-600" />
                    <span>Exportar JSON (Extensão GEMUL)</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Deseja recriar as aulas de ${MONTH_NAMES[selectedMonth]}/${selectedYear} (${currentBimestre}) com a numeração e matriz enviadas deste mês?`)) {
                      handleCreateMonthLessons();
                    }
                  }}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-2 hover:bg-blue-50 text-slate-600 hover:text-[#00236f] transition-all"
                  title="Recria a grade deste mês específico com a numeração sequencial correta do ano letivo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Recriar Grade de {MONTH_NAMES[selectedMonth]}</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Progress & Live Generation Card */}
      {isGenerating && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-2xl shadow-xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-500/30 rounded-xl flex items-center justify-center border border-blue-400/30 animate-pulse">
                <Sparkles className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <p className="font-bold text-sm">
                  {progress.discipline} • Aula {progress.lessonNum} ({progress.current}/{progress.total})
                </p>
                <p className="text-xs text-blue-200 mt-0.5">{progress.statusText}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePauseToggle}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {isPaused ? 'Continuar' : 'Pausar'}
              </button>
              <button
                onClick={handleCancelGeneration}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
              >
                <Square className="w-3.5 h-3.5" />
                Parar
              </button>
            </div>
          </div>

          <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-400 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Grid of Disciplines and Lesson Boxes */}
      {lessons.length > 0 && (
        <div className="space-y-4">
          {Object.entries(byDiscipline).map(([discipline, discLessons]) => {
            const colors = DISCIPLINE_COLORS[discipline] || DISCIPLINE_COLORS['Geografia'];
            const allGenerated = discLessons.every(l => l.status !== 'pending');
            const pendingCount = discLessons.filter(l => l.status === 'pending').length;

            return (
              <div key={discipline} className="card overflow-hidden p-0 border-slate-200 shadow-xs">
                {/* Discipline Header */}
                <div className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-2 ${colors.bg} ${colors.border}`}>
                  <div className="flex items-center gap-3">
                    <h3 className={`font-bold text-sm uppercase tracking-wider ${colors.text}`}>
                      {DISCIPLINE_LABELS[discipline] || discipline}
                    </h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${colors.badge}`}>
                      {discLessons.length} aulas no mês
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {pendingCount > 0 && !isGenerating && (
                      <button
                        onClick={() => handleStartBatchGeneration(discipline as Discipline)}
                        className="text-xs bg-white/90 hover:bg-white text-slate-800 font-semibold px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1"
                        title={`Gerar apenas as ${pendingCount} aulas pendentes de ${DISCIPLINE_LABELS[discipline]}`}
                      >
                        <Zap className="w-3.5 h-3.5 text-blue-600" />
                        <span>Gerar {DISCIPLINE_LABELS[discipline]} ({pendingCount})</span>
                      </button>
                    )}
                    {allGenerated && (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        <Check className="w-3.5 h-3.5" />
                        100% Gerado
                      </span>
                    )}
                  </div>
                </div>

                {/* Lesson Boxes Grid */}
                <div className="p-4 bg-white">
                  <div className="flex flex-wrap gap-2.5">
                    {discLessons
                      .sort((a, b) => a.lessonNumber - b.lessonNumber)
                      .map(lesson => {
                        const isCurrentGenerating = currentGeneratingId === lesson.id;
                        const isDone = lesson.status !== 'pending';

                        let boxStyle = 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-400';
                        if (isDone) boxStyle = 'bg-amber-50/80 border-amber-300 text-amber-900 shadow-2xs';
                        if (lesson.status === 'reviewed') boxStyle = 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs';
                        if (isCurrentGenerating) boxStyle = 'bg-blue-600 text-white border-blue-600 animate-pulse scale-105 shadow-md';

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => setPreviewLesson(lesson)}
                            className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border text-xs font-medium transition-all hover:scale-105 cursor-pointer relative group ${boxStyle}`}
                            title={`Aula ${lesson.lessonNumber} — ${lesson.lessonDate}\nClique para ver os 4 tópicos preenchidos`}
                          >
                            <span className="font-bold text-sm leading-none">{lesson.lessonNumber}</span>
                            <span className="text-[10px] opacity-75 mt-1 font-mono">{lesson.lessonDate.substring(0, 5)}</span>

                            {isDone && !isCurrentGenerating && (
                              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick View Drawer / Modal for a Lesson (Shows all 4 Categories instantly) */}
      {previewLesson && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-800">
                    Aula {previewLesson.lessonNumber} — {DISCIPLINE_LABELS[previewLesson.discipline] || previewLesson.discipline}
                  </h3>
                  <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                    {previewLesson.lessonDate}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{previewLesson.grade} {previewLesson.classGroup} • Turno Matutino</p>
              </div>

              <button
                onClick={() => setPreviewLesson(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* The 4 Categories Display */}
            <div className="space-y-3 text-sm">
              {/* Categoria 1: Habilidade */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase">
                  <Target className="w-3.5 h-3.5" />
                  <span>1. Habilidade & Unidade Temática:</span>
                </div>
                <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3 text-slate-800">
                  <p className="text-xs font-semibold text-blue-900 mb-1">{previewLesson.thematicUnit}</p>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {previewLesson.skills || <span className="italic text-slate-400">Pendente de geração com IA</span>}
                  </p>
                </div>
              </div>

              {/* Categoria 2: Objetos de Conhecimento */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>2. Objetos de Conhecimento / Conteúdo:</span>
                </div>
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-3 text-xs text-slate-700">
                  {previewLesson.knowledgeObjects || <span className="italic text-slate-400">Pendente de geração com IA</span>}
                </div>
              </div>

              {/* Categoria 3: Metodologia */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 uppercase">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>3. Metodologia (Roteiro da Aula):</span>
                </div>
                <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-3 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {previewLesson.methodology || <span className="italic text-slate-400">Pendente de geração com IA</span>}
                </div>
              </div>

              {/* Categoria 4: Avaliação */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase">
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>4. Avaliação (Critérios de Aprendizagem):</span>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {previewLesson.evaluation || <span className="italic text-slate-400">Pendente de geração com IA</span>}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => navigate(`/aula/${previewLesson.id}`)}
                className="btn-secondary text-xs flex items-center gap-1"
              >
                <span>Abrir Editor Completo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewLesson(null)}
                className="btn-primary text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
