import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Settings, Database, ChevronRight, ShieldCheck, LogOut } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getAuthSession, logoutAuthSession } from '../services/license';
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
                v1.0 Oficial
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">Alinhamento Curricular Qualificado • BNCC 2026</p>
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
              Sistema de Planejamento Docente Inteligente
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
