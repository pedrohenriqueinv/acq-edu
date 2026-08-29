# 🎓 GEMUL Professor — Ecossistema Híbrido de Planejamento Docente

Sistema completo para professores da rede municipal de Anápolis-GO para automatizar
o preenchimento do planejamento de aulas no sistema GEMUL.

---

## 📦 Estrutura do Projeto

```
gemul-professor/
├── dashboard/      ← Aplicação Web React (plataforma principal)
└── extension/      ← Extensão Chrome (injetor no GEMUL)
```

---

## 🚀 Parte 1 — Iniciar o Dashboard Web

### Pré-requisitos
- **Node.js 18+** instalado: https://nodejs.org

### Passos

```bash
# 1. Acesse a pasta do dashboard
cd dashboard

# 2. Instale as dependências (apenas na primeira vez)
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

O navegador abrirá automaticamente em **http://localhost:5173**

### Primeiro Acesso
1. Clique em **"Configurações"** no menu lateral
2. Preencha: Nome da professora, Escola, Turno, Ano/Turma
3. Cole sua **Chave de API do Google Gemini** (veja como obter abaixo)
4. Selecione as disciplinas que leciona
5. Clique em **"Salvar Configurações"**

### Como Obter a Chave de API Gratuita (Gemini)
1. Acesse: **https://aistudio.google.com/apikey**
2. Faça login com sua conta Google
3. Clique em **"Create API Key"**
4. Copie a chave gerada (começa com `AIza...`)
5. Cole na tela de Configurações do Dashboard

---

## 🔌 Parte 2 — Instalar a Extensão no Chrome

### Passos

1. Abra o Google Chrome
2. Digite na barra de endereço: **`chrome://extensions`**
3. No canto superior direito, ative o **"Modo desenvolvedor"** (toggle)
4. Clique em **"Carregar sem compactação"** (Load unpacked)
5. Navegue até a pasta: `C:\Users\aline\.gemini\antigravity\scratch\gemul-professor\extension`
6. Clique em **"Selecionar Pasta"**
7. A extensão **"GEMUL Professor"** aparecerá na lista ✅

---

## 📋 Como Usar — Fluxo Completo

### 1️⃣ Configurar (uma vez)
- Dashboard → Configurações → Preencher dados e chave API

### 2️⃣ Carregar Habilidades BNCC
- Dashboard → Matriz Curricular → "Carregar Habilidades BNCC (1º Ano)"

### 3️⃣ Criar as Aulas do Mês
- Dashboard → Grade Mensal → Selecionar Mês/Ano → "Criar Aulas do Mês"

### 4️⃣ Gerar Planejamentos com IA
- Dashboard → Grade Mensal → "Gerar Mês com IA"
- Aguardar (barra de progresso mostra aula por aula)
- A IA gera: Habilidades, Conteúdo, Metodologia e Avaliação para cada aula

### 5️⃣ Revisar e Editar
- Clique em qualquer aula na grade para abrir o editor
- Revise, edite ou peça para a IA regenerar campo por campo
- Marque como "Revisada" quando estiver satisfeita

### 6️⃣ Exportar PDF/Excel (para a Coordenação)
- Dashboard → Grade Mensal → "Exportar PDF" ou "Exportar Excel"

### 7️⃣ Enviar para o GEMUL (Preenchimento Automático)
- Dashboard → Grade Mensal → "Exportar JSON (Extensão)"
- Salvar o arquivo `.json`
- No ícone da extensão no Chrome → "Importar JSON do Dashboard"
- Abrir o GEMUL: https://gemul-anapolis.com.br
- Na página de Acompanhamento, aparecerá o widget flutuante 🎓
- Clicar em **"🚀 Piloto Automático"**
- Aguardar o preenchimento automático de todas as aulas!

---

## 🛡️ Mecanismos de Segurança

| Situação | O que acontece |
|---|---|
| Internet cair | Todos os dados ficam salvos no IndexedDB local |
| Sessão do GEMUL expirar | Piloto Automático pausa automaticamente com alerta |
| Caracteres especiais | Sanitizador remove automaticamente antes de enviar |
| Servidor lento | Delay de 800-1500ms entre cada ação (comportamento humano) |
| Texto muito longo | Contadores visuais de caracteres + aviso antes do envio |

---

## ⚙️ Comandos Úteis

```bash
# Desenvolvimento (com hot-reload)
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

---

## 📞 Suporte

Este software foi desenvolvido especialmente para professores da rede municipal de Anápolis-GO.
Sistema baseado nas diretrizes da BNCC e do Documento Curricular de Goiás (DC-GO).
