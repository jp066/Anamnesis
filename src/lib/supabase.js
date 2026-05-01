import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        persistSession: true
      }
    })
  : null;

function getAuthRedirectUrl(nextPath = '/roadmaps') {
  const redirectUrl = new URL('/auth', window.location.origin);
  redirectUrl.searchParams.set('next', nextPath || '/roadmaps');
  return redirectUrl.toString();
}

function mapTopicRow(row) {
  return {
    id: row.id,
    title: row.title,
    area: row.area,
    status: row.status,
    priority: row.priority,
    progress: row.progress,
    nextAction: row.next_action,
    weeklyHours: row.weekly_hours,
    steps: Array.isArray(row.steps) ? row.steps : [],
    dependencies: Array.isArray(row.dependencies) ? row.dependencies : [],
    notes: row.notes || '',
    order: row.order_index
  };
}

function mapResourceRow(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    url: row.url,
    topic: row.topic,
    topicId: row.topic_id || ''
  };
}

function mapWeeklyPlanRow(row) {
  return {
    id: row.id,
    day: row.day,
    focus: row.focus,
    hours: Number(row.time || 0),
    order: row.order_index
  };
}

function mapTopicToRow(userId, topic) {
  return {
    id: topic.id,
    user_id: userId,
    title: topic.title,
    area: topic.area,
    status: topic.status,
    priority: topic.priority,
    progress: Number(topic.progress || 0),
    next_action: topic.nextAction || '',
    weekly_hours: Number(topic.weeklyHours || 0),
    steps: topic.steps || [],
    dependencies: topic.dependencies || [],
    notes: topic.notes || '',
    order_index: Number(topic.order || 0),
    updated_at: new Date().toISOString()
  };
}

function mapResourceToRow(userId, resource) {
  return {
    id: resource.id,
    user_id: userId,
    title: resource.title,
    type: resource.type,
    url: resource.url,
    topic: resource.topic,
    topic_id: resource.topicId || null,
    updated_at: new Date().toISOString()
  };
}

function mapWeeklyPlanToRow(userId, item) {
  return {
    id: item.id,
    user_id: userId,
    day: item.day,
    focus: item.focus || '',
    time: Number(item.hours || 0),
    order_index: Number(item.order || 0),
    updated_at: new Date().toISOString()
  };
}

function mapUserToRow(user) {
  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};

  return {
    user_id: user.id,
    nome: metadata.name || metadata.full_name || '',
    email: user.email || '',
    avatar_url: metadata.avatar_url || null,
    provider: appMetadata.provider || null,
    providers: Array.isArray(appMetadata.providers) ? appMetadata.providers : [],
    ultimo_login_em: user.last_sign_in_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function listenToAuth(callback) {
  if (!supabase) {
    callback(null);
    return () => {};
  }

  let mounted = true;

  supabase.auth
    .getSession()
    .then(({ data }) => {
      if (!mounted) return;
      callback(data.session?.user ?? null);
    })
    .catch((error) => {
      console.warn('Supabase session fetch failed.', error);
      if (mounted) callback(null);
    });

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => {
    mounted = false;
    data.subscription.unsubscribe();
  };
}

export async function saveUserProfile(user) {
  if (!supabase || !user) return;

  const { error } = await supabase.from('usuarios').upsert(mapUserToRow(user), {
    onConflict: 'user_id'
  });

  if (error) {
    console.warn('Supabase user profile save failed.', error);
    throw error;
  }
}

export async function loginWithGitHub(nextPath = '/roadmaps') {
  if (!supabase) return null;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: getAuthRedirectUrl(nextPath),
      scopes: 'read:user user:email'
    }
  });

  if (error) {
    console.warn('Supabase GitHub login failed.', error);
    throw error;
  }

  return true;
}

export async function loginWithEmail(email, password) {
  if (!supabase) return null;

  const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    console.warn('Supabase email login failed.', error);
    throw error;
  }

  return true;
}

export async function signUpWithEmail(email, password, name) {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl('/roadmaps'),
      data: {
        name
      }
    }
  });

  if (error) {
    console.warn('Supabase email sign up failed.', error);
    throw error;
  }

  return data;
}

export async function logout() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn('Supabase sign out failed.', error);
    throw error;
  }
}

export async function loadUserData(userId) {
  if (!supabase) return null;

  const [topicsResult, resourcesResult, weeklyPlanResult] = await Promise.all([
    supabase
      .from('roadmaps')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true }),
    supabase.from('resources').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('weekly_plans').select('*').eq('user_id', userId).order('order_index', { ascending: true })
  ]);

  if (topicsResult.error) {
    console.warn('Supabase roadmaps load failed.', topicsResult.error);
  }

  if (resourcesResult.error) {
    console.warn('Supabase resources load failed.', resourcesResult.error);
  }

  if (weeklyPlanResult.error) {
    console.warn('Supabase weekly plan load failed.', weeklyPlanResult.error);
  }

  return {
    topics: (topicsResult.data || []).map(mapTopicRow),
    resources: (resourcesResult.data || []).map(mapResourceRow),
    weeklyPlan: (weeklyPlanResult.data || []).map(mapWeeklyPlanRow)
  };
}

export async function saveTopic(userId, topic) {
  if (!supabase) return;

  const { error } = await supabase.from('roadmaps').upsert(mapTopicToRow(userId, topic), {
    onConflict: 'id'
  });

  if (error) {
    console.warn('Supabase roadmaps save failed.', error);
    throw error;
  }
}

export async function removeTopic(userId, topicId) {
  if (!supabase) return;

  const { error } = await supabase.from('roadmaps').delete().eq('id', topicId).eq('user_id', userId);
  if (error) {
    console.warn('Supabase roadmaps delete failed.', error);
    throw error;
  }
}

export async function saveResource(userId, resource) {
  if (!supabase) return;

  const { error } = await supabase.from('resources').upsert(mapResourceToRow(userId, resource), {
    onConflict: 'id'
  });

  if (error) {
    console.warn('Supabase resources save failed.', error);
    throw error;
  }
}

export async function saveWeeklyPlanItem(userId, item) {
  if (!supabase) return;

  const { error } = await supabase.from('weekly_plans').upsert(mapWeeklyPlanToRow(userId, item), {
    onConflict: 'user_id,day'
  });

  if (error) {
    console.warn('Supabase weekly plan save failed.', error);
    throw error;
  }
}

export async function removeResource(userId, resourceId) {
  if (!supabase) return;

  const { error } = await supabase.from('resources').delete().eq('id', resourceId).eq('user_id', userId);
  if (error) {
    console.warn('Supabase resources delete failed.', error);
    throw error;
  }
}
