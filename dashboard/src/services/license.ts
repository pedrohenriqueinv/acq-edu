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

const STORAGE_KEY = 'acq_edu_auth_session';
const SECRET_SALT = 'ACQ_EDU_ALINE_CRISTINA_QUALTO_2026';

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
  if (!rawKey) return { isValid: false, expiresAt: null, planType: 'mensal', error: 'Digite a chave de licença.' };

  const clean = rawKey.trim().toUpperCase();

  // Chaves Mestras de Demonstração e Teste
  if (clean === 'ACQ-DEMO-2026' || clean === 'ACQ-ALINE-2026' || clean === 'ACQ-PROFESSOR-PRO') {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    return { isValid: true, expiresAt, planType: 'anual' };
  }

  const parts = clean.split('-');
  if (parts.length !== 5 && parts.length !== 4) {
    // Aceita formato padrão ACQ-MEN-AGO26-XXXX-YYYY ou ACQ-XXXX-XXXX-XXXX
    if (clean.startsWith('ACQ-')) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      return { isValid: true, expiresAt, planType: 'mensal' };
    }
    return { isValid: false, expiresAt: null, planType: 'mensal', error: 'Formato de chave inválido. Exemplo: ACQ-MEN-AGO26-9F82-K4L1' };
  }

  // Verifica checksum se for chave gerada pelo algoritmo
  if (parts.length === 5) {
    const base = `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}`;
    const expectedChecksum = generateHash(base);
    const providedChecksum = parts[4];

    if (expectedChecksum !== providedChecksum) {
      return { isValid: false, expiresAt: null, planType: 'mensal', error: 'Chave de licença inválida ou incorreta.' };
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

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return { isValid: true, expiresAt, planType: 'mensal' };
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
