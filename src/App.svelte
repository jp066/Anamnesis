<script>
  import { onMount } from 'svelte';
  import menuIcon from './assets/image.png';
  import {
    hasSupabaseConfig,
    listenToAuth,
    loadUserData,
    loginWithEmail,
    loginWithGitHub,
    logout,
    removeResource,
    removeTopic,
    saveUserProfile,
    saveResource,
    saveWeeklyPlanItem,
    saveTopic,
    signUpWithEmail
  } from './lib/supabase.js';
  import { starterResources, starterTopics, weeklyPlan as starterWeeklyPlan } from './lib/studyData.js';

  const routes = [
    { path: '/roadmaps', label: 'Roadmaps', description: 'Planos de aprendizado', shortcut: '01' },
    { path: '/mapa', label: 'Mapa', description: 'Nós deslizáveis', shortcut: '02' },
    { path: '/foco', label: 'Foco', description: 'Próxima ação', shortcut: '03' },
    { path: '/semana', label: 'Semana', description: 'Ritmo de execução', shortcut: '04' },
    { path: '/materiais', label: 'Materiais', description: 'Biblioteca de apoio', shortcut: '05' }
  ];

  const routeMeta = {
    roadmaps: {
      eyebrow: 'Roadmaps próprios',
      title: 'Monte seus próprios caminhos de estudo, etapa por etapa.',
      description:
        'Crie roadmaps personalizados com blocos, subtarefas, dependências, materiais e progresso real.'
    },
    detail: {
      eyebrow: 'Detalhe do roadmap',
      title: 'Aprofunde um bloco e conecte tarefas, notas e materiais.',
      description:
        'Use esta tela para transformar um bloco do mapa em execução prática, com checklist e referências.'
    },
    mapa: {
      eyebrow: 'Mapa visual',
      title: 'Deslize pelos nós do seu roadmap.',
      description:
        'Veja o caminho completo em uma faixa horizontal, com nós conectados e acesso rápido ao detalhe de cada bloco.'
    },
    foco: {
      eyebrow: 'Modo foco',
      title: 'Veja exatamente o que estudar agora.',
      description:
        'Priorize o próximo bloco do roadmap, acompanhe tarefas pendentes e abra os materiais vinculados.'
    },
    semana: {
      eyebrow: 'Agenda semanal',
      title: 'Distribua o esforço da semana sem perder o foco atual.',
      description:
        'Veja a cadência planejada, acompanhe horas por tema e mantenha um recorte simples do que estudar agora.'
    },
    materiais: {
      eyebrow: 'Biblioteca pessoal',
      title: 'Guarde links, docs e cursos conectados aos seus roadmaps.',
      description:
        'Centralize materiais e vincule cada referência ao bloco exato onde ela será usada.'
    },
    auth: {
      eyebrow: 'Acesso',
      title: 'Entre para salvar seus roadmaps no Supabase.',
      description:
        'Use email e senha ou GitHub para manter seus dados sincronizados com sua conta.'
    }
  };

  const resourceTypes = ['Artigo', 'Docs', 'Vídeo', 'Livro', 'Curso'];
  const roadmapColumns = ['Planejado', 'Em andamento', 'Revisão', 'Concluído'];
  const weekendPlan = [
    { day: 'Sáb', focus: 'Revisão leve', hours: 1 },
    { day: 'Dom', focus: 'Planejamento', hours: 1 }
  ];
  const roadmapTemplates = [
    {
      title: 'Frontend',
      kind: 'Role',
      area: 'Frontend',
      weeklyHours: 4,
      items: ['HTML semântico', 'CSS responsivo', 'JavaScript moderno', 'Svelte', 'Deploy']
    },
    {
      title: 'Backend',
      kind: 'Role',
      area: 'Backend',
      weeklyHours: 4,
      items: ['HTTP e APIs', 'Banco de dados', 'Autenticação', 'Testes', 'Observabilidade']
    },
    {
      title: 'TypeScript',
      kind: 'Skill',
      area: 'Base técnica',
      weeklyHours: 3,
      items: ['Tipos básicos', 'Narrowing', 'Generics', 'Tipos utilitários', 'Modelagem de domínio']
    },
    {
      title: 'System Design',
      kind: 'Skill',
      area: 'Arquitetura',
      weeklyHours: 3,
      items: ['Escalabilidade', 'Cache', 'Filas', 'Consistência', 'Trade-offs']
    }
  ];

  let user = null;
  let loading = true;
  let syncStatus = hasSupabaseConfig ? 'Conectando ao Supabase' : 'Configure o Supabase';
  let topics = [];
  let resources = [];
  let weeklyPlan = [];
  let selectedStatus = 'Todos';
  let currentPath = normalizePath(window.location.pathname);
  let newStepTitle = '';
  let dependencyDraft = '';
  let draggingTopicId = '';
  let mapLayout = 'horizontal';
  let importText = '';
  let connectionStartId = '';
  let theme = 'light';
  let topbarMenuOpen = false;
  let authMode = 'login';
  let authLoading = false;
  let authFeedback = '';
  let authReturnPath = '/roadmaps';
  let selectedWeekItem = null;
  let weekForm = {
    focus: '',
    hours: 0
  };

  let topicForm = {
    title: '',
    area: '',
    priority: 'Média',
    weeklyHours: 2,
    nextAction: ''
  };

  let resourceForm = {
    title: '',
    type: 'Artigo',
    url: '',
    topic: '',
    topicId: ''
  };

  let authForm = {
    name: '',
    email: '',
    password: ''
  };

  $: detailId = currentPath.startsWith('/roadmaps/') ? currentPath.split('/')[2] : '';
  $: selectedTopic = topics.find((topic) => topic.id === detailId);
  $: currentView = detailId ? 'detail' : currentPath.replace('/', '') || 'roadmaps';
  $: currentRoute =
    currentPath === '/auth'
      ? { path: '/auth', label: 'Acesso' }
      : routes.find((route) => route.path === currentPath) ||
        routes.find((route) => route.path === `/${currentView}`) ||
        routes[0];
  $: currentMeta = routeMeta[currentView] || routeMeta.roadmaps;
  $: orderedTopics = [...topics].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  $: filteredTopics =
    selectedStatus === 'Todos'
      ? orderedTopics
      : orderedTopics.filter((topic) => topic.status === selectedStatus);
  $: totalHours = weeklyPlan.reduce((sum, item) => sum + Number(item.hours || 0), 0);
  $: averageProgress = topics.length
    ? Math.round(topics.reduce((sum, topic) => sum + getTopicProgress(topic), 0) / topics.length)
    : 0;
  $: activeTopics = topics.filter((topic) => topic.status === 'Em andamento').length;
  $: reviewTopics = topics.filter((topic) => topic.status === 'Revisão').length;
  $: completedTopics = topics.filter((topic) => topic.status === 'Concluído').length;
  $: nextTopic =
    orderedTopics.find((topic) => topic.status === 'Em andamento' && getTopicProgress(topic) < 100) ||
    orderedTopics.find((topic) => topic.status === 'Planejado') ||
    orderedTopics[0];
  $: priorityTopics = orderedTopics
    .filter((topic) => topic.priority === 'Alta')
    .sort((a, b) => getTopicProgress(a) - getTopicProgress(b))
    .slice(0, 3);
  $: roadmapGroups = roadmapColumns.map((status) => ({
    status,
    items: orderedTopics.filter((topic) => topic.status === status)
  }));
  $: roadmapPath = filteredTopics;
  $: focusMaterials = nextTopic
    ? resources.filter((resource) => resource.topicId === nextTopic.id || resource.topic === nextTopic.title)
    : [];
  $: selectedMaterials = selectedTopic
    ? resources.filter((resource) => resource.topicId === selectedTopic.id || resource.topic === selectedTopic.title)
    : [];
  $: dependencyOptions = selectedTopic
    ? orderedTopics.filter(
        (topic) => topic.id !== selectedTopic.id && !selectedTopic.dependencies?.includes(topic.id)
      )
    : [];

  function areaClass(area) {
    const normalizedArea = String(area || '').toLowerCase();
    if (normalizedArea.includes('front')) return 'area-frontend';
    if (normalizedArea.includes('back')) return 'area-backend';
    if (normalizedArea.includes('arquitet')) return 'area-arquitetura';
    if (normalizedArea.includes('base') || normalizedArea.includes('type')) return 'area-base';
    return 'area-general';
  }

  listenToAuth(async (currentUser) => {
    loading = true;
    user = currentUser;
    authFeedback = '';

    try {
      if (currentUser) {
        await saveUserProfile(currentUser);
        const remoteData = await loadUserData(currentUser.id);
        const hasRemoteData = Boolean(
          remoteData?.topics?.length || remoteData?.resources?.length || remoteData?.weeklyPlan?.length
        );

        if (hasRemoteData) {
          topics = normalizeTopics(remoteData.topics);
          resources = normalizeResources(remoteData.resources);
          weeklyPlan = normalizeWeeklyPlan(remoteData.weeklyPlan || []);
          syncStatus = 'Sincronizado com Supabase';
        } else {
          const starterData = createStarterSeed();
          topics = normalizeTopics(starterData.topics);
          resources = normalizeResources(starterData.resources);
          weeklyPlan = normalizeWeeklyPlan(starterData.weeklyPlan);
          await Promise.all(topics.map((topic) => saveTopic(currentUser.id, topic)));
          await Promise.all(resources.map((resource) => saveResource(currentUser.id, resource)));
          await Promise.all(weeklyPlan.map((item) => saveWeeklyPlanItem(currentUser.id, item)));
          syncStatus = 'Dados iniciais salvos no Supabase';
        }

        if (currentPath === '/auth') {
          navigate(null, getAuthReturnPath(), { replace: true });
        }
      } else {
        syncStatus = hasSupabaseConfig ? 'Entre com GitHub para salvar no Supabase' : 'Configure o Supabase para salvar';

        if (isProtectedPath(currentPath)) {
          redirectToAuth(currentPath);
        }
      }
    } catch (error) {
      console.warn('Supabase auth bootstrap failed.', error);
      syncStatus = 'Não foi possível sincronizar com Supabase';

      if (isProtectedPath(currentPath)) {
        redirectToAuth(currentPath);
      }
    } finally {
      loading = false;
    }
  });

  onMount(() => {
    setupTheme();
    readAuthRedirectError();

    const handleRouteChange = () => {
      currentPath = normalizePath(window.location.pathname);
      if (!loading && !user && isProtectedPath(currentPath)) {
        redirectToAuth(currentPath);
      }
    };

    handleRouteChange();
    window.addEventListener('popstate', handleRouteChange);

    return () => window.removeEventListener('popstate', handleRouteChange);
  });

  function setupTheme() {
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    theme = preferredTheme;
    applyTheme();
  }

  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  }

  function normalizePath(pathname) {
    if (pathname === '/' || pathname === '/trilhas') return '/roadmaps';
    if (pathname.startsWith('/roadmaps/')) return pathname;
    if (pathname === '/auth') return '/auth';
    return routes.some((route) => route.path === pathname) ? pathname : '/roadmaps';
  }

  function isProtectedPath(path) {
    return path !== '/auth';
  }

  function getAuthReturnPath() {
    const next = new URLSearchParams(window.location.search).get('next');
    const normalizedNext = next ? normalizePath(next) : authReturnPath;

    return normalizedNext === '/auth' ? '/roadmaps' : normalizedNext;
  }

  function readAuthRedirectError() {
    if (currentPath !== '/auth') return;

    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const description =
      queryParams.get('error_description') ||
      hashParams.get('error_description') ||
      queryParams.get('error') ||
      hashParams.get('error');

    if (!description) return;

    authFeedback = decodeURIComponent(description).replace(/\+/g, ' ');

    const cleanUrl = new URL(window.location.href);
    const next = queryParams.get('next') || authReturnPath || '/roadmaps';
    cleanUrl.search = '';
    cleanUrl.hash = '';
    cleanUrl.searchParams.set('next', next);
    history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search);
  }

  function redirectToAuth(path = currentPath) {
    authReturnPath = path === '/auth' ? '/roadmaps' : path;
    const next = encodeURIComponent(authReturnPath);
    history.replaceState({}, '', `/auth?next=${next}`);
    currentPath = '/auth';
  }

  function navigate(event, path, options = {}) {
    event?.preventDefault();
    const normalizedPath = normalizePath(path);
    topbarMenuOpen = false;
    if (currentPath === normalizedPath) return;

    if (!user && isProtectedPath(normalizedPath)) {
      redirectToAuth(normalizedPath);
      return;
    }

    if (options.replace) {
      history.replaceState({}, '', normalizedPath);
    } else {
      history.pushState({}, '', normalizedPath);
    }

    currentPath = normalizedPath;
  }

  function normalizeTopics(items) {
    return items.map((topic, index) => ({
      dependencies: [],
      notes: '',
      order: index,
      steps: [],
      ...topic,
      progress: getTopicProgress(topic)
    }));
  }

  function normalizeResources(items) {
    return items.map((resource) => ({
      topicId: '',
      ...resource
    }));
  }

  function normalizeWeeklyPlan(items) {
    return items.map((item, index) => ({
      id: item.id || crypto.randomUUID(),
      day: item.day,
      focus: item.focus || '',
      hours: Number(item.hours ?? item.time ?? 0),
      order: item.order ?? index
    }));
  }

  function createStarterSeed() {
    const topicIdMap = new Map(starterTopics.map((topic) => [topic.id, crypto.randomUUID()]));
    const topicsSeed = starterTopics.map((topic) => ({
      ...topic,
      id: topicIdMap.get(topic.id),
      dependencies: (topic.dependencies || []).map((id) => topicIdMap.get(id)).filter(Boolean)
    }));
    const resourcesSeed = starterResources.map((resource) => ({
      ...resource,
      id: crypto.randomUUID(),
      topicId: topicIdMap.get(resource.topicId) || ''
    }));
    const weeklyPlanSeed = starterWeeklyPlan.map((item, index) => ({
      ...item,
      id: crypto.randomUUID(),
      order: index
    }));

    return { topics: topicsSeed, resources: resourcesSeed, weeklyPlan: weeklyPlanSeed };
  }

  function getTopicProgress(topic) {
    if (topic?.steps?.length) {
      const completed = topic.steps.filter((step) => step.done).length;
      return Math.round((completed / topic.steps.length) * 100);
    }

    return Number(topic?.progress || 0);
  }

  function statusFromProgress(progress) {
    if (progress === 100) return 'Concluído';
    if (progress > 0) return 'Em andamento';
    return 'Planejado';
  }

  function formatHours(hours) {
    const value = Number(hours || 0);
    return `${value}h`;
  }

  function loadStarterData() {
    topics = normalizeTopics(starterTopics);
    resources = normalizeResources(starterResources);
    weeklyPlan = normalizeWeeklyPlan(starterWeeklyPlan);
  }

  function canPersistToSupabase() {
    if (user) return true;

    syncStatus = hasSupabaseConfig
      ? 'Entre com GitHub para salvar no Supabase'
      : 'Configure o Supabase para salvar';
    return false;
  }

  async function persistTopic(topic) {
    if (!canPersistToSupabase()) return;

    const normalizedTopic = { ...topic, progress: getTopicProgress(topic) };
    await saveTopic(user.id, normalizedTopic);
    syncStatus = 'Alteração salva no Supabase';
  }

  async function persistTopicsBatch(updatedTopics) {
    if (!canPersistToSupabase()) return;

    topics = normalizeTopics(updatedTopics);
    await Promise.all(topics.map((topic) => saveTopic(user.id, topic)));
    syncStatus = 'Roadmaps atualizados no Supabase';
  }

  async function persistResource(resource) {
    if (!canPersistToSupabase()) return;

    await saveResource(user.id, resource);
    syncStatus = 'Material salvo no Supabase';
  }

  async function updateWeeklyPlanItem(item, patch) {
    if (!canPersistToSupabase()) return;

    const updatedItem = { ...item, ...patch };
    weeklyPlan = normalizeWeeklyPlan(
      weeklyPlan.map((currentItem) => (currentItem.id === item.id ? updatedItem : currentItem))
    );
    await saveWeeklyPlanItem(user.id, updatedItem);
    syncStatus = 'Semana atualizada no Supabase';
  }

  async function createWeeklyPlan() {
    if (!canPersistToSupabase()) return;

    const createdPlan = normalizeWeeklyPlan(
      starterWeeklyPlan.map((item, index) => ({
        ...item,
        id: crypto.randomUUID(),
        order: index
      }))
    );

    weeklyPlan = createdPlan;
    await Promise.all(createdPlan.map((item) => saveWeeklyPlanItem(user.id, item)));
    syncStatus = 'Plano semanal criado no Supabase';
  }

  async function addWeekendToWeeklyPlan() {
    if (!canPersistToSupabase()) return;

    const existingDays = new Set(weeklyPlan.map((item) => item.day));
    const nextOrder = weeklyPlan.length;
    const weekendItems = weekendPlan
      .filter((item) => !existingDays.has(item.day))
      .map((item, index) => ({
        ...item,
        id: crypto.randomUUID(),
        order: nextOrder + index
      }));

    if (!weekendItems.length) return;

    weeklyPlan = normalizeWeeklyPlan([...weeklyPlan, ...weekendItems]);
    await Promise.all(weekendItems.map((item) => saveWeeklyPlanItem(user.id, item)));
    syncStatus = 'Fim de semana adicionado ao Supabase';
  }

  function openWeekDialog(item) {
    selectedWeekItem = item;
    weekForm = {
      focus: item.focus || '',
      hours: Number(item.hours || 0)
    };
  }

  function closeWeekDialog() {
    selectedWeekItem = null;
    weekForm = { focus: '', hours: 0 };
  }

  async function saveWeekDialog() {
    if (!selectedWeekItem) return;

    await updateWeeklyPlanItem(selectedWeekItem, {
      focus: weekForm.focus.trim(),
      hours: Number(weekForm.hours || 0)
    });
    closeWeekDialog();
  }

  async function addTopic() {
    if (!canPersistToSupabase()) return;
    if (!topicForm.title.trim() || !topicForm.area.trim()) return;

    const topic = {
      id: crypto.randomUUID(),
      title: topicForm.title.trim(),
      area: topicForm.area.trim(),
      status: 'Planejado',
      priority: topicForm.priority,
      progress: 0,
      nextAction: topicForm.nextAction.trim() || 'Definir a próxima ação',
      weeklyHours: Number(topicForm.weeklyHours),
      steps: [],
      dependencies: [],
      notes: '',
      order: topics.length
    };

    topics = normalizeTopics([...topics, topic]);
    topicForm = { title: '', area: '', priority: 'Média', weeklyHours: 2, nextAction: '' };
    await persistTopic(topic);
  }

  async function applyTemplate(template) {
    if (!canPersistToSupabase()) return;

    const baseOrder = topics.length;
    const templateTopics = template.items.map((item, index) => ({
      id: crypto.randomUUID(),
      title: item,
      area: template.area,
      status: index === 0 ? 'Em andamento' : 'Planejado',
      priority: index < 2 ? 'Alta' : 'Média',
      progress: index === 0 ? 20 : 0,
      nextAction: `Estudar ${item} e registrar um exemplo prático`,
      weeklyHours: template.weeklyHours,
      steps: [
        { id: crypto.randomUUID(), title: `Entender os fundamentos de ${item}`, done: false },
        { id: crypto.randomUUID(), title: `Criar um exemplo prático de ${item}`, done: false },
        { id: crypto.randomUUID(), title: `Anotar dúvidas e próximos passos`, done: false }
      ],
      dependencies: [],
      notes: '',
      order: baseOrder + index
    }));

    topics = normalizeTopics([...topics, ...templateTopics]);
    await persistTopicsBatch(topics);
  }

  async function importRoadmap() {
    if (!canPersistToSupabase()) return;

    const lines = importText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return;

    const baseOrder = topics.length;
    const importedTopics = lines.map((line, index) => {
      const [titlePart, areaPart, priorityPart] = line.split('|').map((part) => part?.trim());
      const title = titlePart.replace(/^[-*\d.\s]+/, '') || `Bloco ${index + 1}`;
      const area = areaPart || inferArea(title);

      return {
        id: crypto.randomUUID(),
        title,
        area,
        status: index === 0 ? 'Em andamento' : 'Planejado',
        priority: priorityPart || (index < 2 ? 'Alta' : 'Média'),
        progress: 0,
        nextAction: `Estudar ${title} e criar um exemplo prático`,
        weeklyHours: 2,
        steps: [
          { id: crypto.randomUUID(), title: `Entender ${title}`, done: false },
          { id: crypto.randomUUID(), title: `Praticar ${title}`, done: false }
        ],
        dependencies: [],
        notes: '',
        order: baseOrder + index
      };
    });

    importText = '';
    topics = normalizeTopics([...topics, ...importedTopics]);
    await persistTopicsBatch(topics);
  }

  function inferArea(title) {
    const normalizedTitle = title.toLowerCase();
    if (['html', 'css', 'javascript', 'react', 'svelte', 'frontend'].some((term) => normalizedTitle.includes(term))) {
      return 'Frontend';
    }
    if (['api', 'node', 'banco', 'sql', 'backend'].some((term) => normalizedTitle.includes(term))) {
      return 'Backend';
    }
    if (['arquitetura', 'design', 'system'].some((term) => normalizedTitle.includes(term))) {
      return 'Arquitetura';
    }
    return 'Base técnica';
  }

  async function updateTopic(topic, patch) {
    if (!canPersistToSupabase()) return;

    const updated = { ...topic, ...patch };
    const progress = getTopicProgress(updated);
    const nextStatus = patch.status || statusFromProgress(progress);
    const finalTopic = { ...updated, progress, status: nextStatus };

    topics = topics.map((item) => (item.id === topic.id ? finalTopic : item));
    await persistTopic(finalTopic);
  }

  async function updateProgress(topic, delta) {
    if (topic.steps?.length) return;
    const progress = Math.min(100, Math.max(0, Number(topic.progress) + delta));
    await updateTopic(topic, { progress, status: statusFromProgress(progress) });
  }

  async function moveTopic(topic, direction) {
    if (!canPersistToSupabase()) return;

    const list = [...orderedTopics];
    const currentIndex = list.findIndex((item) => item.id === topic.id);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= list.length) return;

    [list[currentIndex], list[nextIndex]] = [list[nextIndex], list[currentIndex]];
    await persistTopicsBatch(list.map((item, index) => ({ ...item, order: index })));
  }

  async function reorderDraggedTopic(targetTopicId) {
    if (!canPersistToSupabase()) return;
    if (!draggingTopicId || draggingTopicId === targetTopicId) return;

    const list = [...orderedTopics];
    const fromIndex = list.findIndex((topic) => topic.id === draggingTopicId);
    const toIndex = list.findIndex((topic) => topic.id === targetTopicId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [draggedTopic] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, draggedTopic);
    draggingTopicId = '';
    await persistTopicsBatch(list.map((topic, index) => ({ ...topic, order: index })));
  }

  async function addStep(topic) {
    if (!canPersistToSupabase()) return;
    if (!newStepTitle.trim()) return;

    const steps = [
      ...(topic.steps || []),
      { id: crypto.randomUUID(), title: newStepTitle.trim(), done: false }
    ];

    newStepTitle = '';
    await updateTopic(topic, { steps });
  }

  async function toggleStep(topic, stepId) {
    if (!canPersistToSupabase()) return;

    const steps = topic.steps.map((step) =>
      step.id === stepId ? { ...step, done: !step.done } : step
    );

    await updateTopic(topic, { steps });
  }

  async function removeStep(topic, stepId) {
    if (!canPersistToSupabase()) return;

    const steps = topic.steps.filter((step) => step.id !== stepId);
    await updateTopic(topic, { steps });
  }

  async function addDependency(topic) {
    if (!canPersistToSupabase()) return;
    if (!dependencyDraft) return;

    await updateTopic(topic, { dependencies: [...(topic.dependencies || []), dependencyDraft] });
    dependencyDraft = '';
  }

  async function connectTopics(targetTopic) {
    if (!canPersistToSupabase()) return;

    if (!connectionStartId) {
      connectionStartId = targetTopic.id;
      syncStatus = 'Arraste ou solte no bloco que depende deste';
      return;
    }

    if (connectionStartId === targetTopic.id) {
      connectionStartId = '';
      syncStatus = 'Conexão cancelada';
      return;
    }

    const targetDependencies = targetTopic.dependencies || [];
    if (!targetDependencies.includes(connectionStartId)) {
      await updateTopic(targetTopic, { dependencies: [...targetDependencies, connectionStartId] });
      syncStatus = 'Conexão criada entre blocos';
    }

    connectionStartId = '';
  }

  async function startConnection(topic) {
    connectionStartId = topic.id;
    syncStatus = `Conectando a partir de ${topic.title}`;
  }

  async function dropConnection(targetTopic) {
    if (!connectionStartId) return;
    await connectTopics(targetTopic);
  }

  async function removeDependency(topic, dependencyId) {
    await updateTopic(topic, {
      dependencies: topic.dependencies.filter((id) => id !== dependencyId)
    });
  }

  async function updateNotes(topic, notes) {
    if (!canPersistToSupabase()) return;

    await updateTopic(topic, { notes });
  }

  async function deleteTopic(topicId) {
    if (!canPersistToSupabase()) return;

    topics = topics.filter((topic) => topic.id !== topicId);
    resources = resources.map((resource) =>
      resource.topicId === topicId ? { ...resource, topicId: '' } : resource
    );

    await removeTopic(user.id, topicId);
    syncStatus = 'Roadmap removido do Supabase';
  }

  async function addResource() {
    if (!canPersistToSupabase()) return;
    if (!resourceForm.title.trim() || !resourceForm.url.trim()) return;

    const linkedTopic = topics.find((topic) => topic.id === resourceForm.topicId);
    const resource = {
      id: crypto.randomUUID(),
      title: resourceForm.title.trim(),
      type: resourceForm.type,
      url: resourceForm.url.trim(),
      topic: linkedTopic?.title || resourceForm.topic.trim() || 'Geral',
      topicId: linkedTopic?.id || ''
    };

    resources = [resource, ...resources];
    resourceForm = { title: '', type: 'Artigo', url: '', topic: '', topicId: '' };
    await persistResource(resource);
  }

  async function deleteResource(resourceId) {
    if (!canPersistToSupabase()) return;

    resources = resources.filter((resource) => resource.id !== resourceId);
    await removeResource(user.id, resourceId);
    syncStatus = 'Material removido do Supabase';
  }

  async function copyShareLink(topic) {
    const url = `${window.location.origin}/roadmaps/${topic.id}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      syncStatus = 'Link do roadmap copiado';
    }
  }

  function exportRoadmap() {
    window.print();
  }

  function authErrorMessage(error) {
    const message = String(error?.message || 'Não foi possível autenticar.');

    if (message.toLowerCase().includes('invalid login credentials')) {
      return 'Email ou senha inválidos.';
    }

    if (message.toLowerCase().includes('email not confirmed')) {
      return 'Confirme seu email antes de entrar.';
    }

    if (message.toLowerCase().includes('password')) {
      return 'Use uma senha com pelo menos 6 caracteres.';
    }

    return message;
  }

  async function submitEmailAuth() {
    if (!authForm.email.trim() || !authForm.password.trim() || authLoading) return;
    if (authMode === 'signup' && !authForm.name.trim()) {
      authFeedback = 'Informe seu nome para criar a conta.';
      return;
    }

    authLoading = true;
    authFeedback = '';

    try {
      if (authMode === 'login') {
        await loginWithEmail(authForm.email.trim(), authForm.password);
        authFeedback = 'Login realizado.';
        navigate(null, getAuthReturnPath(), { replace: true });
      } else {
        const data = await signUpWithEmail(authForm.email.trim(), authForm.password, authForm.name.trim());
        authFeedback = data?.session
          ? 'Conta criada e sessão iniciada.'
          : 'Conta criada. Confirme seu email para entrar.';
        if (data?.session) navigate(null, getAuthReturnPath(), { replace: true });
      }
    } catch (error) {
      authFeedback = authErrorMessage(error);
    } finally {
      authLoading = false;
    }
  }

  async function submitGitHubAuth() {
    if (authLoading) return;

    authLoading = true;
    authFeedback = '';

    try {
      await loginWithGitHub(getAuthReturnPath());
    } catch (error) {
      authFeedback = authErrorMessage(error);
      authLoading = false;
    }
  }

  function slideMap(direction) {
    document.querySelector('.node-slider')?.scrollBy({
      left: mapLayout === 'horizontal' ? direction * 420 : 0,
      top: mapLayout === 'vertical' ? direction * 260 : 0,
      behavior: 'smooth'
    });
  }

</script>

<svelte:head>
  <title>{currentRoute.label} | Anamnesis</title>
</svelte:head>

{#if loading}
  <main class="loading-screen">
    <div class="loader-card">
      <span class="brand-mark">

      </span>
      <p>Carregando o Anamnesis...</p>
    </div>
  </main>
{:else}
  <main class="app-shell" class:map-mode={currentPath === '/mapa'} class:auth-mode={currentPath === '/auth'}>
    {#if currentPath !== '/auth'}
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark">
            <img class="logo" src="/src/assets/logo-no-bg.png" alt="Logo do Anamnesis" />
          </span>
          <div>
            <strong>Anamnesis</strong>
            <small>Estudos de {user ? user.user_metadata?.name || user.email : 'Roadmaps pessoais'}</small>
          </div>
        </div>

        <nav class="route-nav" aria-label="Rotas do painel">
          {#each routes as route}
            <a
              href={route.path}
              class:active={currentRoute.path === route.path || (route.path === '/roadmaps' && detailId)}
              aria-current={currentRoute.path === route.path ? 'page' : undefined}
              on:click={(event) => navigate(event, route.path)}
            >
              <span>{route.shortcut}</span>
              <strong>{route.label}</strong>
              <small>{route.description}</small>
            </a>
          {/each}
        </nav>

        <div class="sidebar-summary">
          <span>Foco atual</span>
          <strong>{nextTopic?.title || 'Defina um roadmap'}</strong>
          <small>{nextTopic?.nextAction || 'Adicione uma próxima ação para começar.'}</small>
        </div>
      </aside>
    {/if}

    <section class="workspace">
      {#if currentPath !== '/auth'}
        <header class="topbar">
          <div>
            <span>Workspace pessoal</span>
            <strong>{detailId ? selectedTopic?.title || 'Roadmap' : currentRoute.label}</strong>
          </div>
          <button
            type="button"
            class="topbar-menu-toggle"
            aria-label={topbarMenuOpen ? 'Fechar menu de ações' : 'Abrir menu de ações'}
            aria-expanded={topbarMenuOpen}
            aria-controls="topbar-actions"
            on:click={() => (topbarMenuOpen = !topbarMenuOpen)}
          >
            <img src={menuIcon} alt="" aria-hidden="true" />
          </button>
          <div id="topbar-actions" class="topbar-actions" class:open={topbarMenuOpen}>
            <button
              type="button"
              class="theme-toggle"
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              aria-pressed={theme === 'dark'}
              on:click={() => {
                toggleTheme();
                topbarMenuOpen = false;
              }}
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </button>
            <button
              type="button"
              class="soft-button"
              on:click={() => {
                exportRoadmap();
                topbarMenuOpen = false;
              }}
            >
              Exportar
            </button>
            {#if user}
              <button
                type="button"
                class="soft-button"
                on:click={() => {
                  topbarMenuOpen = false;
                  logout();
                }}
              >
                Sair
              </button>
            {:else}
              <a class="soft-link" href="/auth" on:click={(event) => navigate(event, '/auth')}>Entrar</a>
            {/if}
          </div>
        </header>
      {/if}

      {#if currentPath !== '/mapa' && currentPath !== '/auth'}
        <section class="hero" aria-labelledby="page-title">
          <div class="hero-copy">
            <p class="eyebrow">{currentMeta.eyebrow}</p>
            <h1 id="page-title">{selectedTopic?.title || currentMeta.title}</h1>
            <p>{selectedTopic?.nextAction || currentMeta.description}</p>
          </div>

          <div class="hero-panel" aria-label="Resumo dos roadmaps">
            <span>Progresso geral</span>
            <strong>{averageProgress}%</strong>
            <div class="progress-track" aria-hidden="true">
              <span style={`width: ${averageProgress}%`}></span>
            </div>
            <small>{activeTopics} em andamento · {reviewTopics} em revisão · {completedTopics} concluídos</small>
          </div>
        </section>

        <section class="metrics" aria-label="Indicadores">
          <article>
            <span class="metric-kicker">Roadmaps ativos</span>
            <strong>{activeTopics}</strong>
            <small>Blocos com progresso iniciado</small>
          </article>
          <article>
            <span class="metric-kicker">Horas semanais</span>
            <strong>{totalHours}h</strong>
            <small>Carga planejada para a semana</small>
          </article>
          <article>
            <span class="metric-kicker">Materiais salvos</span>
            <strong>{resources.length}</strong>
            <small>Links vinculados aos blocos</small>
          </article>
        </section>
      {/if}

      {#if currentPath === '/auth'}
        <section class="auth-page" aria-labelledby="auth-title">
          <div class="auth-copy">
            <p class="eyebrow">Autenticação</p>
            <h1 id="auth-title">Acesse sua conta Anamnesis</h1>
            <p>
              Seus roadmaps, materiais e progresso são salvos no Supabase somente depois que
              você entra com email ou GitHub.
            </p>
          </div>

          <section class="auth-panel" aria-label="Formulário de autenticação">
            {#if hasSupabaseConfig}
              {#if user}
                <div class="auth-success">
                  <span>Conectado</span>
                  <strong>{user.user_metadata?.name || user.email}</strong>
                  <a class="panel-link" href="/roadmaps" on:click={(event) => navigate(event, '/roadmaps')}>
                    Ir para roadmaps
                  </a>
                  <button type="button" class="soft-button" on:click={logout}>Sair</button>
                </div>
              {:else}
                <form class="auth-form" on:submit|preventDefault={submitEmailAuth}>
                  <div class="auth-switch" aria-label="Modo de autenticação">
                    <button type="button" class:active={authMode === 'login'} on:click={() => (authMode = 'login')}>
                      Entrar
                    </button>
                    <button type="button" class:active={authMode === 'signup'} on:click={() => (authMode = 'signup')}>
                      Criar conta
                    </button>
                  </div>

                  {#if authMode === 'signup'}
                    <label>
                      <span>Nome</span>
                      <input bind:value={authForm.name} type="text" autocomplete="name" placeholder="Seu nome" />
                    </label>
                  {/if}

                  <label>
                    <span>Email</span>
                    <input bind:value={authForm.email} type="email" autocomplete="email" placeholder="voce@email.com" />
                  </label>

                  <label>
                    <span>Senha</span>
                    <input
                      bind:value={authForm.password}
                      type="password"
                      autocomplete={authMode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="Sua senha"
                      minlength="6"
                    />
                  </label>

                  <button type="submit" disabled={authLoading}>
                    {authLoading ? 'Aguarde...' : authMode === 'login' ? 'Entrar com email' : 'Criar com email'}
                  </button>
                </form>

                <div class="auth-divider"><span>ou</span></div>

                <button type="button" class="github-button" disabled={authLoading} on:click={submitGitHubAuth}>
                  Entrar com GitHub
                </button>

                {#if authFeedback}
                  <small class="auth-feedback">{authFeedback}</small>
                {/if}
              {/if}
            {:else}
              <div class="auth-success">
                <span>Configuração pendente</span>
                <strong>Supabase não configurado</strong>
                <small>Preencha o `.env` para ativar email/senha e GitHub.</small>
              </div>
            {/if}
          </section>
        </section>
      {:else if detailId}
        {#if selectedTopic}
          <section class="page-grid">
            <section class="section-block detail-panel">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">{selectedTopic.area}</p>
                  <h2>{selectedTopic.title}</h2>
                </div>
                <button type="button" class="soft-button" on:click={() => copyShareLink(selectedTopic)}>
                  Copiar link
                </button>
              </div>

              <div class="detail-progress">
                <div class="progress-track">
                  <span style={`width: ${getTopicProgress(selectedTopic)}%`}></span>
                </div>
                <strong>{getTopicProgress(selectedTopic)}%</strong>
              </div>

              <div class="checklist">
                <div class="inline-heading">
                  <h3>Checklist</h3>
                  <small>{selectedTopic.steps?.filter((step) => step.done).length || 0}/{selectedTopic.steps?.length || 0}</small>
                </div>

                {#each selectedTopic.steps || [] as step}
                  <label class="check-item">
                    <input type="checkbox" checked={step.done} on:change={() => toggleStep(selectedTopic, step.id)} />
                    <span>{step.title}</span>
                    <button type="button" class="ghost-button" on:click={() => removeStep(selectedTopic, step.id)}>
                      Remover
                    </button>
                  </label>
                {/each}

                <form class="inline-form" on:submit|preventDefault={() => addStep(selectedTopic)}>
                  <input bind:value={newStepTitle} placeholder="Nova subtarefa" aria-label="Nova subtarefa" />
                  <button type="submit">Adicionar</button>
                </form>
              </div>

              <div class="notes-block">
                <div class="inline-heading">
                  <h3>Notas de aprendizado</h3>
                  <small>Resumo, dúvidas e comandos úteis</small>
                </div>
                <textarea
                  value={selectedTopic.notes}
                  placeholder="Escreva suas anotações deste bloco..."
                  on:change={(event) => updateNotes(selectedTopic, event.currentTarget.value)}
                ></textarea>
              </div>
            </section>

            <aside class="section-block compact-panel">
              <p class="eyebrow">Dependências</p>
              <h2>Antes deste bloco</h2>
              <div class="dependency-list">
                {#each selectedTopic.dependencies || [] as dependencyId}
                  {@const dependency = topics.find((topic) => topic.id === dependencyId)}
                  {#if dependency}
                    <article>
                      <strong>{dependency.title}</strong>
                      <button type="button" class="ghost-button" on:click={() => removeDependency(selectedTopic, dependencyId)}>
                        Remover
                      </button>
                    </article>
                  {/if}
                {/each}
              </div>
              <form class="inline-form stacked" on:submit|preventDefault={() => addDependency(selectedTopic)}>
                <select bind:value={dependencyDraft} aria-label="Adicionar dependência">
                  <option value="">Selecione uma dependência</option>
                  {#each dependencyOptions as option}
                    <option value={option.id}>{option.title}</option>
                  {/each}
                </select>
                <button type="submit">Adicionar dependência</button>
              </form>

              <div class="priority-divider"></div>

              <p class="eyebrow">Materiais vinculados</p>
              <div class="resource-list compact-list">
                {#each selectedMaterials as resource}
                  <article>
                    <div>
                      <span>{resource.type}</span>
                      <a href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a>
                    </div>
                  </article>
                {/each}
              </div>
            </aside>
          </section>
        {:else}
          <section class="section-block">
            <h2>Roadmap não encontrado</h2>
            <a class="panel-link" href="/roadmaps" on:click={(event) => navigate(event, '/roadmaps')}>
              Voltar para roadmaps
            </a>
          </section>
        {/if}
      {:else if currentPath === '/roadmaps'}
        <section class="page-grid page-grid-wide">
          <section class="section-block">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Roadmaps</p>
                <h2>Caminhos em construção</h2>
              </div>

              <select bind:value={selectedStatus} aria-label="Filtrar por status">
                <option>Todos</option>
                <option>Planejado</option>
                <option>Em andamento</option>
                <option>Revisão</option>
                <option>Concluído</option>
              </select>
            </div>

            <div class="composer">
              <div>
                <span>Novo bloco de roadmap</span>
                <small>Defina o bloco de aprendizado e a próxima ação prática.</small>
              </div>
              <form class="topic-form" on:submit|preventDefault={addTopic}>
                <input bind:value={topicForm.title} placeholder="Ex: APIs com Node.js" aria-label="Tema" />
                <input bind:value={topicForm.area} placeholder="Área do roadmap" aria-label="Área" />
                <select bind:value={topicForm.priority} aria-label="Prioridade">
                  <option>Alta</option>
                  <option>Média</option>
                  <option>Baixa</option>
                </select>
                <input bind:value={topicForm.weeklyHours} min="1" type="number" aria-label="Horas semanais" />
                <input class="wide-input" bind:value={topicForm.nextAction} placeholder="Próxima ação prática" aria-label="Próxima ação" />
                <button type="submit">Adicionar</button>
              </form>
            </div>

            {#if selectedStatus === 'Todos'}
              <div class="roadmap-board" aria-label="Board de roadmaps por etapa">
                {#each roadmapGroups as group}
                  <section class="roadmap-column">
                    <div class="roadmap-column-head">
                      <strong>{group.status}</strong>
                      <span>{group.items.length}</span>
                    </div>

                    <div class="topic-list">
                      {#each group.items as topic}
                        <article class={`topic-card ${areaClass(topic.area)}`}>
                          <div class="topic-card-header">
                            <div>
                              <span class="pill">{topic.area}</span>
                              <h3>{topic.title}</h3>
                            </div>
                            <button type="button" class="ghost-button" on:click={() => deleteTopic(topic.id)}>
                              Remover
                            </button>
                          </div>

                          <p>{topic.nextAction}</p>

                          <div class="topic-meta">
                            <span>Prioridade: {topic.priority}</span>
                            <span>{topic.weeklyHours}h/semana</span>
                            <span>{topic.steps?.length || 0} subtarefas</span>
                          </div>

                          <div class="topic-progress">
                            <div class="progress-track">
                              <span style={`width: ${getTopicProgress(topic)}%`}></span>
                            </div>
                            <strong>{getTopicProgress(topic)}%</strong>
                          </div>

                          <div class="topic-actions">
                            <button type="button" on:click={() => moveTopic(topic, -1)}>Subir</button>
                            <button type="button" on:click={() => moveTopic(topic, 1)}>Descer</button>
                            <a class="small-link" href={`/roadmaps/${topic.id}`} on:click={(event) => navigate(event, `/roadmaps/${topic.id}`)}>
                              Detalhes
                            </a>
                            {#if !topic.steps?.length}
                              <button type="button" on:click={() => updateProgress(topic, -10)}>-10%</button>
                              <button type="button" on:click={() => updateProgress(topic, 10)}>+10%</button>
                            {/if}
                          </div>
                        </article>
                      {/each}
                    </div>
                  </section>
                {/each}
              </div>
            {:else}
              <div class="topic-list">
                {#each filteredTopics as topic}
                  <article class={`topic-card ${areaClass(topic.area)}`}>
                    <div class="topic-card-header">
                      <div>
                        <span class="pill">{topic.area}</span>
                        <h3>{topic.title}</h3>
                      </div>
                      <button type="button" class="ghost-button" on:click={() => deleteTopic(topic.id)}>Remover</button>
                    </div>
                    <p>{topic.nextAction}</p>
                    <div class="topic-meta">
                      <span>Status: {topic.status}</span>
                      <span>Prioridade: {topic.priority}</span>
                      <span>{topic.weeklyHours}h/semana</span>
                    </div>
                    <div class="topic-progress">
                      <div class="progress-track">
                        <span style={`width: ${getTopicProgress(topic)}%`}></span>
                      </div>
                      <strong>{getTopicProgress(topic)}%</strong>
                    </div>
                  </article>
                {/each}
              </div>
            {/if}
          </section>

          <aside class="insight-panel">
            <p class="eyebrow">Templates</p>
            <h2>Comece com um modelo</h2>
            <div class="template-list">
              {#each roadmapTemplates as template}
                <article>
                  <span>{template.kind}</span>
                  <strong>{template.title}</strong>
                  <small>{template.items.join(', ')}</small>
                  <button type="button" on:click={() => applyTemplate(template)}>Usar template</button>
                </article>
              {/each}
            </div>

            <div class="priority-divider"></div>

            <p class="eyebrow">Sugestão</p>
            <h2>Próximo passo</h2>
            {#if nextTopic}
              <article class="suggestion-card">
                <strong>{nextTopic.title}</strong>
                <small>{nextTopic.nextAction}</small>
                <a href={`/roadmaps/${nextTopic.id}`} on:click={(event) => navigate(event, `/roadmaps/${nextTopic.id}`)}>
                  Abrir foco
                </a>
              </article>
            {/if}
          </aside>
        </section>
      {:else if currentPath === '/mapa'}
        <section class="map-page">
          <div class="map-header">
            <div>
              <p class="eyebrow">Mapa visual</p>
              <h1>Arraste os nós para reorganizar seu roadmap.</h1>
              <p>
                Cada nó representa um bloco do caminho. Arraste para mudar a ordem e clique em um
                bloco para abrir detalhes, checklist e materiais.
              </p>
            </div>
            <div class="slider-controls" aria-label="Controles do mapa">
              <a class="soft-link" href="/roadmaps" on:click={(event) => navigate(event, '/roadmaps')}>
                Voltar
              </a>
              <div class="layout-switcher" aria-label="Tipo de visualização">
                <button type="button" class:active={mapLayout === 'horizontal'} on:click={() => (mapLayout = 'horizontal')}>
                  Horizontal
                </button>
                <button type="button" class:active={mapLayout === 'vertical'} on:click={() => (mapLayout = 'vertical')}>
                  Vertical
                </button>
                <button type="button" class:active={mapLayout === 'etapas'} on:click={() => (mapLayout = 'etapas')}>
                  Etapas
                </button>
              </div>
              <button type="button" class="soft-button" on:click={() => slideMap(-1)}>Esquerda</button>
              <button type="button" class="soft-button" on:click={() => slideMap(1)}>Direita</button>
            </div>
          </div>

          <div class="map-canvas" aria-label="Nós do roadmap">
            <div class="map-stats">
              <span>{orderedTopics.length} blocos</span>
              <span>{averageProgress}% geral</span>
              <span>{totalHours}h semanais</span>
            </div>

            <div class="map-hint" aria-label="Como interagir com o mapa">
              <strong>Arraste o ponto colorido</strong>
              <span>Use a alça circular de um nó e solte sobre outro para criar uma conexão visível.</span>
            </div>

            <form class="import-panel" on:submit|preventDefault={importRoadmap}>
              <div>
                <strong>Importar roadmap</strong>
                <small>Uma linha por tópico. Use `Título | Área | Prioridade` se quiser detalhar.</small>
              </div>
              <textarea
                bind:value={importText}
                placeholder={"HTML semântico | Frontend | Alta\nCSS responsivo | Frontend | Alta\nAPIs REST | Backend | Média"}
                aria-label="Lista de tópicos para importar"
              ></textarea>
              <button type="submit">Gerar nós</button>
            </form>

            {#if mapLayout === 'etapas'}
              <div class="stage-map" aria-label="Mapa por etapas">
                {#each roadmapGroups as group}
                  <section class="stage-lane">
                    <div class="stage-lane-head">
                      <strong>{group.status}</strong>
                      <span>{group.items.length}</span>
                    </div>

                    <div class="stage-node-list">
                      {#each group.items as topic}
                        <article
                          class={`roadmap-node stage-node ${areaClass(topic.area)}`}
                          class:dragging={draggingTopicId === topic.id}
                          class:connecting={connectionStartId === topic.id}
                          draggable="true"
                          on:dragstart={() => (draggingTopicId = topic.id)}
                          on:dragover|preventDefault
                          on:drop={() =>
                            connectionStartId ? dropConnection(topic) : reorderDraggedTopic(topic.id)}
                          on:dragend={() => (draggingTopicId = '')}
                        >
                          <button
                            type="button"
                            class="connection-handle"
                            draggable="true"
                            aria-label={`Conectar a partir de ${topic.title}`}
                            on:dragstart|stopPropagation={() => startConnection(topic)}
                            on:click={() => startConnection(topic)}
                          ></button>
                          <div class="node-topline">
                            <span>{String(Number(topic.order || 0) + 1).padStart(2, '0')}</span>
                            <small>{topic.area}</small>
                          </div>
                          <div>
                            <strong>{topic.title}</strong>
                            <small>{getTopicProgress(topic)}% concluído</small>
                          </div>
                          <div class="node-progress">
                            <div class="progress-track">
                              <span style={`width: ${getTopicProgress(topic)}%`}></span>
                            </div>
                          </div>
                          <div class="node-actions">
                            <span class="drag-chip">Arrastar</span>
                            <a href={`/roadmaps/${topic.id}`} on:click={(event) => navigate(event, `/roadmaps/${topic.id}`)}>
                              Abrir detalhes
                            </a>
                          </div>
                        </article>
                      {/each}
                    </div>
                  </section>
                {/each}
              </div>
            {:else}
              <div class="node-slider" class:vertical={mapLayout === 'vertical'} role="region" aria-label="Lista de nós do roadmap">
                <div class="node-track" class:vertical={mapLayout === 'vertical'}>
                  {#if mapLayout === 'horizontal'}
                    {#each orderedTopics as topic}
                      {#each topic.dependencies || [] as dependencyId}
                        {@const fromIndex = orderedTopics.findIndex((item) => item.id === dependencyId)}
                        {@const toIndex = orderedTopics.findIndex((item) => item.id === topic.id)}
                        {#if fromIndex >= 0 && toIndex >= 0}
                          <span
                            class="dependency-line"
                            style={`--from: ${fromIndex}; --to: ${toIndex}; --distance: ${Math.abs(toIndex - fromIndex) || 1}`}
                          ></span>
                        {/if}
                      {/each}
                    {/each}
                  {/if}
                  {#each orderedTopics as topic, index}
                    <article
                      class={`roadmap-node slide-node ${areaClass(topic.area)}`}
                      class:dragging={draggingTopicId === topic.id}
                      class:connecting={connectionStartId === topic.id}
                      draggable="true"
                      on:dragstart={() => (draggingTopicId = topic.id)}
                      on:dragover|preventDefault
                      on:drop={() =>
                        connectionStartId ? dropConnection(topic) : reorderDraggedTopic(topic.id)}
                      on:dragend={() => (draggingTopicId = '')}
                    >
                      <button
                        type="button"
                        class="connection-handle"
                        draggable="true"
                        aria-label={`Conectar a partir de ${topic.title}`}
                        on:dragstart|stopPropagation={() => startConnection(topic)}
                        on:click={() => startConnection(topic)}
                      ></button>
                      <div class="node-topline">
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <small>{topic.status}</small>
                      </div>
                      <div>
                        <strong>{topic.title}</strong>
                        <small>{topic.area} · {getTopicProgress(topic)}%</small>
                      </div>
                      <div class="node-progress">
                        <div class="progress-track">
                          <span style={`width: ${getTopicProgress(topic)}%`}></span>
                        </div>
                      </div>
                      <div class="node-actions">
                        <span class="drag-chip">Arrastar</span>
                        <a href={`/roadmaps/${topic.id}`} on:click={(event) => navigate(event, `/roadmaps/${topic.id}`)}>
                          Abrir detalhes
                        </a>
                      </div>
                    </article>
                  {/each}
                </div>
              </div>
            {/if}

            <div class="connection-panel" aria-label="Conexões manuais">
              <strong>Conexões manuais</strong>
              <div>
                {#each orderedTopics.filter((topic) => topic.dependencies?.length) as topic}
                  {#each topic.dependencies as dependencyId}
                    {@const dependency = topics.find((item) => item.id === dependencyId)}
                    {#if dependency}
                      <span>{dependency.title} → {topic.title}</span>
                    {/if}
                  {/each}
                {/each}
              </div>
            </div>
          </div>
        </section>
      {:else if currentPath === '/foco'}
        <section class="page-grid">
          <section class="section-block focus-panel">
            <p class="eyebrow">Agora</p>
            <h2>{nextTopic?.title || 'Nenhum bloco definido'}</h2>
            <p>{nextTopic?.nextAction || 'Crie um roadmap para começar.'}</p>

            {#if nextTopic}
              <div class="detail-progress">
                <div class="progress-track">
                  <span style={`width: ${getTopicProgress(nextTopic)}%`}></span>
                </div>
                <strong>{getTopicProgress(nextTopic)}%</strong>
              </div>

              <div class="checklist">
                {#each (nextTopic.steps || []).filter((step) => !step.done).slice(0, 4) as step}
                  <label class="check-item">
                    <input type="checkbox" checked={step.done} on:change={() => toggleStep(nextTopic, step.id)} />
                    <span>{step.title}</span>
                  </label>
                {/each}
              </div>
            {/if}
          </section>

          <aside class="section-block compact-panel">
            <p class="eyebrow">Materiais do foco</p>
            <div class="resource-list compact-list">
              {#each focusMaterials as resource}
                <article>
                  <div>
                    <span>{resource.type}</span>
                    <a href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a>
                  </div>
                </article>
              {/each}
            </div>
          </aside>
        </section>
      {:else if currentPath === '/semana'}
        <section class="page-grid">
          <section class="section-block">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Semana</p>
                <h2>Plano rápido</h2>
              </div>
              {#if !weeklyPlan.length}
                <button type="button" class="soft-button" on:click={createWeeklyPlan}>
                  Criar plano semanal
                </button>
              {:else if weeklyPlan.some((item) => item.day === 'Sáb' || item.day === 'Dom') === false}
                <button type="button" class="soft-button" on:click={addWeekendToWeeklyPlan}>
                  Adicionar fim de semana
                </button>
              {/if}
            </div>

            {#if weeklyPlan.length}
              <div class="week-board">
                {#each weeklyPlan as item}
                  <article>
                    <button type="button" class="week-card" on:click={() => openWeekDialog(item)}>
                      <span>{item.day}</span>
                      <div>
                        <strong>{item.focus || 'Definir foco'}</strong>
                        <small>{formatHours(item.hours)} reservadas</small>
                      </div>
                      <em>Personalizar</em>
                    </button>
                  </article>
                {/each}
              </div>
            {:else}
              <div class="empty-state">
                <strong>Nenhum plano semanal criado</strong>
                <p>Crie uma semana base para definir foco e horas reservadas por dia.</p>
                <button type="button" on:click={createWeeklyPlan}>Criar plano semanal</button>
              </div>
            {/if}
          </section>

          <aside class="section-block compact-panel">
            <p class="eyebrow">Resumo</p>
            <h2>{totalHours}h planejadas</h2>
            <p>
              {nextTopic?.title || 'Nenhum roadmap'} é o próximo foco. Use a página de roadmaps para
              ajustar prioridade, progresso e esforço semanal.
            </p>
            <a class="panel-link" href="/roadmaps" on:click={(event) => navigate(event, '/roadmaps')}>
              Revisar roadmaps
            </a>
          </aside>
        </section>

        {#if selectedWeekItem}
          <div class="modal-backdrop" role="presentation">
            <div
              class="week-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="week-dialog-title"
            >
              <div class="section-heading">
                <div>
                  <p class="eyebrow">{selectedWeekItem.day}</p>
                  <h2 id="week-dialog-title">Personalizar semana</h2>
                </div>
                <button type="button" class="ghost-button" on:click={closeWeekDialog}>Fechar</button>
              </div>

              <form class="week-dialog-form" on:submit|preventDefault={saveWeekDialog}>
                <label>
                  <span>Foco do dia</span>
                  <input bind:value={weekForm.focus} placeholder="Ex: Projeto prático" />
                </label>

                <label>
                  <span>Horas reservadas</span>
                  <input bind:value={weekForm.hours} min="0" step="1" type="number" />
                </label>

                <div class="dialog-actions">
                  <button type="button" class="soft-button" on:click={closeWeekDialog}>Cancelar</button>
                  <button type="submit">Salvar semana</button>
                </div>
              </form>
            </div>
          </div>
        {/if}
      {:else if currentPath === '/materiais'}
        <section class="page-grid">
          <section class="section-block">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Biblioteca</p>
                <h2>Materiais salvos</h2>
              </div>
            </div>

            <form class="resource-form" on:submit|preventDefault={addResource}>
              <div class="resource-type-picker" aria-label="Tipo de material">
                {#each resourceTypes as type}
                  <button type="button" class:active={resourceForm.type === type} on:click={() => (resourceForm.type = type)}>
                    {type}
                  </button>
                {/each}
              </div>
              <input bind:value={resourceForm.title} placeholder="Título do material" aria-label="Título" />
              <input bind:value={resourceForm.url} placeholder="https://..." aria-label="Link" />
              <div class="resource-row">
                <select bind:value={resourceForm.topicId} aria-label="Bloco vinculado">
                  <option value="">Vincular a um bloco</option>
                  {#each orderedTopics as topic}
                    <option value={topic.id}>{topic.title}</option>
                  {/each}
                </select>
                <input bind:value={resourceForm.topic} placeholder="Tema livre" aria-label="Tema" />
                <button type="submit">Salvar material</button>
              </div>
              <div class="resource-preview" aria-live="polite">
                <span>{resourceForm.type}</span>
                <strong>{resourceForm.title || 'Novo material'}</strong>
                <small>
                  {topics.find((topic) => topic.id === resourceForm.topicId)?.title || resourceForm.topic || 'Sem vínculo ainda'}
                </small>
              </div>
            </form>

            <div class="resource-list">
              {#each resources as resource}
                <article>
                  <div>
                    <span>{resource.type}</span>
                    <a href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a>
                    <small>{resource.topic}</small>
                  </div>
                  <button type="button" class="ghost-button" on:click={() => deleteResource(resource.id)}>
                    Remover
                  </button>
                </article>
              {/each}
            </div>
          </section>

          <aside class="section-block compact-panel">
            <p class="eyebrow">Organização</p>
            <h2>Materiais por bloco</h2>
            <div class="tag-cloud" aria-label="Temas dos materiais">
              {#each [...new Set(resources.map((resource) => resource.topic))] as topic}
                <span>{topic}</span>
              {/each}
            </div>
          </aside>
        </section>
      {/if}
    </section>
  </main>
{/if}
