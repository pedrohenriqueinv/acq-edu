import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, User, School, Key, BookOpen, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/useAppStore';
import { db } from '../db';
import type { Discipline } from '../types';

const ALL_DISCIPLINES: Discipline[] = [
  'Arte', 'Ciencias', 'Educacao Fisica', 'Ensino Religioso',
  'Geografia', 'Historia', 'Lingua Portuguesa', 'Matematica', 'Producao Textual'
];

export default function SetupPage() {
  const { config, updateConfig, loadConfig } = useAppStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    teacherName: '',
    schoolName: '',
    year: new Date().getFullYear(),
    shift: 'MATUTINO',
    grade: '1º ANO',
    classGroup: 'A',
    geminiApiKey: '',
    disciplines: [...ALL_DISCIPLINES] as Discipline[],
  });

  useEffect(() => {
    if (config) {
      setForm({
        teacherName: config.teacherName || '',
        schoolName: config.schoolName || '',
        year: config.year || new Date().getFullYear(),
        shift: config.shift || 'MATUTINO',
        grade: config.grade || '1º ANO',
        classGroup: config.classGroup || 'A',
        geminiApiKey: config.geminiApiKey || '',
        disciplines: config.disciplines || [...ALL_DISCIPLINES],
      });
    }
  }, [config]);

  const toggleDiscipline = (d: Discipline) => {
    setForm(f => ({
      ...f,
      disciplines: f.disciplines.includes(d)
        ? f.disciplines.filter(x => x !== d)
        : [...f.disciplines, d]
    }));
  };

  const handleSave = async () => {
    if (!form.teacherName.trim()) return toast.error('Informe o nome da professora.');
    if (!form.schoolName.trim()) return toast.error('Informe o nome da escola.');
    if (!form.geminiApiKey.trim()) return toast.error('Informe a chave de API do Google Gemini.');
    if (form.disciplines.length === 0) return toast.error('Selecione ao menos uma disciplina.');

    setIsSaving(true);
    try {
      await updateConfig(form);
      await loadConfig();
      toast.success('Configurações salvas com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configurações</h2>
        <p className="text-slate-500 mt-1">Dados da professora e configuração da IA</p>
      </div>

      {/* Teacher Info Card */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-700">Dados da Professora</h3>
        </div>

        <div>
          <label className="label">Nome completo da professora</label>
          <input
            className="input-field"
            value={form.teacherName}
            onChange={e => setForm(f => ({ ...f, teacherName: e.target.value }))}
            placeholder="Ex: Profª. Maria Silva"
          />
        </div>

        <div>
          <label className="label">Nome da escola</label>
          <input
            className="input-field"
            value={form.schoolName}
            onChange={e => setForm(f => ({ ...f, schoolName: e.target.value }))}
            placeholder="Ex: Escola Municipal..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Ano Letivo</label>
            <input
              type="number"
              className="input-field"
              value={form.year}
              onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="label">Turno</label>
            <select
              className="input-field"
              value={form.shift}
              onChange={e => setForm(f => ({ ...f, shift: e.target.value }))}
            >
              <option>MATUTINO</option>
              <option>VESPERTINO</option>
              <option>NOTURNO</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Período / Ano</label>
            <select
              className="input-field"
              value={form.grade}
              onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
            >
              {['1º ANO', '2º ANO', '3º ANO', '4º ANO', '5º ANO'].map(g => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Turma</label>
            <input
              className="input-field"
              value={form.classGroup}
              onChange={e => setForm(f => ({ ...f, classGroup: e.target.value }))}
              placeholder="A"
            />
          </div>
        </div>
      </div>

      {/* Disciplines Card */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-700">Disciplinas que leciona</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_DISCIPLINES.map(d => (
            <button
              key={d}
              onClick={() => toggleDiscipline(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                form.disciplines.includes(d)
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
              }`}
            >
              {form.disciplines.includes(d) && <CheckCircle className="w-3.5 h-3.5 inline mr-1" />}
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* API Key Card */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-700">Chave de API — Google Gemini</h3>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 space-y-2">
          <p className="font-medium">Como obter sua chave gratuita:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-600">
            <li>Acesse <strong>aistudio.google.com/apikey</strong></li>
            <li>Clique em <strong>"Create API Key"</strong></li>
            <li>Copie a chave gerada e cole aqui abaixo</li>
          </ol>
          <p className="text-xs text-blue-500">A chave gratuita suporta até 1.500 requisições por dia — mais do que suficiente.</p>
        </div>
        <div className="relative">
          <label className="label">Chave de API do Gemini</label>
          <input
            type={showApiKey ? 'text' : 'password'}
            className="input-field pr-12"
            value={form.geminiApiKey}
            onChange={e => setForm(f => ({ ...f, geminiApiKey: e.target.value }))}
            placeholder="AIza..."
          />
          <button
            type="button"
            className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
            onClick={() => setShowApiKey(!showApiKey)}
          >
            {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              if (!form.geminiApiKey.trim()) return toast.error('Digite a chave de API primeiro.');
              toast.loading('Testando conexão com a API do Gemini...', { id: 'test-api' });
              try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${form.geminiApiKey.trim()}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error.message);
                const count = data.models?.length || 0;
                toast.success(`Conexão OK! ${count} modelos disponíveis na sua chave.`, { id: 'test-api' });
              } catch (err: any) {
                toast.error(`Falha no teste: ${err.message}`, { id: 'test-api' });
              }
            }}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5"
          >
            ⚡ Testar Chave de API
          </button>
        </div>
        <p className="text-xs text-slate-400">
          🔒 Sua chave é armazenada <strong>apenas no seu computador</strong>, nunca enviada para servidores externos.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base shadow-md hover:scale-101 transition-all"
      >
        <Save className="w-5 h-5" />
        {isSaving ? 'Salvando...' : 'Salvar Configurações'}
      </button>

      {/* Danger Zone: Reset Completo */}
      <div className="card border-red-200 bg-red-50/40 space-y-3">
        <div className="flex items-center gap-2 text-red-800">
          <Trash2 className="w-5 h-5 text-red-600" />
          <h3 className="font-bold text-sm">Zona de Reset — Zerar Dados</h3>
        </div>
        <p className="text-xs text-red-600 leading-relaxed">
          Esta ação apaga <strong>todas as aulas da grade</strong>, <strong>todos os itens da matriz curricular</strong> e <strong>os registros locais</strong> para que você possa recomeçar do zero.
        </p>
        <button
          type="button"
          onClick={async () => {
            if (confirm('ATENÇÃO: Isso vai apagar TODAS as aulas cadastradas, a matriz curricular e o histórico. Deseja realmente zerar tudo?')) {
              await db.lessons.clear();
              await db.matrix.clear();
              await db.syncLog.clear();
              toast.success('Todos os dados foram zerados com sucesso!');
              setTimeout(() => { window.location.href = '/matriz'; }, 600);
            }
          }}
          className="btn-danger text-xs flex items-center gap-1.5 py-2 px-4 shadow-xs hover:bg-red-700"
        >
          <Trash2 className="w-4 h-4" />
          <span>🗑️ Zerar Todos os Dados do Sistema (Reset Geral)</span>
        </button>
      </div>
    </div>
  );
}
