import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, RefreshCw, CheckCircle, Eye,
  Send, AlertTriangle, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../db';
import { generateLesson } from '../services/ai';
import { sanitizeText, GEMUL_LIMITS } from '../services/sanitizer';
import { useAppStore } from '../store/useAppStore';
import type { Lesson, Bimestre } from '../types';

const BIMESTRES: Bimestre[] = ['1 Bimestre'];

function CharCounter({ value, max }: { value: string; max: number }) {
  const len = sanitizeText(value).length;
  const pct = len / max;
  const color = pct > 0.9 ? 'text-red-600' : pct > 0.7 ? 'text-amber-600' : 'text-slate-400';
  return (
    <span className={`text-xs font-mono ${color}`}>
      {len}/{max}
    </span>
  );
}

export default function LessonEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { config, matrixSkills } = useAppStore();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (id) {
      db.lessons.get(Number(id)).then(l => {
        if (l) setLesson(l);
        else {
          toast.error('Aula não encontrada.');
          navigate('/calendario');
        }
      });
    }
  }, [id]);

  const handleChange = (field: keyof Lesson, value: string) => {
    if (!lesson) return;
    setLesson({ ...lesson, [field]: value });
  };

  const handleSave = async (newStatus?: Lesson['status']) => {
    if (!lesson) return;
    setIsSaving(true);
    try {
      const updated = {
        ...lesson,
        status: newStatus || lesson.status,
        updatedAt: new Date(),
      };
      await db.lessons.update(lesson.id!, updated);
      setLesson(updated);
      toast.success('Aula salva com sucesso!');
    } catch {
      toast.error('Erro ao salvar aula.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async (field?: string) => {
    if (!lesson || !config?.geminiApiKey) {
      return toast.error('Configure a chave de API do Gemini nas Configurações.');
    }

    setIsRegenerating(field || 'all');
    try {
      const generated = await generateLesson(
        {
          discipline: lesson.discipline,
          lessonNumber: lesson.lessonNumber,
          lessonDate: lesson.lessonDate,
          month: lesson.month,
          year: lesson.year,
          grade: lesson.grade,
          classGroup: lesson.classGroup,
          bimestre: lesson.bimestre,
          thematicUnit: lesson.thematicUnit,
          matrixSkills,
          groupIndex: lesson.groupIndex ?? 0,
          groupSize: lesson.groupSize ?? 1,
          teacherName: config.teacherName,
          schoolName: config.schoolName,
        },
        config.geminiApiKey
      );

      if (field && field !== 'all') {
        const newLesson = { ...lesson, [field]: generated[field as keyof typeof generated] };
        setLesson(newLesson as Lesson);
      } else {
        setLesson({ ...lesson, ...generated, status: 'generated' });
      }
      toast.success('Regenerado com sucesso!');
    } catch (err: any) {
      toast.error(`Erro ao regenerar: ${err.message}`);
    } finally {
      setIsRegenerating(null);
    }
  };

  const handleMarkReviewed = () => handleSave('reviewed');
  const handleMarkInjected = () => handleSave('injected');

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const statusColors = {
    pending: 'bg-slate-100 text-slate-600',
    generated: 'bg-yellow-100 text-yellow-700',
    reviewed: 'bg-blue-100 text-blue-700',
    injected: 'bg-green-100 text-green-700',
  };

  const statusLabels = {
    pending: 'Pendente',
    generated: 'Gerada pela IA',
    reviewed: 'Revisada',
    injected: 'Enviada ao GEMUL',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/calendario')} className="btn-secondary flex items-center gap-2 py-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">
              Aula {lesson.lessonNumber} — {lesson.discipline}
            </h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[lesson.status]}`}>
              {statusLabels[lesson.status]}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {lesson.lessonDate} • {lesson.grade} {lesson.classGroup} • {lesson.bimestre}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleRegenerate()}
            disabled={isRegenerating !== null}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {isRegenerating === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerar Tudo
          </button>
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>
      </div>

      {/* Header Info (read-only) */}
      <div className="card grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Disciplina</p>
          <p className="font-semibold text-slate-700">{lesson.discipline}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Turma</p>
          <p className="font-semibold text-slate-700">{lesson.grade} {lesson.classGroup}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Data da Aula</p>
          <p className="font-semibold text-slate-700">{lesson.lessonDate}</p>
        </div>
      </div>

      {/* Planejamento Anual (left column in GEMUL) */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-400 rounded-full" />
            Planejamento Anual
          </h3>

          <div>
            <label className="label">Unidade Temática / Linguagem / Práticas / Eixos</label>
            <input
              className="input-field"
              value={lesson.thematicUnit}
              onChange={e => handleChange('thematicUnit', e.target.value)}
              maxLength={GEMUL_LIMITS.thematicUnit}
            />
            <div className="flex justify-end mt-1">
              <CharCounter value={lesson.thematicUnit} max={GEMUL_LIMITS.thematicUnit} />
            </div>
          </div>

          <div>
            <label className="label">Bimestre</label>
            <select
              className="input-field"
              value={lesson.bimestre}
              onChange={e => handleChange('bimestre', e.target.value as Bimestre)}
            >
              {BIMESTRES.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {/* Planejamento do Professor (right column in GEMUL) */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-400 rounded-full" />
            Planejamento do Professor
          </h3>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Habilidades</label>
              <div className="flex items-center gap-2">
                <CharCounter value={lesson.skills} max={GEMUL_LIMITS.skills} />
                <button
                  onClick={() => handleRegenerate('skills')}
                  disabled={isRegenerating !== null}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {isRegenerating === 'skills' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Regenerar
                </button>
              </div>
            </div>
            <textarea
              className="textarea-field"
              rows={3}
              value={lesson.skills}
              onChange={e => handleChange('skills', e.target.value)}
              maxLength={GEMUL_LIMITS.skills}
              placeholder="Ex: EF01GE01 - Descrever características observadas dos lugares de vivência..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Objetos de Conhecimento / Conteúdo</label>
              <div className="flex items-center gap-2">
                <CharCounter value={lesson.knowledgeObjects} max={GEMUL_LIMITS.knowledgeObjects} />
                <button
                  onClick={() => handleRegenerate('knowledgeObjects')}
                  disabled={isRegenerating !== null}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {isRegenerating === 'knowledgeObjects' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Regenerar
                </button>
              </div>
            </div>
            <textarea
              className="textarea-field"
              rows={2}
              value={lesson.knowledgeObjects}
              onChange={e => handleChange('knowledgeObjects', e.target.value)}
              maxLength={GEMUL_LIMITS.knowledgeObjects}
              placeholder="Lugar de vivência: casa, escola, bairro..."
            />
          </div>
        </div>
      </div>

      {/* Methodology */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-400 rounded-full" />
            Metodologia
          </h3>
          <div className="flex items-center gap-3">
            <CharCounter value={lesson.methodology} max={GEMUL_LIMITS.methodology} />
            <button
              onClick={() => handleRegenerate('methodology')}
              disabled={isRegenerating !== null}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {isRegenerating === 'methodology' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Regenerar
            </button>
          </div>
        </div>
        {lesson.methodology.length > GEMUL_LIMITS.methodology * 0.9 && (
          <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5" />
            Texto próximo ao limite máximo do GEMUL. Considere reduzir.
          </div>
        )}
        <textarea
          className="textarea-field"
          rows={8}
          value={lesson.methodology}
          onChange={e => handleChange('methodology', e.target.value)}
          maxLength={GEMUL_LIMITS.methodology}
          placeholder="1. Acolhida e sondagem dos conhecimentos prévios (5 min): ...&#10;2. Motivação e apresentação do tema (10 min): ...&#10;3. Desenvolvimento da atividade (20 min): ...&#10;4. Registro e sistematização (10 min): ...&#10;5. Fechamento e avaliação formativa (5 min): ..."
        />
      </div>

      {/* Evaluation */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-400 rounded-full" />
            Avaliação
          </h3>
          <div className="flex items-center gap-3">
            <CharCounter value={lesson.evaluation} max={GEMUL_LIMITS.evaluation} />
            <button
              onClick={() => handleRegenerate('evaluation')}
              disabled={isRegenerating !== null}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {isRegenerating === 'evaluation' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Regenerar
            </button>
          </div>
        </div>
        <textarea
          className="textarea-field"
          rows={4}
          value={lesson.evaluation}
          onChange={e => handleChange('evaluation', e.target.value)}
          maxLength={GEMUL_LIMITS.evaluation}
          placeholder="Avaliação formativa e contínua por meio de: observação direta da participação..."
        />
      </div>

      {/* Preview Toggle */}
      <div className="card p-0 overflow-hidden">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            Pré-visualização — Como ficará no GEMUL
          </div>
          {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showPreview && (
          <div className="border-t border-slate-100 p-5 space-y-4 bg-slate-50">
            <PreviewField label="Unidade Temática" value={lesson.thematicUnit} />
            <PreviewField label="Bimestre" value={lesson.bimestre} />
            <PreviewField label="Habilidades" value={lesson.skills} />
            <PreviewField label="Objetos de Conhecimento / Conteúdo" value={lesson.knowledgeObjects} />
            <PreviewField label="Metodologia" value={lesson.methodology} />
            <PreviewField label="Avaliação" value={lesson.evaluation} />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pb-8">
        <button onClick={() => handleSave()} disabled={isSaving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
        <button onClick={handleMarkReviewed} className="btn-secondary flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Marcar como Revisada
        </button>
        <button onClick={handleMarkInjected} className="btn-success flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Marcar como Enviada ao GEMUL
        </button>
      </div>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-slate-700 bg-white rounded-lg border border-slate-200 px-3 py-2 whitespace-pre-wrap min-h-[2rem]">
        {value || <span className="text-slate-300 italic">Não preenchido</span>}
      </p>
    </div>
  );
}
