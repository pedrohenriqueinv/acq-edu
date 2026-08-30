import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Settings, Database, ChevronRight, ShieldCheck, LogOut, Sparkles, Key, ExternalLink } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getAuthSession, logoutAuthSession, generateLicenseKey } from '../services/license';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/calendario', icon: Calendar, label: 'Grade Mensal', desc: 'Aulas e Matriz' },
  { to: '/matriz', icon: Database, label: 'Matriz Curricular', desc: 'Habilidades BNCC' },
  { to: '/configuracao', icon: Settings, label: 'Configurações', desc: 'Dados da professora' },
];

export default function Layout() {
  const { config } = useAppStore();
  const navigate = useNavigate();

  const [authStatus, setAuthStatus] = useState(() => getAuthSession());
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ key: string; expiresAt: Date; planName: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'teste' | 'mensal' | 'trimestral' | 'anual'>('mensal');
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    const status = getAuthSession();
    setAuthStatus(status);
  }, []);

  const handleLogout = () => {
    if (confirm('Deseja realmente sair da sua conta do ACQ Edu?')) {
      logoutAuthSession();
      toast.success('Desconectado com sucesso.');
      window.location.reload();
    }
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'aline2026' || adminPassword === 'acq2026' || adminPassword === 'admin') {
      setIsAdminAuthenticated(true);
      const initial = generateLicenseKey('mensal', 'AGO26');
      setGeneratedKey(initial);
      toast.success('Painel Administrador Desbloqueado!');
    } else {
      toast.error('Senha incorreta.');
    }
  };

  const handleGenerateKey = () => {
    const keyData = generateLicenseKey(selectedPlan, 'AGO26');
    setGeneratedKey(keyData);
    setCopiedKey(false);
    toast.success(`Chave gerada: ${keyData.planName}`);
  };

  const handleCopyWhatsApp = () => {
    if (!generatedKey) return;
    const msg = `Olá Professora! Seu acesso ao *ACQ Edu* (Alinhamento Curricular Qualificado) está liberado! 🚀\n\n🔑 *Sua Chave de Acesso:* ${generatedKey.key}\n📅 *Plano:* ${generatedKey.planName}\n⏳ *Validade:* até ${generatedKey.expiresAt.toLocaleDateString('pt-BR')}\n\n👉 Acesse o sistema pelo link: https://gemul-professor.vercel.app\n\nBom planejamento! 📚✨`;
    navigator.clipboard.writeText(msg);
    toast.success('Mensagem de WhatsApp copiada!');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 h-16 sticky top-0 z-40 shadow-xs flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ACQ Edu Logo" className="w-10 h-10 object-contain rounded-xl shadow-xs" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#00236f] tracking-tight">ACQ Edu</span>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full border border-blue-200">
                v2.0 Oficial
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">Alinhamento Curricular Qualificado • SEMED Anápolis</p>
          </div>
        </div>

        {/* License status & actions */}
        <div className="flex items-center gap-3">
          {authStatus.session && (
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-medium shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Licença Ativa: <strong>{authStatus.daysRemaining} dias restantes</strong></span>
            </div>
          )}

          {/* Admin generator button */}
          <button
            type="button"
            onClick={() => setShowAdminModal(true)}
            title="Painel do Administrador (Gerar Chaves)"
            className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-2.5 text-slate-600 hover:text-[#00236f]"
          >
            <Key className="w-3.5 h-3.5 text-[#00236f]" />
            <span className="hidden md:inline">Gerar Licença</span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            title="Sair da Conta"
            className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-xs">
          {/* Teacher Info Card */}
          {config ? (
            <div className="p-4 border-b border-slate-100">
              <div className="bg-[#eff4ff] border border-blue-100 p-3 rounded-xl">
                <p className="text-xs font-bold text-[#00236f] truncate">{config.teacherName}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{config.schoolName}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-600 font-semibold">
                  <span>{config.grade} {config.classGroup}</span>
                  <span>•</span>
                  <span>{config.shift}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map(({ to, icon: Icon, label, desc }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-[#00236f] text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-[#00236f]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#00236f]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${isActive ? 'text-white' : ''}`}>{label}</p>
                      <p className={`text-xs truncate ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>{desc}</p>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 text-blue-200 flex-shrink-0" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer Tribute */}
          <div className="p-4 border-t border-slate-100 space-y-1 text-center">
            <img src="/logo.png" alt="ACQ Edu" className="w-10 h-10 object-contain mx-auto mb-1 rounded-xl shadow-2xs" />
            <div className="flex items-center justify-center gap-1 text-xs font-bold text-[#00236f]">
              <span>ACQ Edu • 2026</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Homenagem à Professora <strong>Aline Cristina Qualto</strong>
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* MODAL: Painel do Administrador (Gerador de Chaves de Licença) */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#00236f]">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-base">Gerador de Licenças — ACQ Edu</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {!isAdminAuthenticated ? (
              <form onSubmit={handleAdminAuth} className="space-y-4 py-4">
                <p className="text-xs text-slate-600">
                  Digite sua senha mestra de administrador para emitir chaves para suas clientes:
                </p>
                <div>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Senha de Administrador"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Dica: <code>aline2026</code> ou <code>acq2026</code></p>
                </div>
                <button type="submit" className="btn-primary w-full text-xs py-2.5">
                  Desbloquear Gerador
                </button>
              </form>
            ) : (
              <div className="space-y-4 py-4">
                <div>
                  <label className="label text-xs">Selecione o Período da Chave:</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {(['teste', 'mensal', 'trimestral', 'anual'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedPlan(p)}
                        className={`text-xs py-2 px-3 rounded-lg border font-medium transition-all ${
                          selectedPlan === p
                            ? 'bg-[#00236f] text-white border-[#00236f] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {p === 'teste' && 'Teste (3 Dias)'}
                        {p === 'mensal' && 'Mensal (30 Dias)'}
                        {p === 'trimestral' && 'Bimestral (90 Dias)'}
                        {p === 'anual' && 'Anual (1 Ano)'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateKey}
                  className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Emitir Chave Criptografada</span>
                </button>

                {generatedKey && (
                  <div className="bg-[#eff4ff] border border-blue-200 rounded-xl p-4 space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Chave Emitida:</span>
                      <div className="font-mono text-sm font-bold text-[#00236f] bg-white p-2.5 rounded-lg border border-blue-100 select-all mt-1 flex items-center justify-between">
                        <span>{generatedKey.key}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedKey.key);
                            setCopiedKey(true);
                            toast.success('Chave copiada!');
                            setTimeout(() => setCopiedKey(false), 2000);
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-blue-700 space-y-0.5">
                      <p>• <strong>Plano:</strong> {generatedKey.planName}</p>
                      <p>• <strong>Válido até:</strong> {generatedKey.expiresAt.toLocaleDateString('pt-BR')}</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyWhatsApp}
                      className="btn-success w-full text-xs py-2 flex items-center justify-center gap-1.5"
                    >
                      <span>Copiar Mensagem para WhatsApp</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
