import type { Discipline, Bimestre, MatrixSkill } from '../types';

// Banco de habilidades oficiais BNCC 2026 para 1º Ano do Ensino Fundamental
// Completo para todos os 4 bimestres e todas as 9 disciplinas
export const BNCC_1ANO: Omit<MatrixSkill, 'id' | 'createdAt'>[] = [

  // ─── ARTE ───────────────────────────────────────────────────────────────────
  {
    discipline: 'Arte',
    bimestre: '1 Bimestre',
    thematicUnit: 'Artes Visuais',
    skillCode: 'EF15AR01',
    skillDescription: 'EF15AR01 - Identificar e apreciar formas distintas das artes visuais tradicionais e contemporâneas, cultivando a percepção e o repertório imagético.',
    knowledgeObjects: 'Contextos e práticas visuais: ponto, linha, cores primárias, formas geométricas e texturas básicas.'
  },
  {
    discipline: 'Arte',
    bimestre: '2 Bimestre',
    thematicUnit: 'Artes Visuais & Dança',
    skillCode: 'EF15AR02',
    skillDescription: 'EF15AR02 - Explorar e reconhecer elementos constitutivos das artes visuais e movimentos corporais.',
    knowledgeObjects: 'Elementos da linguagem: cores secundárias, bidimensionalidade, tridimensionalidade e expressão plástica.'
  },
  {
    discipline: 'Arte',
    bimestre: '3 Bimestre',
    thematicUnit: 'Música',
    skillCode: 'EF15AR13',
    skillDescription: 'EF15AR13 - Identificar e apreciar criticamente diversas formas e gêneros de expressão musical e ritmos brasileiros.',
    knowledgeObjects: 'Sons do ambiente, sons do corpo e silêncio. Altura, intensidade, timbre, pulso e ritmo.'
  },
  {
    discipline: 'Arte',
    bimestre: '4 Bimestre',
    thematicUnit: 'Teatro',
    skillCode: 'EF15AR19',
    skillDescription: 'EF15AR19 - Descobrir teatralidades na vida cotidiana, identificando personagens, ações e encenações dramáticas.',
    knowledgeObjects: 'Jogos teatrais, dramatização, expressão corporal, máscaras, fantoches e contação cênica.'
  },

  // ─── CIÊNCIAS ───────────────────────────────────────────────────────────────
  {
    discipline: 'Ciencias',
    bimestre: '1 Bimestre',
    thematicUnit: 'Matéria e Energia',
    skillCode: 'EF01CI01',
    skillDescription: 'EF01CI01 - Comparar características de diferentes materiais presentes em objetos de uso cotidiano e suas propriedades.',
    knowledgeObjects: 'Propriedades dos materiais (plástico, madeira, vidro, metal, papel) e consumo consciente.'
  },
  {
    discipline: 'Ciencias',
    bimestre: '2 Bimestre',
    thematicUnit: 'Vida e Evolução',
    skillCode: 'EF01CI03',
    skillDescription: 'EF01CI03 - Discutir as razões pelas quais os hábitos de higiene do corpo são necessários para a manutenção da saúde.',
    knowledgeObjects: 'Corpo humano, hábitos de higiene pessoal, saúde bucal e alimentação saudável balanceada.'
  },
  {
    discipline: 'Ciencias',
    bimestre: '3 Bimestre',
    thematicUnit: 'Vida e Evolução',
    skillCode: 'EF01CI04',
    skillDescription: 'EF01CI04 - Comparar características físicas entre os seres vivos, valorizando a diversidade e os ecossistemas.',
    knowledgeObjects: 'Diversidade dos animais e plantas: habitat, alimentação, locomoção e cobertura do corpo.'
  },
  {
    discipline: 'Ciencias',
    bimestre: '4 Bimestre',
    thematicUnit: 'Terra e Universo',
    skillCode: 'EF01CI05',
    skillDescription: 'EF01CI05 - Identificar e nomear diferentes escalas de tempo, os ciclos do dia, estações do ano e o céu.',
    knowledgeObjects: 'Ciclos naturais: dia e noite, estações do ano, influência do sol e da chuva nas atividades humanas.'
  },

  // ─── EDUCAÇÃO FÍSICA ────────────────────────────────────────────────────────
  {
    discipline: 'Educacao Fisica',
    bimestre: '1 Bimestre',
    thematicUnit: 'Brincadeiras e Jogos',
    skillCode: 'EF01EF01',
    skillDescription: 'EF01EF01 - Experimentar, fruir e recriar diferentes brincadeiras e jogos da cultura popular e tradicional.',
    knowledgeObjects: 'Brincadeiras e jogos populares da cultura comunitária (amarelinha, cirandas, pega-pega).'
  },
  {
    discipline: 'Educacao Fisica',
    bimestre: '2 Bimestre',
    thematicUnit: 'Ginástica Geral',
    skillCode: 'EF01EF07',
    skillDescription: 'EF01EF07 - Experimentar e fruir diferentes formas de equilíbrio, coordenação motora e consciência corporal.',
    knowledgeObjects: 'Ginástica geral: saltar, rolar, equilibrar, rastejar e controle do tônus muscular.'
  },
  {
    discipline: 'Educacao Fisica',
    bimestre: '3 Bimestre',
    thematicUnit: 'Danças e Expressão',
    skillCode: 'EF01EF11',
    skillDescription: 'EF01EF11 - Experimentar e fruir danças circulares e manifestações folclóricas rítmicas.',
    knowledgeObjects: 'Danças populares, ritmos corporais, cirandas de roda e coordenação visomotora.'
  },
  {
    discipline: 'Educacao Fisica',
    bimestre: '4 Bimestre',
    thematicUnit: 'Jogos Coletivos e Cooperação',
    skillCode: 'EF01EF03',
    skillDescription: 'EF01EF03 - Participar de atividades corporais cooperativas com respeito às regras e inclusão.',
    knowledgeObjects: 'Jogos cooperativos adaptados, trabalho em equipe, respeito às diferenças e limites individuais.'
  },

  // ─── ENSINO RELIGIOSO ───────────────────────────────────────────────────────
  {
    discipline: 'Ensino Religioso',
    bimestre: '1 Bimestre',
    thematicUnit: 'Identidades e Alteridades',
    skillCode: 'EF01ER01',
    skillDescription: 'EF01ER01 - Identificar os modos de ser e viver de diferentes sujeitos, reconhecendo a identidade pessoal e coletiva.',
    knowledgeObjects: 'Acolhimento, identidade, respeito à família, à escola e aos sentimentos dos colegas.'
  },
  {
    discipline: 'Ensino Religioso',
    bimestre: '2 Bimestre',
    thematicUnit: 'Manifestações Religiosas e Culturais',
    skillCode: 'EF01ER05',
    skillDescription: 'EF01ER05 - Identificar símbolos e manifestações de respeito presentes em diferentes culturas e tradições.',
    knowledgeObjects: 'Símbolos de paz, festividades culturais e valores universais de solidariedade e partilha.'
  },
  {
    discipline: 'Ensino Religioso',
    bimestre: '3 Bimestre',
    thematicUnit: 'Crenças e Filosofias de Vida',
    skillCode: 'EF01ER09',
    skillDescription: 'EF01ER09 - Reconhecer que existem diferentes crenças e costumes que orientam as pessoas na convivência.',
    knowledgeObjects: 'Diversidade cultural, empatia, diálogo respeitoso e superação de conflitos no dia a dia.'
  },
  {
    discipline: 'Ensino Religioso',
    bimestre: '4 Bimestre',
    thematicUnit: 'Natureza e Transcendência',
    skillCode: 'EF01ER10',
    skillDescription: 'EF01ER10 - Perceber como o cuidado com o próximo e com a natureza expressam valores de amor e espiritualidade.',
    knowledgeObjects: 'Cuidado com a vida, gratidão, proteção aos animais e responsabilidade ecológica.'
  },

  // ─── GEOGRAFIA ──────────────────────────────────────────────────────────────
  {
    discipline: 'Geografia',
    bimestre: '1 Bimestre',
    thematicUnit: 'O sujeito e seu lugar no mundo',
    skillCode: 'EF01GE01',
    skillDescription: 'EF01GE01 - Descrever características observadas de seus lugares de vivência (moradia, sala de aula e escola).',
    knowledgeObjects: 'O espaço escolar, a moradia, pontos de referência e relações de vizinhança.'
  },
  {
    discipline: 'Geografia',
    bimestre: '2 Bimestre',
    thematicUnit: 'Conexões e Escalas',
    skillCode: 'EF01GE04',
    skillDescription: 'EF01GE04 - Reconhecer semelhanças e diferenças nos modos de viver de pessoas em diferentes lugares.',
    knowledgeObjects: 'Paisagens naturais e construídas: o espaço urbano (cidade) e o espaço rural (campo).'
  },
  {
    discipline: 'Geografia',
    bimestre: '3 Bimestre',
    thematicUnit: 'Mundo do Trabalho',
    skillCode: 'EF01GE05',
    skillDescription: 'EF01GE05 - Identificar e descrever os tipos de trabalho e serviços existentes na escola e no bairro.',
    knowledgeObjects: 'Profissões da comunidade escolar, serviços públicos e interdependência entre os espaços.'
  },
  {
    discipline: 'Geografia',
    bimestre: '4 Bimestre',
    thematicUnit: 'Formas de Representação Espacial',
    skillCode: 'EF01GE07',
    skillDescription: 'EF01GE07 - Elaborar e utilizar representações espaciais simples (maquetes, plantas e desenhos).',
    knowledgeObjects: 'Lateralidade (direita/esquerda), noções de proporção, mapas afetivos e trajetos cotidianos.'
  },

  // ─── HISTÓRIA ───────────────────────────────────────────────────────────────
  {
    discipline: 'Historia',
    bimestre: '1 Bimestre',
    thematicUnit: 'Mundo Pessoal: Meu Lugar no Mundo',
    skillCode: 'EF01HI01',
    skillDescription: 'EF01HI01 - Identificar aspectos do seu crescimento por meio de memórias, fotos e registros familiares.',
    knowledgeObjects: 'História de vida da criança, certidão de nascimento, fases da infância e árvore genealógica.'
  },
  {
    discipline: 'Historia',
    bimestre: '2 Bimestre',
    thematicUnit: 'A Família e a Escola no Tempo',
    skillCode: 'EF01HI04',
    skillDescription: 'EF01HI04 - Identificar as diferenças entre as estruturas familiares e as regras de convivência comunitária.',
    knowledgeObjects: 'Diversidade familiar, convivência em grupo, combinados da turma e respeito aos combinados.'
  },
  {
    discipline: 'Historia',
    bimestre: '3 Bimestre',
    thematicUnit: 'A Comunidade e seus Registros',
    skillCode: 'EF01HI05',
    skillDescription: 'EF01HI05 - Identificar semelhanças e diferenças entre brinquedos, brincadeiras e histórias de antigamente e de hoje.',
    knowledgeObjects: 'Brinquedos antigos e modernos, patrimônio imaterial, memórias dos avós e tradições culturais.'
  },
  {
    discipline: 'Historia',
    bimestre: '4 Bimestre',
    thematicUnit: 'Organização do Tempo e Memória',
    skillCode: 'EF01HI06',
    skillDescription: 'EF01HI06 - Organizar fatos da vida cotidiana usando noções temporais (ontem, hoje, amanhã, antes e depois).',
    knowledgeObjects: 'O calendário anual, os dias da semana, rotinas escolares e a passagem do tempo.'
  },

  // ─── LÍNGUA PORTUGUESA ──────────────────────────────────────────────────────
  {
    discipline: 'Lingua Portuguesa',
    bimestre: '1 Bimestre',
    thematicUnit: 'Apropriação do Sistema de Escrita',
    skillCode: 'EF01LP01',
    skillDescription: 'EF01LP01 - Reconhecer que os textos são lidos e escritos da esquerda para a direita e de cima para baixo.',
    knowledgeObjects: 'Alfabeto: letras e seus traçados, distinção entre letras, números e desenhos, vogais e consoantes.'
  },
  {
    discipline: 'Lingua Portuguesa',
    bimestre: '2 Bimestre',
    thematicUnit: 'Consciência Fonológica e Sílabas',
    skillCode: 'EF01LP05',
    skillDescription: 'EF01LP05 - Compreender a relação fonema-grafema, identificando sons iniciais, finais e divisão silábica.',
    knowledgeObjects: 'Segmentação de palavras em sílabas, rimas, aliterações e formação de palavras simples (canônica CV).'
  },
  {
    discipline: 'Lingua Portuguesa',
    bimestre: '3 Bimestre',
    thematicUnit: 'Leitura, Gêneros Textuais e Fluência',
    skillCode: 'EF01LP18',
    skillDescription: 'EF01LP18 - Ler e compreender parlendas, cantigas, poemas e listas, localizando informações explícitas.',
    knowledgeObjects: 'Gêneros da tradição oral (parlendas, cantigas), leitura compartilhada e ampliação do vocabulário.'
  },
  {
    discipline: 'Lingua Portuguesa',
    bimestre: '4 Bimestre',
    thematicUnit: 'Produção Textual e Escrita Alfabética',
    skillCode: 'EF01LP11',
    skillDescription: 'EF01LP11 - Escrever frases e pequenos textos com autonomia e hipótese alfabética consolidada.',
    knowledgeObjects: 'Escrita espontânea, espaçamento entre palavras, pontuação inicial (ponto final, interrogação) e revisão.'
  },

  // ─── MATEMÁTICA ─────────────────────────────────────────────────────────────
  {
    discipline: 'Matematica',
    bimestre: '1 Bimestre',
    thematicUnit: 'Números e Contagem',
    skillCode: 'EF01MA01',
    skillDescription: 'EF01MA01 - Utilizar números naturais como indicadores de quantidade e ordem em situações cotidianas até 20.',
    knowledgeObjects: 'Contagem um a um, relação número-quantidade, escrita dos algarismos de 0 a 20 e sequência numérica.'
  },
  {
    discipline: 'Matematica',
    bimestre: '2 Bimestre',
    thematicUnit: 'Operações e Resolução de Problemas',
    skillCode: 'EF01MA06',
    skillDescription: 'EF01MA06 - Construir fatos básicos da adição (juntar/acrescentar) e subtração (retirar) até 30.',
    knowledgeObjects: 'Ideias de adição e subtração com materiais concretos, reta numérica e resolução de situações-problema.'
  },
  {
    discipline: 'Matematica',
    bimestre: '3 Bimestre',
    thematicUnit: 'Geometria e Espaço',
    skillCode: 'EF01MA14',
    skillDescription: 'EF01MA14 - Identificar figuras geométricas planas (círculo, quadrado, retângulo, triângulo) e espaciais.',
    knowledgeObjects: 'Figuras planas e espaciais (cubo, esfera, cilindro), padrões, simetria e classificação.'
  },
  {
    discipline: 'Matematica',
    bimestre: '4 Bimestre',
    thematicUnit: 'Grandezas, Medidas e Estatística',
    skillCode: 'EF01MA19',
    skillDescription: 'EF01MA19 - Comparar medidas de comprimento, massa, capacidade, tempo e ler tabelas/gráficos simples.',
    knowledgeObjects: 'Medição não padronizada, calendário, dias da semana, relógio (horas inteiras), tabelas e gráficos de colunas.'
  },

  // ─── PRODUÇÃO TEXTUAL ────────────────────────────────────────────────────────
  {
    discipline: 'Producao Textual',
    bimestre: '1 Bimestre',
    thematicUnit: 'Escrita do Nome e Listas',
    skillCode: 'EF01LP10',
    skillDescription: 'EF01LP10 - Escrever o nome próprio, listas de objetos escolares e legendas para desenhos.',
    knowledgeObjects: 'Construção do nome próprio, listas temáticas, legendas ilustradas e registro de memórias.'
  },
  {
    discipline: 'Producao Textual',
    bimestre: '2 Bimestre',
    thematicUnit: 'Reconto e Bilhetes',
    skillCode: 'EF01LP12',
    skillDescription: 'EF01LP12 - Produzir pequenos bilhetes, convites e recontos coletivos com estrutura de início, meio e fim.',
    knowledgeObjects: 'Bilhetes cotidianos, mensagens de acolhida, recontagem sequencial de contos de fadas.'
  },
  {
    discipline: 'Producao Textual',
    bimestre: '3 Bimestre',
    thematicUnit: 'Poesia, Rimas e Parlendas',
    skillCode: 'EF01LP14',
    skillDescription: 'EF01LP14 - Produzir quadrinhas, rimas e versos poéticos para apreciação coletiva e declamação.',
    knowledgeObjects: 'Rimas divertidas, trava-línguas, adivinhas, poesia visual e mural poético da turma.'
  },
  {
    discipline: 'Producao Textual',
    bimestre: '4 Bimestre',
    thematicUnit: 'Autoria e Histórias Coletivas',
    skillCode: 'EF01LP15',
    skillDescription: 'EF01LP15 - Criar pequenas histórias narrativas ilustradas com coesão e apresentar para a comunidade.',
    knowledgeObjects: 'Livro da turma, narrativas com início, meio e clímax, ilustração autoral e sarau literário.'
  },
];