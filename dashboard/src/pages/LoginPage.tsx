import { useState } from 'react';
import { Mail, Lock, Key, Info, ArrowRight, ShieldCheck, HelpCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { validateLicenseKey, saveAuthSession, authenticateUser } from '../services/license';

interface LoginPageProps {
  onSuccess: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return toast.error('Digite seu e-mail.');
    if (!password.trim()) return toast.error('Digite sua senha.');
    if (!licenseKey.trim()) return toast.error('Digite sua chave de licença.');

    setIsLoading(true);

    // 1. Valida senha vinculada ao e-mail
    const authResult = authenticateUser(email, password);
    if (!authResult.success) {
      setIsLoading(false);
      return toast.error(authResult.error || 'Senha incorreta para este e-mail.');
    }

    // 2. Valida chave de licença
    const validation = validateLicenseKey(licenseKey);

    if (!validation.isValid || !validation.expiresAt) {
      setIsLoading(false);
      return toast.error(validation.error || 'Chave de licença inválida ou expirada.');
    }

    // Salva a sessão autenticada com o prazo de validade da chave
    saveAuthSession({
      email: email.trim().toLowerCase(),
      licenseKey: licenseKey.trim().toUpperCase(),
      activatedAt: new Date().toISOString(),
      expiresAt: validation.expiresAt.toISOString(),
      planType: validation.planType,
    });

    toast.success(`🎉 Acesso liberado com sucesso! Plano: ${validation.planType.toUpperCase()}`);
    
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0d1c2f] flex flex-col font-sans selection:bg-blue-100">
      {/* TopAppBar */}
      <header className="bg-[#f8f9ff] fixed top-0 w-full border-b border-[#c5c5d3]/40 shadow-xs z-50 transition-colors duration-200">
        <div className="flex justify-between items-center h-16 px-4 md:px-10 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="ACQ Edu Logo" className="w-10 h-10 object-contain rounded-xl shadow-xs" />
            <div>
              <span className="text-xl font-bold tracking-tight text-[#00236f]">ACQ Edu</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500">• Alinhamento Curricular Qualificado</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="text-sm font-medium text-slate-600 hover:text-[#00236f] flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-slate-100 transition-colors duration-200"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Ajuda / Suporte</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4 md:px-10">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,35,111,0.06)] border border-[#eff4ff] p-8 md:p-10 transition-all">
            {/* Card Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-3">
                <img src="/logo.png" alt="ACQ Edu Logo" className="w-24 h-24 object-contain drop-shadow-sm rounded-2xl" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0d1c2f] mb-1.5">Bem-vindo</h1>
              <p className="text-sm text-slate-600">Acesse sua conta do <strong>ACQ Edu</strong>.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="email">
                  E-mail
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#00236f] focus:ring-2 focus:ring-[#00236f]/20 focus:outline-none transition-all"
                    id="email"
                    name="email"
                    placeholder="seu@email.com"
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="password">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => toast('Entre em contato pelo WhatsApp com o administrador para redefinir sua senha.', { icon: '🔑' })}
                    className="text-xs font-medium text-[#00236f] hover:underline transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#00236f] focus:ring-2 focus:ring-[#00236f]/20 focus:outline-none transition-all"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* License Key Field */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="license">
                    Chave de Licença
                  </label>
                  <span
                    className="text-slate-400 hover:text-[#00236f] cursor-help transition-colors"
                    title="Insira a chave fornecida pelo administrador para ativar o seu acesso mensal ou anual."
                  >
                    <Info className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#00236f] pointer-events-none">
                    <Key className="w-4 h-4 text-[#00236f]" />
                  </span>
                  <input
                    className="w-full pl-10 pr-4 py-2.5 bg-[#eff4ff] border border-blue-200 rounded-lg text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:border-[#00236f] focus:ring-2 focus:ring-[#00236f]/20 focus:outline-none transition-all tracking-wider"
                    id="license"
                    name="license"
                    placeholder="ACQ-MEN-AGO26-XXXX"
                    required
                    type="text"
                    value={licenseKey}
                    onChange={e => setLicenseKey(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-slate-500">Necessário para ativação inicial.</p>
                  <button
                    type="button"
                    onClick={() => setLicenseKey('ACQ-DEMO-2026')}
                    className="text-[11px] text-blue-600 hover:underline font-medium"
                  >
                    Usar Chave de Teste Demo
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                className="w-full bg-[#00236f] hover:bg-[#1e3a8a] text-white font-medium text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 hover:scale-[1.01]"
                type="submit"
                disabled={isLoading}
              >
                <span>{isLoading ? 'Verificando Licença...' : 'Entrar no Sistema'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-8 text-center border-t border-slate-100 pt-6">
              <p className="text-sm text-slate-600">
                Ainda não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    const phone = '5562999999999'; // Substitua pelo seu número
                    const text = encodeURIComponent('Olá! Gostaria de solicitar minha chave de acesso ao ACQ Edu para planejamento docente.');
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                  }}
                  className="text-[#00236f] hover:underline font-bold transition-colors inline-flex items-center gap-0.5"
                >
                  <span>Solicitar Acesso</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#eff4ff] w-full py-6 border-t border-slate-200 transition-all duration-300 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-4 md:px-10 gap-3 max-w-7xl mx-auto">
          <div className="text-xs font-bold text-[#00236f]">ACQ Edu • Alinhamento Curricular Qualificado</div>
          <div className="text-xs text-slate-500 text-center md:text-left">
            © 2026 ACQ Edu • Alinhamento Curricular Qualificado. Todos os direitos reservados.
          </div>
          <nav className="flex gap-4">
            <button type="button" onClick={() => toast('Termos de Privacidade: Seus dados permanecem 100% salvos no seu próprio navegador de forma segura.')} className="text-xs text-slate-500 hover:text-[#00236f] hover:underline">
              Privacidade
            </button>
            <button type="button" onClick={() => toast('Termos de Uso: Licença individual para uso docente no GEMUL.')} className="text-xs text-slate-500 hover:text-[#00236f] hover:underline">
              Termos de Uso
            </button>
            <button type="button" onClick={() => setShowHelpModal(true)} className="text-xs text-slate-500 hover:text-[#00236f] hover:underline">
              Suporte
            </button>
          </nav>
        </div>
      </footer>

      {/* MODAL: Ajuda & Suporte */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#00236f]">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-bold text-base">Ajuda & Suporte ACQ Edu</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 py-4 text-xs text-slate-600 leading-relaxed">
              <p>
                O <strong>ACQ Edu</strong> é o ecossistema de planejamento docente alinhado à BNCC e Diretrizes Curriculares Nacionais.
              </p>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <p className="font-semibold text-slate-800">Como funciona o acesso?</p>
                <p>1. O acesso é liberado por meio de uma <strong>Chave de Licença</strong> mensal ou anual.</p>
                <p>2. Seus dados de planejamento ficam salvos com segurança no seu próprio navegador.</p>
                <p>3. Para renovar seu plano ou solicitar uma chave, fale diretamente com o suporte.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const text = encodeURIComponent('Olá! Preciso de ajuda com meu acesso ao ACQ Edu.');
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
                className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <span>Falar com Suporte via WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
