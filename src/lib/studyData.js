export const starterTopics = [
  {
    id: 'svelte-supabase',
    title: 'Svelte + Supabase',
    area: 'Frontend',
    status: 'Em andamento',
    priority: 'Alta',
    progress: 62,
    nextAction: 'Criar CRUD com o Supabase e autenticação GitHub',
    weeklyHours: 5,
    order: 0,
    dependencies: [],
    notes: 'Roadmap inicial para consolidar um app completo com persistência.',
    steps: [
      { id: 'svelte-supabase-step-1', title: 'Configurar autenticação GitHub', done: true },
      { id: 'svelte-supabase-step-2', title: 'Criar operações de CRUD no Supabase', done: false },
      { id: 'svelte-supabase-step-3', title: 'Validar fluxo local e remoto', done: false }
    ]
  },
  {
    id: 'typescript',
    title: 'TypeScript aplicado',
    area: 'Base técnica',
    status: 'Planejado',
    priority: 'Média',
    progress: 28,
    nextAction: 'Revisar generics, narrowing e tipos utilitários',
    weeklyHours: 3,
    order: 1,
    dependencies: [],
    notes: '',
    steps: [
      { id: 'typescript-step-1', title: 'Revisar narrowing com exemplos reais', done: false },
      { id: 'typescript-step-2', title: 'Criar exemplos com generics', done: false },
      { id: 'typescript-step-3', title: 'Mapear tipos utilitários úteis', done: false }
    ]
  },
  {
    id: 'arquitetura',
    title: 'Arquitetura de software',
    area: 'Backend',
    status: 'Revisão',
    priority: 'Alta',
    progress: 46,
    nextAction: 'Mapear exemplos reais de camadas e casos de uso',
    weeklyHours: 4,
    order: 2,
    dependencies: ['typescript'],
    notes: '',
    steps: [
      { id: 'arquitetura-step-1', title: 'Desenhar camadas de uma API real', done: false },
      { id: 'arquitetura-step-2', title: 'Separar entidades, casos de uso e infra', done: false },
      { id: 'arquitetura-step-3', title: 'Registrar trade-offs encontrados', done: false }
    ]
  }
];

export const starterResources = [
  {
    id: 'docs-svelte',
    title: 'Documentação do Svelte',
    type: 'Docs',
    url: 'https://svelte.dev/docs',
    topic: 'Svelte + Supabase',
    topicId: 'svelte-supabase'
  },
  {
    id: 'supabase-docs',
    title: 'Supabase Web Docs',
    type: 'Docs',
    url: 'https://supabase.com/docs/guides/getting-started/quickstarts/sveltekit',
    topic: 'Svelte + Supabase',
    topicId: 'svelte-supabase'
  }
];

export const weeklyPlan = [
  { day: 'Seg', focus: 'Frontend', hours: 2 },
  { day: 'Ter', focus: 'Backend', hours: 1 },
  { day: 'Qua', focus: 'Revisão', hours: 1 },
  { day: 'Qui', focus: 'Projeto prático', hours: 2 },
  { day: 'Sex', focus: 'Leitura técnica', hours: 1 }
];
