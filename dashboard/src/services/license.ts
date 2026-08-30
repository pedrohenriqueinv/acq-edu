/**
 * ACQ Edu — Serviço de Licenciamento & Autenticação
 * Alinhamento Curricular Qualificado • Sistema de Licenças Criptografadas
 */

export interface AuthSession {
  email: string;
  licenseKey: string;
  activatedAt: string; // ISO date
  expiresAt: string;   // ISO date
  planType: 'mensal' | 'trimestral' | 'anual' | 'vitalicio' | 'teste';
  teacherName?: string;
}

export interface UserAccount {
  email: string;
  passwordHash: string;
  createdAt: string;
}

const STORAGE_KEY = 'acq_edu_auth_session';
const USERS_STORAGE_KEY = 'acq_edu_registered_users';
const SECRET_SALT = 'ACQ_EDU_CRIPTO_SECURITY_MASTER_2026';

/**
 * Autentica o usuário com email e senha, ou registra o novo usuário no primeiro acesso com a chave
 */
export function authenticateUser(email: string, password: string): { success: boolean; isNewUser: boolean; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail) return { success: false, isNewUser: false, error: 'Digite seu e-mail.' };
  if (!cleanPassword || cleanPassword.length < 3) return { success: false, isNewUser: false, error: 'A senha deve ter pelo menos 3 caracteres.' };

  let users: Record<string, UserAccount> = {};
  try {
    const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (rawUsers) users = JSON.parse(rawUsers);
  } catch {}

  const existingUser = users[cleanEmail];

  if (existingUser) {
    if (existingUser.passwordHash !== cleanPassword) {
      return { success: false, isNewUser: false, error: 'Senha incorreta para este e-mail.' };
    }
    return { success: true, isNewUser: false };
  } else {
    // Registra a senha vinculada a este e-mail
    users[cleanEmail] = {
      email: cleanEmail,
      passwordHash: cleanPassword,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    return { success: true, isNewUser: true };
  }
}

/**
 * Gera um hash simples e seguro baseado em semente para validar chaves sem backend
 */
function generateHash(str: string): string {
  let hash = 0;
  const fullStr = str + SECRET_SALT;
  for (let i = 0; i < fullStr.length; i++) {
    const char = fullStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').substring(0, 4);
}

/**
 * Gera uma nova chave de licença válida
 */
export function generateLicenseKey(
  type: 'mensal' | 'trimestral' | 'anual' | 'teste',
  monthCode: string = 'AGO26'
): { key: string; expiresAt: Date; planName: string } {
  const randomBlock = Math.random().toString(36).substring(2, 6).toUpperCase();
  const base = `ACQ-${type.substring(0, 3).toUpperCase()}-${monthCode}-${randomBlock}`;
  const checksum = generateHash(base);
  const key = `${base}-${checksum}`;

  const now = new Date();
  const expiresAt = new Date();

  if (type === 'teste') {
    expiresAt.setDate(now.getDate() + 3);
  } else if (type === 'mensal') {
    expiresAt.setDate(now.getDate() + 32); // 32 dias de folga para o mês
  } else if (type === 'trimestral') {
    expiresAt.setDate(now.getDate() + 95);
  } else if (type === 'anual') {
    expiresAt.setFullYear(now.getFullYear() + 1);
  }

  const planName = {
    teste: 'Teste Gratuito (3 Dias)',
    mensal: 'Plano Mensal (30 Dias)',
    trimestral: 'Plano Bimestral/Trimestral (90 Dias)',
    anual: 'Plano Anual Letivo 2026',
  }[type];

  return { key, expiresAt, planName };
}

/**
 * Valida se uma chave digitada pelo usuário é legítima e calcula seu prazo de validade
 */
export function validateLicenseKey(rawKey: string): { isValid: boolean; expiresAt: Date | null; planType: AuthSession['planType']; error?: string } {
  if (!rawKey || !rawKey.trim()) {
    return { isValid: false, expiresAt: null, planType: 'mensal', error: 'Digite a chave de licença.' };
  }

  const clean = rawKey.trim().toUpperCase();

  // 1. Chaves Mestras Oficiais Cadastradas Estritas
  const MASTER_KEYS: Record<string, { planType: AuthSession['planType']; days: number }> = {
    'ACQ-DEMO-2026': { planType: 'anual', days: 365 },
    'ACQ-OFICIAL-2026': { planType: 'anual', days: 365 },
    'ACQ-PROFESSOR-PRO': { planType: 'anual', days: 365 },
  };

  if (MASTER_KEYS[clean]) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + MASTER_KEYS[clean].days);
    return { isValid: true, expiresAt, planType: MASTER_KEYS[clean].planType };
  }

  // 2. Chaves Criptográficas Geradas com Checksum (formato: ACQ-PLANO-MES-XXXX-CHECKSUM)
  const parts = clean.split('-');
  if (parts.length === 5 && parts[0] === 'ACQ') {
    const base = `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}`;
    const expectedChecksum = generateHash(base);
    const providedChecksum = parts[4];

    if (expectedChecksum !== providedChecksum) {
      return { isValid: false, expiresAt: null, planType: 'mensal', error: 'Chave de licença inválida ou com caractere incorreto.' };
    }

    const typeCode = parts[1].toLowerCase();
    const expiresAt = new Date();
    let planType: AuthSession['planType'] = 'mensal';

    if (typeCode === 'tes') {
      expiresAt.setDate(expiresAt.getDate() + 3);
      planType = 'teste';
    } else if (typeCode === 'tri') {
      expiresAt.setDate(expiresAt.getDate() + 95);
      planType = 'trimestral';
    } else if (typeCode === 'anu') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      planType = 'anual';
    } else {
      expiresAt.setDate(expiresAt.getDate() + 32);
      planType = 'mensal';
    }

    return { isValid: true, expiresAt, planType };
  }

  // Se não coincidir rigorosamente com nenhuma chave válida, REJEITA imediatamente!
  return { isValid: false, expiresAt: null, planType: 'mensal', error: 'Chave de licença incorreta ou inválida.' };
}

/**
 * Salva a sessão autenticada no navegador
 */
export function saveAuthSession(session: AuthSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/**
 * Obtém a sessão atual e verifica se ainda está dentro da validade
 */
export function getAuthSession(): { session: AuthSession | null; isValid: boolean; daysRemaining: number; isExpired: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { session: null, isValid: false, daysRemaining: 0, isExpired: false };

    const session: AuthSession = JSON.parse(raw);
    const now = new Date().getTime();
    const expires = new Date(session.expiresAt).getTime();

    const diffMs = expires - now;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isExpired = diffMs <= 0;

    return {
      session,
      isValid: !isExpired,
      daysRemaining,
      isExpired,
    };
  } catch {
    return { session: null, isValid: false, daysRemaining: 0, isExpired: false };
  }
}

/**
 * Desconecta e limpa a sessão
 */
export function logoutAuthSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
