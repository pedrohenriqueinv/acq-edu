import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2,
  Trash2, Database, Plus, ChevronDown, ChevronUp, ArrowRight,
  BookOpen, Sparkles, Target, Layers, Lightbulb, CheckSquare, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../db';
import { parseDocumentFile, type ParsedDocumentResult } from '../services/documentParser';
import { extractMatrixFromDocument } from '../services/ai';
import { BNCC_1ANO } from '../data/bncc';
import { normalizeDiscipline, normalizeBimestre } from '../services/normalizer';
import { useAppStore } from '../store/useAppStore';
import type { MatrixSkill, Discipline, Bimestre } from '../types';

const DISCIPLINES: Discipline[] = [
  'Arte', 'Ciencias', 'Educacao Fisica', 'Ensino Religioso',
  'Geografia', 'Historia', 'Lingua Portuguesa', 'Matematica', 'Producao Textual'
];

const DISCIPLINE_LABELS: Record<Discipline, string> = {
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

export default function MatrixPage() {
  const navigate = useNavigate();
  const { config, loadMatrixSkills } = useAppStore();
  const [skills, setSkills] = useState<MatrixSkill[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline>('Historia');
  const [selectedBimestre, setSelectedBimestre] = useState<Bimestre>('3 Bimestre');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

  // File Upload State
  const [isParsing, setIsParsing] = useState(false);
  const [parsedDoc, setParsedDoc] = useState<ParsedDocumentResult | null>(null);
  const [extractProgress, setExtractProgress] = useState<string>('');
  const [manualText, setManualText] = useState<string>('');
  const [showManualText, setShowManualText] = useState(false);

  // Add Single Skill Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    discipline: 'Historia' as Discipline,
    bimestre: '3 Bimestre' as Bimestre,
    thematicUnit: '',
    skillCode: '',
    skillDescription: '',
    knowledgeObjects: '',
  });

  const loadSkills = async () => {
    const all = await db.matrix.toArray();
    const normalized = all.map(s => ({
      ...s,
      discipline: normalizeDiscipline(s.discipline),
      bimestre: normalizeBimestre(s.bimestre),
    }));
    setSkills(normalized);
  };

  useEffect(() => { loadSkills(); }, []);

  const toggleExpandCard = (id: number) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setExtractProgress('Lendo arquivo do seu computador...');

    try {
      const parsed = await parseDocumentFile(file);
      setParsedDoc(parsed);
      toast.success(`Arquivo "${file.name}" lido com sucesso (${parsed.text.length} caracteres).`);

      if (config?.geminiApiKey) {
        await handleExtractWithAI(parsed.text);
      } else {
        toast('Configure a chave de API em Configurações para extrair com IA automaticamente.', { icon: '🔑' });
      }
    } catch (err: any) {
      toast.error(`Erro ao ler documento: ${err.message}`);
    } finally {
      setIsParsing(false);
      setExtractProgress('');
    }
  };

  const handleExtractWithAI = async (textToExtract: string) => {
    if (!config?.geminiApiKey) {
      return toast.error('Configure a chave de API do Google Gemini em Configurações para usar a IA!');
    }
    if (!textToExtract.trim()) {
      return toast.error('Nenhum texto para analisar.');
    }

    setIsParsing(true);
    setExtractProgress('A IA do Gemini está analisando a Matriz Curricular...');

    try {
      const extractedSkills = await extractMatrixFromDocument(
        textToExtract,
        config.geminiApiKey,
        msg => setExtractProgress(msg)
      );

      if (extractedSkills.length === 0) {
        throw new Error('Nenhuma habilidade foi identificada no documento.');
      }

      await db.matrix.bulkAdd(extractedSkills.map(s => ({ ...s, createdAt: new Date() })));
      await loadSkills();
      await loadMatrixSkills();

      toast.success(`🎉 Sucesso! ${extractedSkills.length} itens da Matriz foram organizados!`);
    } catch (err: any) {
      toast.error(`Erro na extração: ${err.message}`);
    } finally {
      setIsParsing(false);
      setExtractProgress('');
    }
  };

  const handleLoadBNCCPadrao = async () => {
    setIsParsing(true);
    try {
      await db.matrix.bulkAdd(BNCC_1ANO.map(s => ({ ...s, createdAt: new Date() })));
      await loadSkills();
      await loadMatrixSkills();
      toast.success(`${BNCC_1ANO.length} habilidades da BNCC carregadas!`);
    } catch {
      toast.error('Erro ao carregar BNCC padrão.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleClearMatrix = async () => {
    if (confirm('Tem certeza que deseja apagar todos os itens cadastrados da matriz?')) {
      await db.matrix.clear();
      await loadSkills();
      await loadMatrixSkills();
      toast.success('Matriz curricular limpa.');
    }
  };

  const handleAddSkill = async () => {
    if (!form.thematicUnit || !form.skillCode || !form.skillDescription) {
      return toast.error('Preencha ao menos: Unidade Temática, Código e Descrição.');
    }
    await db.matrix.add({ ...form, createdAt: new Date() });
    await loadSkills();
    await loadMatrixSkills();
    setForm(f => ({ ...f, thematicUnit: '', skillCode: '', skillDescription: '', knowledgeObjects: '' }));
    setShowAddForm(false);
    toast.success('Item adicionado à Matriz!');
  };

  const handleDelete = async (id: number) => {
    await db.matrix.delete(id);
    await loadSkills();
    await loadMatrixSkills();
    toast.success('Item removido.');
  };

  const filteredSkills = skills.filter(s => {
    const matchDiscipline = normalizeDiscipline(s.discipline) === normalizeDiscipline(selectedDiscipline);
    const matchBimestre = normalizeBimestre(s.bimestre) === normalizeBimestre(selectedBimestre);
    const matchSearch = searchTerm
      ? (s.skillCode + ' ' + s.thematicUnit + ' ' + s.skillDescription + ' ' + s.knowledgeObjects)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      : true;
    return matchDiscipline && matchBimestre && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Matriz Curricular da Escola
          </h2>
          <p className="text-slate-500 mt-1">
            Itens organizados por categorias curriculares: Habilidades, Objetos de Conhecimento, Metodologia e Avaliação.
          </p>
        </div>

        {skills.length > 0 && (
          <button
            onClick={() => navigate('/calendario')}
            className="btn-success flex items-center gap-2 shadow-md hover:scale-105 transition-transform"
          >
            <span>Ir para Grade e Gerar Aulas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Upload Zone (The Star Feature) */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-2xl p-6 text-center relative overflow-hidden shadow-sm">
        <input
          type="file"
          id="matrix-file-upload"
          accept=".pdf,.docx,.txt"
          onChange={handleFileUpload}
          disabled={isParsing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        <div className="max-w-md mx-auto space-y-2">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center mx-auto shadow-md">
            {isParsing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-800">
              {isParsing ? 'Processando Documento...' : 'Clique ou Arraste a Matriz Curricular (Word .docx ou PDF) aqui'}
            </h3>
            <p className="text-xs text-slate-500">
              Atualize a matriz a qualquer momento enviando novos arquivos
            </p>
          </div>

          {isParsing && extractProgress && (
            <div className="bg-white/80 border border-blue-200 rounded-xl p-2.5 text-xs text-blue-700 font-medium animate-pulse">
              {extractProgress}
            </div>
          )}

          <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowManualText(!showManualText); }}
              className="text-xs text-blue-600 font-semibold underline hover:text-blue-800"
            >
              Colar texto
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleLoadBNCCPadrao(); }}
              className="text-xs text-emerald-600 font-semibold underline hover:text-emerald-800 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Carregar Base BNCC
            </button>
          </div>
        </div>
      </div>

      {/* Manual Text Paste Area */}
      {showManualText && (
        <div className="card space-y-3 bg-slate-50 border-slate-300">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-slate-700">Colar Texto da Matriz Curricular</h4>
            <button onClick={() => setShowManualText(false)} className="text-xs text-slate-400 hover:text-slate-600">Fechar</button>
          </div>
          <textarea
            className="textarea-field"
            rows={5}
            placeholder="Cole aqui o texto copiado do Word ou PDF..."
            value={manualText}
            onChange={e => setManualText(e.target.value)}
          />
          <button
            onClick={() => handleExtractWithAI(manualText)}
            disabled={isParsing || !manualText.trim()}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Extrair com IA
          </button>
        </div>
      )}

      {/* Total Counter and Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Database className="w-4 h-4 text-blue-600" />
            <span>Total cadastrado na Matriz:</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              {skills.length} itens
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 border-l border-slate-200 pl-3">
            <span>4 Categorias Mapeadas:</span>
            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">🎯 Habilidades</span>
            <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">📚 Objetos/Conteúdo</span>
            <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">💡 Metodologia</span>
            <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium">📝 Avaliação</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-secondary text-xs flex items-center gap-1 py-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Manualmente
          </button>
          {skills.length > 0 && (
            <button onClick={handleClearMatrix} className="text-xs text-red-600 hover:text-red-800 px-2 py-1">
              Limpar Tudo
            </button>
          )}
        </div>
      </div>

      {/* Manual Add Form Drawer */}
      {showAddForm && (
        <div className="card space-y-4 border-blue-200 bg-blue-50/40">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            Adicionar Item à Matriz Curricular
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Disciplina</label>
              <select
                className="input-field"
                value={form.discipline}
                onChange={e => setForm(f => ({ ...f, discipline: e.target.value as Discipline }))}
              >
                {DISCIPLINES.map(d => <option key={d} value={d}>{DISCIPLINE_LABELS[d]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bimestre</label>
              <select
                className="input-field"
                value={form.bimestre}
                onChange={e => setForm(f => ({ ...f, bimestre: e.target.value as Bimestre }))}
              >
                <option value="1 Bimestre">1º Bimestre</option>
                <option value="2 Bimestre">2º Bimestre</option>
                <option value="3 Bimestre">3º Bimestre</option>
                <option value="4 Bimestre">4º Bimestre</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Unidade Temática</label>
            <input
              className="input-field"
              value={form.thematicUnit}
              onChange={e => setForm(f => ({ ...f, thematicUnit: e.target.value }))}
              placeholder="Ex: Mundo pessoal: meu lugar no mundo"
            />
          </div>
          <div>
            <label className="label">Código da Habilidade (BNCC/DC-GO)</label>
            <input
              className="input-field font-mono"
              value={form.skillCode}
              onChange={e => setForm(f => ({ ...f, skillCode: e.target.value }))}
              placeholder="Ex: EF01HI04-A"
            />
          </div>
          <div>
            <label className="label">Descrição da Habilidade</label>
            <textarea
              className="textarea-field"
              rows={2}
              value={form.skillDescription}
              onChange={e => setForm(f => ({ ...f, skillDescription: e.target.value }))}
              placeholder="Conhecer e refletir sobre a diversidade..."
            />
          </div>
          <div>
            <label className="label">Objetos de Conhecimento / Conteúdo</label>
            <textarea
              className="textarea-field"
              rows={2}
              value={form.knowledgeObjects}
              onChange={e => setForm(f => ({ ...f, knowledgeObjects: e.target.value }))}
              placeholder="A escola e a diversidade do grupo social..."
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddSkill} className="btn-primary text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Salvar Item na Matriz
            </button>
            <button onClick={() => setShowAddForm(false)} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Explorer / Visualizer */}
      <div className="card space-y-5">
        {/* Filters and Search Bar */}
        <div className="flex flex-wrap items-end gap-3 pb-4 border-b border-slate-100">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Disciplina</label>
            <select
              className="input-field font-semibold text-blue-700"
              value={selectedDiscipline}
              onChange={e => setSelectedDiscipline(e.target.value as Discipline)}
            >
              {DISCIPLINES.map(d => {
                const count = skills.filter(s =>
                  normalizeDiscipline(s.discipline) === d &&
                  normalizeBimestre(s.bimestre) === normalizeBimestre(selectedBimestre)
                ).length;
                return (
                  <option key={d} value={d}>
                    {DISCIPLINE_LABELS[d]} ({count} itens)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="w-48">
            <label className="label">Bimestre</label>
            <select
              className="input-field font-semibold text-slate-700"
              value={selectedBimestre}
              onChange={e => setSelectedBimestre(e.target.value as Bimestre)}
            >
              <option value="1 Bimestre">1º Bimestre</option>
              <option value="2 Bimestre">2º Bimestre</option>
              <option value="3 Bimestre">3º Bimestre</option>
              <option value="4 Bimestre">4º Bimestre</option>
            </select>
          </div>

          <div className="flex-1 min-w-[220px]">
            <label className="label">Buscar na Matriz</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                className="input-field pl-9"
                placeholder="Buscar código, conteúdo ou texto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Categorized Skills List */}
        <div className="space-y-4">
          {filteredSkills.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-600">
                Nenhum item encontrado para {DISCIPLINE_LABELS[selectedDiscipline]} no {selectedBimestre.replace('Bimestre', 'º Bimestre')}.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Envie o arquivo Word/PDF acima ou ajuste os filtros.
              </p>
            </div>
          ) : (
            filteredSkills.map((skill, index) => {
              const cardId = skill.id || index;
              const isExpanded = expandedCards[cardId] !== false; // default expanded

              return (
                <div
                  key={cardId}
                  className="border border-slate-200 rounded-xl bg-white shadow-sm hover:border-blue-300 transition-all overflow-hidden"
                >
                  {/* Card Header: Skill Code & Thematic Unit */}
                  <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="bg-blue-600 text-white text-xs font-mono font-bold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {skill.skillCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-500" />
                        {skill.thematicUnit}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleExpandCard(cardId)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                        title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => skill.id && handleDelete(skill.id)}
                        className="p-1 text-slate-300 hover:text-red-600 rounded transition-colors"
                        title="Excluir item da matriz"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 4 Categorized Sections */}
                  {isExpanded && (
                    <div className="p-4 space-y-3">
                      {/* Categoria 1: HABILIDADES */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wide">
                          <Target className="w-3.5 h-3.5" />
                          <span>1. Habilidade (BNCC / DC-GO):</span>
                        </div>
                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-sm text-slate-800 leading-relaxed font-medium">
                          {skill.skillDescription}
                        </div>
                      </div>

                      {/* Categoria 2: OBJETOS DE CONHECIMENTO / CONTEÚDO */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wide">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>2. Objetos de Conhecimento / Conteúdo:</span>
                        </div>
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 text-sm text-slate-700">
                          {skill.knowledgeObjects || <span className="italic text-slate-400">Geral da BNCC</span>}
                        </div>
                      </div>

                      {/* Categoria 3 & 4: METODOLOGIA & AVALIAÇÃO (Estrutura Pedagógica para Aulas) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* Categoria 3: Metodologia Sugerida */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 uppercase tracking-wide">
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span>3. Metodologia (Roteiro da Aula):</span>
                          </div>
                          <div className="bg-purple-50/40 border border-purple-100 rounded-lg p-2.5 text-xs text-slate-600 leading-relaxed space-y-1">
                            <p>• <strong>Acolhida & Sondagem:</strong> Roda de conversa e levantamento de saberes prévios.</p>
                            <p>• <strong>Desenvolvimento:</strong> Atividade prática, lúdica ou no livro didático.</p>
                            <p>• <strong>Registro:</strong> Sistematização no caderno e fechamento coletivo.</p>
                          </div>
                        </div>

                        {/* Categoria 4: Avaliação Formativa */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wide">
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>4. Avaliação (Critérios de Aprendizagem):</span>
                          </div>
                          <div className="bg-amber-50/40 border border-amber-100 rounded-lg p-2.5 text-xs text-slate-600 leading-relaxed space-y-1">
                            <p>• <strong>Observação Contínua:</strong> Participação, interação e interesse na temática.</p>
                            <p>• <strong>Produção:</strong> Registro individual/coletivo e compreensão dos conceitos.</p>
                            <p>• <strong>Diagnóstico:</strong> Acompanhamento formativo do desenvolvimento da criança.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
