import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Zap, FileDown, Table, RefreshCw, CheckCircle,
  Clock, Eye, AlertCircle, Download, Loader2, Play, Pause,
  Square, Sparkles, Check, ChevronRight, Target, BookOpen, Lightbulb, CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/useAppStore';
import { db } from '../db';
import { generateLesson } from '../services/ai';
import { generatePDF } from '../services/pdf';
import { generateExcel } from '../services/excel';
import { normalizeDiscipline, normalizeBimestre } from '../services/normalizer';
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

function determineBimestre(month: number): Bimestre {
  if (month <= 3) return '1 Bimestre';
  if (month <= 6) return '2 Bimestre';
  if (month <= 9) return '3 Bimestre';
  return '4 Bimestre';
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { config, matrixSkills, selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useAppStore();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  // Generation State (Modo B - Piloto Total)
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentGeneratingId, setCurrentGeneratingId] = useState<number | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, discipline: '', lessonNum: 0, statusText: '' });
  
  // Quick View Drawer for a lesson
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  const loadLessons = useCallback(async () => {
    const all = await db.lessons.filter(l => l.month === selectedMonth && l.year === selectedYear).toArray();
    const allMatrixSkills = await db.matrix.toArray();

    const matrixByDisc = allMatrixSkills.reduce((acc, s) => {
      const norm = normalizeDiscipline(s.discipline);
      if (!acc[norm]) acc[norm] = [];
      acc[norm].push(s);
      return acc;
    }, {} as Record<string, typeof allMatrixSkills>);

    const repairedLessons: Lesson[] = [];

    for (const l of all) {
      const norm = normalizeDiscipline(l.discipline);
      const availableSkills = (matrixByDisc[norm] || []).filter(s => normalizeBimestre(s.bimestre) === l.bimestre);
      const skillsToUse = availableSkills.length > 0 ? availableSkills : (matrixByDisc[norm] || []);
      const mappedSkill = skillsToUse.length > 0 ? skillsToUse[l.lessonNumber % skillsToUse.length] : null;

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
   * Processa aula por aula sequencialmente (leves para computadores modestos),
   * salvando no IndexedDB a cada aula gerada.
   */
  const handleStartBatchGeneration = async (targetDiscipline?: Discipline) => {
    if (!config) return toast.error('Configure os dados da professora nas Configurações!');
    if (!config.geminiApiKey) return toast.error('Configure a chave de API do Gemini nas Configurações!');

    // Filtra aulas que estão pendentes ou que vieram com reticências/incompletas
    let targetLessons = lessons.filter(l => {
      const matchDisc = targetDiscipline ? normalizeDiscipline(l.discipline) === targetDiscipline : true;
      return matchDisc && (l.status === 'pending' || !l.methodology || l.methodology === '...' || l.methodology.length < 15);
    });

    // Se todas já foram preenchidas, permite regenerar todas as aulas selecionadas
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

    // Agrupa por disciplina + data para identificar sequências do mesmo dia
    const sameDayGroups = new Map<string, Lesson[]>();
    for (const l of lessons) {
      const key = `${normalizeDiscipline(l.discipline)}|${l.lessonDate}`;
      if (!sameDayGroups.has(key)) sameDayGroups.set(key, []);
      sameDayGroups.get(key)!.push(l);
    }

    // Carrega a matriz do banco para garantir que temos os dados mais recentes
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
        statusText: `Cruzando Matriz e escrevendo Metodologia da Aula ${lesson.lessonNumber}...`
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

        // Salva imediatamente no banco local (IndexedDB)
        if (lesson.id) {
          await db.lessons.update(lesson.id, updatedLesson);
        }

        // Atualiza estado na memória
        setLessons(prev => prev.map(l => l.id === lesson.id ? updatedLesson : l));

      } catch (err: any) {
        console.error(`Erro na aula ${lesson.lessonNumber} (${normDisc}):`, err);
      }

      // Intervalo de alívio térmico/processamento para não travar PCs mais modestos
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

  /**
   * Cria as 92 aulas exatas de Agosto de 2026 (idênticas ao GEMUL)
   * e pré-associa as habilidades da Matriz Curricular
   */
  const handleCreateMonthLessons = async () => {
    if (!config) return toast.error('Configure os dados da professora primeiro!');
    if (lessons.length > 0) {
      return toast.error('Já existem aulas cadastradas para este mês. Clique em "Limpar Mês" se quiser recriar.');
    }

    const bimestre = determineBimestre(selectedMonth);
    const allMatrixSkills = await db.matrix.toArray();

    if (allMatrixSkills.length === 0) {
      toast.error('A Matriz Curricular está vazia! Envie o arquivo Word/PDF na aba "Matriz Curricular" antes de montar a grade.');
      setTimeout(() => navigate('/matriz'), 1000);
      return;
    }

    const matrixByDisc = allMatrixSkills.reduce((acc, s) => {
      const norm = normalizeDiscipline(s.discipline);
      if (!acc[norm]) acc[norm] = [];
      acc[norm].push(s);
      return acc;
    }, {} as Record<string, typeof allMatrixSkills>);

    // Grade exata de Agosto de 2026 dos prints oficiais do GEMUL
    const schedule: { discipline: Discipline; lessons: { num: number; date: string; day: string }[] }[] = [
      {
        discipline: 'Arte',
        lessons: [
          { num: 21, date: '07/08', day: 'Sexta' }, { num: 22, date: '14/08', day: 'Sexta' },
          { num: 23, date: '21/08', day: 'Sexta' }, { num: 24, date: '28/08', day: 'Sexta' },
        ]
      },
      {
        discipline: 'Ciencias',
        lessons: Array.from({ length: 12 }, (_, i) => ({ num: 67 + i, date: `${(Math.floor(i / 3) * 7 + 5).toString().padStart(2, '0')}/08`, day: 'Quarta' }))
      },
      {
        discipline: 'Educacao Fisica',
        lessons: [
          { num: 21, date: '07/08', day: 'Sexta' }, { num: 22, date: '14/08', day: 'Sexta' },
          { num: 23, date: '21/08', day: 'Sexta' }, { num: 24, date: '28/08', day: 'Sexta' },
        ]
      },
      {
        discipline: 'Ensino Religioso',
        lessons: [
          { num: 22, date: '06/08', day: 'Quinta' }, { num: 23, date: '13/08', day: 'Quinta' },
          { num: 24, date: '20/08', day: 'Quinta' }, { num: 25, date: '27/08', day: 'Quinta' },
        ]
      },
      {
        discipline: 'Geografia',
        lessons: Array.from({ length: 12 }, (_, i) => ({ num: 64 + i, date: `${(Math.floor(i / 3) * 7 + 4).toString().padStart(2, '0')}/08`, day: 'Terça' }))
      },
      {
        discipline: 'Historia',
        lessons: Array.from({ length: 12 }, (_, i) => ({ num: 64 + i, date: `${(Math.floor(i / 3) * 7 + 10).toString().padStart(2, '0')}/08`, day: 'Segunda' }))
      },
      {
        discipline: 'Lingua Portuguesa',
        lessons: Array.from({ length: 20 }, (_, i) => ({ num: 106 + i, date: `${(Math.floor(i / 5) * 7 + 4).toString().padStart(2, '0')}/08`, day: i % 5 === 0 ? 'Terça' : 'Quarta' }))
      },
      {
        discipline: 'Matematica',
        lessons: Array.from({ length: 20 }, (_, i) => ({ num: 106 + i, date: `${(Math.floor(i / 5) * 7 + 5).toString().padStart(2, '0')}/08`, day: 'Quarta' }))
      },
      {
        discipline: 'Producao Textual',
        lessons: [
          { num: 22, date: '06/08', day: 'Quinta' }, { num: 23, date: '13/08', day: 'Quinta' },
          { num: 24, date: '20/08', day: 'Quinta' }, { num: 25, date: '27/08', day: 'Quinta' },
        ]
      },
    ];

    const sampleData: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    for (const { discipline, lessons: lessonList } of schedule) {
      const norm = normalizeDiscipline(discipline);
      const availableSkills = (matrixByDisc[norm] || []).filter(s => normalizeBimestre(s.bimestre) === bimestre);
      const skillsToUse = availableSkills.length > 0 ? availableSkills : (matrixByDisc[norm] || []);

      lessonList.forEach((item, index) => {
        // Mapeia sequencialmente o item da matriz correspondente a esta aula
        const matrixIndex = skillsToUse.length > 0 ? index % skillsToUse.length : 0;
        const mappedSkill = skillsToUse.length > 0 ? skillsToUse[matrixIndex] : null;
        const thematicUnit = mappedSkill?.thematicUnit || 'Unidade Temática';
        const skills = mappedSkill ? `${mappedSkill.skillCode} - ${mappedSkill.skillDescription}` : 'Habilidade BNCC';
        const knowledgeObjects = mappedSkill?.knowledgeObjects || 'Objetos de Conhecimento';

        const methodology = `1. Acolhida e Sondagem (5 min): Roda de conversa inicial para acolher as crianças e sondar os saberes prévios sobre ${thematicUnit}.\n2. Apresentação e Motivação (10 min): Explicação dialogada e contextualizada com recursos visuais do conteúdo ${knowledgeObjects}.\n3. Desenvolvimento da Atividade (20 min): Realização de atividade pedagógica prática orientada e no material didático com mediação da professora.\n4. Registro e Sistematização (10 min): Fixação e registro no caderno por meio de escrita espontânea e ilustrações.\n5. Fechamento da Aula (5 min): Roda de síntese coletiva e avaliação formativa do aprendizado.`;

        const evaluation = `Avaliação formativa e contínua observando a participação, o engajamento na exploração do conteúdo (${knowledgeObjects}) e a compreensão evidenciada no registro individual no caderno.`;

        sampleData.push({
          discipline: norm as Discipline,
          lessonNumber: item.num,
          lessonDate: `${item.date}/${selectedYear}`,
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

    await db.lessons.bulkAdd(sampleData.map(l => ({ ...l, createdAt: new Date(), updatedAt: new Date() })));
    await loadLessons();
    toast.success(`🎉 ${sampleData.length} aulas de ${MONTH_NAMES[selectedMonth]}/${selectedYear} criadas e integradas à Matriz!`);
  };

  const handleExportJSON = async () => {
    const data = JSON.stringify({ lessons, month: selectedMonth, year: selectedYear }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planejamento_${MONTH_NAMES[selectedMonth]}_${selectedYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exportado com sucesso!');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Grade Mensal — Acompanhamento de Aulas
          </h2>
          <p className="text-slate-500 mt-1">
            Gere com IA e acompanhe o preenchimento de cada aula com base na Matriz Curricular.
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
          <p className="text-3xl font-bold text-emerald-600">
            {lessons.filter(l => l.status === 'reviewed').length}
          </p>
          <p className="text-xs text-emerald-700 font-medium mt-1">Revisadas</p>
        </div>
        <div className="card text-center py-4 bg-blue-50/50 border-blue-200">
          <p className="text-3xl font-bold text-blue-600">
            {totalLessons > 0 ? Math.round((generatedCount / totalLessons) * 100) : 0}%
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
              <p className="text-xs text-slate-500 mt-0.5">Clique ao lado para criar as 92 aulas de {MONTH_NAMES[selectedMonth]} já casadas com a sua Matriz Curricular.</p>
            </div>
            <button onClick={handleCreateMonthLessons} className="btn-primary flex items-center gap-2 shadow-md hover:scale-105 transition-all">
              <Calendar className="w-4 h-4" />
              <span>Montar Grade de Aulas ({MONTH_NAMES[selectedMonth]})</span>
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {/* MODO B: PILOTO TOTAL */}
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
                className="btn-secondary text-xs flex items-center gap-1.5 py-2"
              >
                <FileDown className="w-4 h-4 text-red-600" />
                Exportar PDF
              </button>

              <button
                onClick={() => config && generateExcel(lessons, config, selectedMonth, selectedYear)}
                className="btn-secondary text-xs flex items-center gap-1.5 py-2"
              >
                <Table className="w-4 h-4 text-emerald-600" />
                Exportar Excel
              </button>

              <button onClick={handleExportJSON} className="btn-secondary text-xs flex items-center gap-1.5 py-2">
                <Download className="w-4 h-4 text-blue-600" />
                Exportar JSON
              </button>
            </div>

            <button
              onClick={async () => {
                if (confirm('Deseja limpar as aulas deste mês?')) {
                  await db.lessons.filter(l => l.month === selectedMonth && l.year === selectedYear).delete();
                  await loadLessons();
                  toast.success('Aulas removidas.');
                }
              }}
              className="text-xs text-red-600 hover:text-red-800 px-3 py-1.5"
            >
              Limpar Mês
            </button>
          </>
        )}
      </div>

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
