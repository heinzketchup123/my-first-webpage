// Supabase Configuration
// Get these from: Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = "https://ndrkvyodqeqpopxkozov.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kcmt2eW9kcWVxcG9weGtvem92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTUyOTIsImV4cCI6MjEwNTkzMTI5Mn0.kqVCpk1YpXY9YIcyyljPlgdZzBgpo3YdNERCMlTMV8w";

let supabaseClient = null;
let isSupabaseConnected = false;

if (SUPABASE_URL !== "YOUR_SUPABASE_URL" && typeof supabase !== 'undefined') {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    isSupabaseConnected = true;
    console.log("⚡ Supabase Engine successfully initialized!");
  } catch (err) {
    console.error("Supabase init failed, running in local mode:", err);
  }
}

// Each theme has a separate palette per mode. Accents were picked so text in
// the accent color stays readable (at least 4.5:1 contrast) on that mode's
// background: bright accents on dark, deeper versions of the same hue on light.
// `on` is the text color used on solid accent buttons.
const THEMES = {
  cyber:      { dark: { accent: '#22d3ee', bg: '#070b11', on: '#041318' }, light: { accent: '#0e7490', bg: '#f2f7fa', on: '#ffffff' } },
  synthwave:  { dark: { accent: '#ff5fae', bg: '#0f0714', on: '#1e0612' }, light: { accent: '#be185d', bg: '#fbf3f7', on: '#ffffff' } },
  matrix:     { dark: { accent: '#4ade80', bg: '#050c08', on: '#03140a' }, light: { accent: '#15803d', bg: '#f2f8f4', on: '#ffffff' } },
  dracula:    { dark: { accent: '#c4a1ff', bg: '#120f1c', on: '#1a1033' }, light: { accent: '#6d28d9', bg: '#f6f3fc', on: '#ffffff' } },
  nordic:     { dark: { accent: '#88c0d0', bg: '#0d131b', on: '#0c1a22' }, light: { accent: '#2f6690', bg: '#f2f5f8', on: '#ffffff' } },
  orange:     { dark: { accent: '#fb923c', bg: '#110c08', on: '#1f0f03' }, light: { accent: '#c2410c', bg: '#fbf5f1', on: '#ffffff' } },
  crimson:    { dark: { accent: '#fb7185', bg: '#120709', on: '#22060c' }, light: { accent: '#be123c', bg: '#fbf3f4', on: '#ffffff' } },
  gold:       { dark: { accent: '#fbbf24', bg: '#100d06', on: '#1d1502' }, light: { accent: '#a16207', bg: '#faf7ef', on: '#ffffff' } },
  emerald:    { dark: { accent: '#34d399', bg: '#06100c', on: '#03170f' }, light: { accent: '#047857', bg: '#f1f8f5', on: '#ffffff' } },
  monochrome: { dark: { accent: '#e5e7eb', bg: '#0a0a0b', on: '#111113' }, light: { accent: '#18181b', bg: '#f4f4f5', on: '#ffffff' } }
};

// ---- small color helpers (hex in, hex/rgba out) ----
function hexToRgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
function rgbToHex(rgb) { return '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join(''); }
function mixHex(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); }
function rgbaOf(hex, alpha) { const [r, g, b] = hexToRgb(hex); return `rgba(${r}, ${g}, ${b}, ${alpha})`; }
function relLum(hex) {
  const w = [0.2126, 0.7152, 0.0722];
  return hexToRgb(hex).map(v => v / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * w[i], 0);
}
function contrastRatio(a, b) { const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
// Nudge a color toward `target` until it has at least `min` contrast against `bg`.
function ensureContrast(hex, bg, min, target) {
  let c = hex;
  for (let i = 0; i < 20 && contrastRatio(c, bg) < min; i++) c = mixHex(c, target, 0.1);
  return c;
}
function bestTextOn(hex) { return contrastRatio('#ffffff', hex) >= contrastRatio('#0b0f14', hex) ? '#ffffff' : '#0b0f14'; }

// Every color token the stylesheet uses, for one theme in one mode. A custom
// accent is adjusted per mode so it stays readable in both.
function buildPalette(themeName, customAccent, light) {
  const t = THEMES[themeName] || THEMES.cyber;
  const base = light ? t.light : t.dark;
  const bg = base.bg;
  let accent = base.accent;
  let on = base.on;
  if (customAccent && /^#[0-9a-f]{6}$/i.test(customAccent)) {
    accent = light
      ? ensureContrast(customAccent, '#ffffff', 4.8, '#000000')
      : ensureContrast(customAccent, mixHex(bg, '#ffffff', 0.08), 4.8, '#ffffff');
    on = bestTextOn(accent);
  }

  const shared = {
    '--bg-color': bg,
    '--accent-color': accent,
    '--text-on-accent': on
  };
  if (light) {
    return {
      ...shared,
      '--card-bg': '#ffffff',
      '--card-bg-solid': '#ffffff',
      '--input-bg': mixHex(bg, '#0f172a', 0.035),
      '--card-border': 'rgba(15, 23, 42, 0.09)',
      '--nav-bg': 'rgba(255, 255, 255, 0.86)',
      '--main-text-color': '#0f172a',
      '--sub-text-color': '#5a6477',
      '--accent-light': mixHex(accent, '#ffffff', 0.18),
      '--accent-muted': rgbaOf(accent, 0.1),
      '--accent-soft-border': rgbaOf(accent, 0.35),
      '--glow-shadow': `0 6px 18px -8px ${rgbaOf(accent, 0.5)}`,
      '--shadow-card': '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -14px rgba(15, 23, 42, 0.16)',
      '--shadow-pop': '0 24px 60px -20px rgba(15, 23, 42, 0.35)',
      '--bg-glow': rgbaOf(accent, 0.08),
      '--overlay-bg': 'rgba(15, 23, 42, 0.35)',
      '--danger': '#dc2626', '--success': '#15803d', '--warning': '#b45309', '--star': '#d97706'
    };
  }
  return {
    ...shared,
    '--card-bg': 'rgba(255, 255, 255, 0.045)',
    '--card-bg-solid': mixHex(bg, '#ffffff', 0.055),
    '--input-bg': 'rgba(255, 255, 255, 0.07)',
    '--card-border': 'rgba(255, 255, 255, 0.085)',
    '--nav-bg': rgbaOf(mixHex(bg, '#ffffff', 0.07), 0.88),
    '--main-text-color': '#edf1f7',
    '--sub-text-color': '#9ba5b7',
    '--accent-light': mixHex(accent, '#ffffff', 0.25),
    '--accent-muted': rgbaOf(accent, 0.14),
    '--accent-soft-border': rgbaOf(accent, 0.4),
    '--glow-shadow': `0 8px 22px -10px ${rgbaOf(accent, 0.6)}`,
    '--shadow-card': '0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 10px 28px -18px rgba(0, 0, 0, 0.7)',
    '--shadow-pop': '0 30px 70px -20px rgba(0, 0, 0, 0.75)',
    '--bg-glow': rgbaOf(accent, 0.12),
    '--overlay-bg': 'rgba(2, 4, 8, 0.6)',
    '--danger': '#ff6b6b', '--success': '#34d399', '--warning': '#fbbf24', '--star': '#fbbf24'
  };
}

function applyPalette(palette) {
  const root = document.documentElement;
  Object.entries(palette).forEach(([k, v]) => root.style.setProperty(k, v));
  // Phone status bar / browser chrome color follows the theme.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette['--bg-color']);
}

const defaultSettings = { lightMode: false, anonymous: true, autoSystemTheme: false };
const defaultAppearance = { themeName: 'cyber', mode: 'dark', fontSize: 1, density: 'normal', customColors: null, layout: 'auto' };
const DESKTOP_MIN_WIDTH = 960;   // Auto layout switches to the computer version at this width
const WIDE_MIN_WIDTH = 700;      // below this (phones) only the phone layout is available

// Human-facing metadata for the theme swatch grid.
const THEME_META = [
  { key: 'cyber',      label: 'Cyber' },
  { key: 'synthwave',  label: 'Synth' },
  { key: 'matrix',     label: 'Matrix' },
  { key: 'dracula',    label: 'Dracula' },
  { key: 'nordic',     label: 'Nordic' },
  { key: 'orange',     label: 'Solar' },
  { key: 'crimson',    label: 'Ruby' },
  { key: 'gold',       label: 'Gold' },
  { key: 'emerald',    label: 'Mint' },
  { key: 'monochrome', label: 'Mono' }
];

const FONT_SIZE_LABELS = ['Small', 'Medium', 'Large'];

let currentUser = null;       // display email string
let currentUserId = null;     // Supabase auth.users.id when signed in
let currentHandle = null;     // profile.handle when signed in
let currentSchoolId = null;   // profile.school_id when signed in
let currentSchool = null;     // {id, name, slug}
let schoolsCache = [];        // all schools known
let campusFeed = [];
let studyGroups = [];
let gpaCourses = [];
let dmMessages = [];           // messages for the currently-selected friend thread
let selectedFriendId = null;
let friends = [];              // [{friend_id, handle, display_name}]
let pendingIncoming = [];      // [{id, requester_id, handle, display_name}]
let pendingOutgoing = [];      // [{id, addressee_id, handle, display_name}]
let profileMap = {};           // user_id -> {handle, display_name}
let appSettings = { ...defaultSettings };

let currentPostCommentId = null;
let realtimeChannels = [];
let chatLive = false;          // true while live message updates are connected
let feedSort = 'new'; // 'new' | 'top' | 'comments'
let unreadNotifs = 0;
let appAppearance = { ...defaultAppearance };

document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  loadAppearance();
  applyAppearance();
  initSystemThemeListener();
  renderEmptyStates();
  loadPomo();
  syncDeviceAlertsToggle();
  applyAdminFolds();   // set folds while the card is still hidden, so nothing animates on load
  document.addEventListener('visibilitychange', markOpenThreadRead);
  document.addEventListener('visibilitychange', () => {
    // Back in the app with a chat open: pick up messages sent while away.
    if (!document.hidden && selectedFriendId && isViewActive('chat-view')) fetchDMs(selectedFriendId, { quiet: true });
  });
  let layoutTimer = null;
  try { localStorage.removeItem('iosFillScreen'); } catch (_) {}   // retired "fill the whole screen" test
  detectShortViewport();
  window.addEventListener('resize', () => {
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(() => { applyLayout(); detectShortViewport(); }, 120);
  });

  if (!isSupabaseConnected) {
    // Supabase misconfigured — surface it instead of silently degrading.
    showToast('Supabase not configured — sign-in disabled.', 'error', 6000);
    document.getElementById('auth-screen').style.display = 'flex';
    return;
  }

  // The school list is public; load it right away on every device.
  refreshSchoolsCache().then(() => { renderTeacherSchoolOptions(); renderAdminPanel(); });

  const boot = (session) => {
    if (session) {
      currentUser = session.user.email;
      currentUserId = session.user.id;
      document.getElementById('auth-screen').style.display = 'none';
      const nameDisplay = currentUser.split('@')[0];
      document.getElementById('user-welcome-title').textContent = `Welcome, ${nameDisplay}`;
      ensureProfile().finally(() => {
        initSupabaseRealtime();
        loadAllSupabaseData();
      });
    } else {
      currentUser = null;
      currentUserId = null;
      currentHandle = null;
      currentSchool = null;
      currentSchoolId = null;
      friends = []; pendingIncoming = []; pendingOutgoing = [];
      campusFeed = []; studyGroups = [];
      teacherDir = []; currentTeacher = null; teacherPosts = []; myReviewCount = 0;
      calEvents = []; calRsvps = {}; isAdmin = false;
      adminJoinRequests = []; adminJoinCodes = {}; myJoinRequests = {};
      resetFeedAndNotifState();
      updateSchoolChrome();
      document.getElementById('auth-screen').style.display = 'flex';
      renderEmptyStates();
    }
  };
  supabaseClient.auth.getSession().then(({ data: { session } }) => boot(session));
  supabaseClient.auth.onAuthStateChange((_ev, session) => boot(session));
});

// Paint empty states so the app is never a blank screen even before a
// fetch returns (or when the user is truly at zero rows).
function renderEmptyStates() {
  renderFeed();
  renderGroups();
  renderTeacherDirectory();
  renderCalendar();
  renderAdminPanel();
  renderGpaRows();
  renderFriendsStrip();
  renderDMThread();
  renderFriendsBadge();
  updateAnalytics();
  updateNotifBadge();
}

function resetFeedAndNotifState() {
  feedReactions = {}; myFeedReactions = new Set(); feedComments = {};
  notifications = []; notifFresh = new Set(); unreadNotifs = 0;
  document.getElementById('notif-drawer')?.classList.remove('open');
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Tapping a device alert focuses the app and opens that notification.
  navigator.serviceWorker.addEventListener('message', (ev) => {
    if (ev.data?.type === 'open-notification' && ev.data.id) openNotification(ev.data.id);
  });
  // When a new version takes over, reload once so the page isn't left
  // running the previous version's CSS/JS. Skipped on the very first install.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration skipped:', err));
}

function initSystemThemeListener() {
  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  darkModeMediaQuery.addEventListener('change', () => {
    // In "Auto" mode, follow the OS whenever it flips.
    if (appAppearance.mode === 'auto') applyAppearance();
  });
}

// Supabase Realtime Subscriptions Engine
// One channel per table: if one table is missing (say SCHEMA.sql hasn't been
// re-run yet), only that table stops updating live instead of all of them.
function initSupabaseRealtime() {
  if (realtimeChannels.length) return;

  const listen = (table, handler, onStatus) => {
    realtimeChannels.push(supabaseClient
      .channel('rt-' + table)
      .on('postgres_changes', { event: '*', schema: 'public', table }, handler)
      .subscribe(onStatus));
  };
  listen('campus_chat', p => onChatChanged(p), status => {
    const wasLive = chatLive;
    chatLive = status === 'SUBSCRIBED';
    // Catch up on anything sent while the live connection was down.
    if (chatLive && !wasLive && selectedFriendId) fetchDMs(selectedFriendId, { quiet: true });
  });
  listen('friendships', () => fetchFriendships());
  listen('campus_feed', () => fetchFeed());
  listen('feed_reactions', () => onFeedExtrasChanged());
  listen('feed_comments', () => onFeedExtrasChanged());
  listen('notifications', p => onNotificationChanged(p));
  listen('study_groups', () => fetchGroups());
  listen('study_group_members', () => fetchGroups());
  listen('teachers', () => onTeacherDataChanged());
  listen('teacher_posts', () => onTeacherDataChanged());
  listen('teacher_post_votes', () => onTeacherDataChanged());
  listen('campus_events', () => onEventsChanged());
  listen('event_rsvps', () => onEventsChanged());
  listen('school_join_requests', p => onJoinRequestChanged(p));
  listen('schools', () => onSchoolsChanged());
  listen('admins', () => onAdminsChanged());
  listen('school_bans', () => { if (isAdmin) fetchAdminMembers(); });
  startDmPolling();
}

async function loadAllSupabaseData() {
  await Promise.all([fetchFeed(), fetchGroups(), fetchFriendships(), fetchTeacherDirectory(),
                     fetchMyReviewCount(), fetchEvents(), fetchNotifications()]);
  loadGpa();
  updateNotifBadge();
}

async function fetchFeed() {
  const { data, error } = await supabaseClient
    .from('campus_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { showToast('Feed load failed: ' + error.message, 'error'); return; }
  campusFeed = data || [];
  await fetchFeedExtras();
  renderFeed();
  updateAnalytics();
}

async function fetchGroups() {
  const [{ data, error }, memRes] = await Promise.all([
    // Sorted client-side: older projects' study_groups table has no created_at.
    supabaseClient.from('study_groups').select('*'),
    supabaseClient.from('study_group_members').select('group_id, user_id')
  ]);
  if (error) { showToast('Groups load failed: ' + error.message, 'error'); return; }
  if (memRes?.error) console.warn('group members load failed:', memRes.error.message);

  // Who is in each group comes from the join table, so member counts, the
  // member list and "joined" are real per-person facts.
  const members = {};
  (memRes?.data || []).forEach(m => { (members[m.group_id] = members[m.group_id] || []).push(m.user_id); });
  groupMembers = members;

  studyGroups = (data || []).map(g => {
    const ids = members[g.id] || [];
    return { ...g, members: ids.length, joined: ids.includes(currentUserId) };
  }).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  renderGroups();
  refreshOpenGroup();

  // Names for the faces and member lists (profiles are readable by everyone).
  const ids = [...new Set(Object.values(members).flat().concat(studyGroups.map(g => g.creator_id)))].filter(Boolean);
  const before = Object.keys(profileMap).length;
  await fetchProfilesByIds(ids);
  if (Object.keys(profileMap).length !== before) { renderGroups(); refreshOpenGroup(); }
}

// -------------------- Study group creation / editing --------------------

let editingGroupId = null;     // set while the form is editing an existing group

function openCreateGroupModal(editId) {
  if (!currentUserId) return showToast('Sign in to create a study group.', 'warn');
  if (!currentSchoolId) return openSchoolPicker(true);
  const g = editId ? findGroup(editId) : null;
  editingGroupId = g ? String(g.id) : null;

  const form = document.querySelector('#groupModal form');
  form?.reset();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  if (g) {
    set('group-name', g.name); set('group-course', g.course);
    set('group-schedule', g.schedule); set('group-location', g.location);
    set('group-max', g.max || 6); set('group-topics', (g.topics || []).join(', '));
    closeModalForce();
  }
  document.getElementById('group-max').min = g ? Math.max(2, g.members) : 2;
  document.getElementById('group-modal-title').textContent = g ? 'Edit Study Group' : 'Create Study Group';
  document.getElementById('group-submit-btn').textContent = g ? 'Save Changes' : 'Create Group';
  document.getElementById('groupModal').style.display = 'flex';
  document.getElementById('group-name')?.focus();
}
function closeCreateGroupModal() {
  document.getElementById('groupModal').style.display = 'none';
  editingGroupId = null;
}

async function createGroup(event) {
  event.preventDefault();
  if (!currentUserId || !currentSchoolId) return;

  const name     = document.getElementById('group-name').value.trim();
  const course   = document.getElementById('group-course').value.trim();
  const schedule = document.getElementById('group-schedule').value.trim();
  const location = document.getElementById('group-location').value.trim();
  const max      = Math.max(2, Math.min(30, parseInt(document.getElementById('group-max').value, 10) || 6));
  const seenTopics = new Set();   // drop repeats, ignoring capitals
  const topics   = document.getElementById('group-topics').value.split(',').map(s => s.trim())
    .filter(t => t && !seenTopics.has(t.toLowerCase()) && seenTopics.add(t.toLowerCase())).slice(0, 12);
  if (!name || !course) return showToast('Give the group a name and a course.', 'warn');

  const btn = document.getElementById('group-submit-btn');
  if (btn) btn.disabled = true;
  try {
    if (editingGroupId) {
      const g = findGroup(editingGroupId);
      if (g && max < g.members) {
        return showToast(`${g.members} people are already in this group, so the limit can't be lower than that.`, 'warn', 4500);
      }
      const { data, error } = await supabaseClient.from('study_groups')
        .update({ name, course, schedule, location, max, topics })
        .eq('id', editingGroupId).select('id');
      if (error || !data?.length) return showToast('Could not save: ' + (error?.message || 'only the host can edit this group'), 'error');
      const id = editingGroupId;
      showToast('Group updated.', 'success');
      closeCreateGroupModal();
      await fetchGroups();
      openGroupDetailModal(id);
      return;
    }

    const host = currentHandle || currentUser.split('@')[0];
    const { data, error } = await supabaseClient
      .from('study_groups')
      .insert([{
        name, course, schedule, location, max,
        topics, roster: [host],
        host,
        creator_id: currentUserId,
        school_id: currentSchoolId
      }])
      .select().single();
    if (error) return showToast('Could not create group: ' + error.message, 'error');

    // Auto-join the creator as the first member.
    await supabaseClient.from('study_group_members').insert([{ group_id: data.id, user_id: currentUserId }]);

    showToast('Group created — you\'re in!', 'success');
    closeCreateGroupModal();
    event.target.reset();
    fetchGroups();
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Authentication Handlers
function toggleAuthMode() {
  document.getElementById('login-form').classList.toggle('hidden');
  document.getElementById('signup-form').classList.toggle('hidden');
}

async function handleAuth(event) {
  event.preventDefault();
  if (!isSupabaseConnected) return showToast('Sign-in is not available right now.', 'error');

  const isSignup = !document.getElementById('signup-form').classList.contains('hidden');
  try {
    if (isSignup) {
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const display_name = document.getElementById('signup-name').value.trim() || email.split('@')[0];
      const { data, error } = await supabaseClient.auth.signUp({
        email, password,
        options: { data: { display_name } }
      });
      if (error) return showToast('Sign up failed: ' + error.message, 'error', 5000);
      if (!data?.session) {
        // Project may require email confirmation. Try to sign in anyway;
        // if that fails, tell the user to confirm and try again.
        const { error: signInErr } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (signInErr) {
          showToast('Account created — check your inbox to confirm, then sign in.', 'info', 6000);
        }
      }
    } else {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) return showToast('Login failed: ' + error.message, 'error', 4500);
    }
  } catch (err) {
    showToast('Auth error: ' + err.message, 'error');
  }
}

async function logout() {
  ['login-email','login-password','signup-name','signup-email','signup-password']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  if (isSupabaseConnected) {
    try { await supabaseClient.auth.signOut(); } catch (_) {}
  }
  currentUser = null; currentUserId = null; currentHandle = null;
  currentSchool = null; currentSchoolId = null;
  friends = []; pendingIncoming = []; pendingOutgoing = [];
  campusFeed = []; studyGroups = []; gpaCourses = [];
  gpaState = { mode: 'unweighted', prevGpa: '', prevCredits: '', target: '' };
  ['gpa-prev', 'gpa-prev-credits', 'gpa-target'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  groupFilter = 'all'; groupMembers = {};
  selectedFriendId = null; dmMessages = [];
  teacherDir = []; currentTeacher = null; teacherPosts = []; myReviewCount = 0;
  calEvents = []; calRsvps = {}; isAdmin = false;
  adminJoinRequests = []; adminJoinCodes = {}; myJoinRequests = {};
  adminMembers = []; adminBans = []; adminIds = new Set(); adminMembersSchoolId = null;
  resetFeedAndNotifState();
  updateSchoolChrome();
  switchTab('home-view');
  renderEmptyStates();

  const authScreen = document.getElementById('auth-screen');
  if (authScreen) authScreen.style.display = 'flex';
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  if (loginForm && signupForm) {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
  }
  showToast('Signed out.', 'info');
}

// Theme Engine
function saveAppearance() {
  localStorage.setItem('appearance', JSON.stringify(appAppearance));
}

function loadAppearance() {
  const raw = localStorage.getItem('appearance');
  if (!raw) return;
  try { appAppearance = { ...defaultAppearance, ...JSON.parse(raw) }; }
  catch (_) { appAppearance = { ...defaultAppearance }; }
}

function applyAppearance() {
  // 1) Light/dark mode (respects "auto" via prefers-color-scheme)
  const wantsLight = appAppearance.mode === 'light'
    || (appAppearance.mode === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches);
  appSettings.lightMode = wantsLight;
  document.body.classList.toggle('light-mode', wantsLight);

  // 2) Theme palette for the current mode (a custom accent overrides the theme's)
  applyPalette(buildPalette(appAppearance.themeName, customAccent(), wantsLight));

  // 3) Font size scale (0/1/2 → small/medium/large). Applied to <html>
  // because the stylesheet sizes text in rem, which is relative to the root.
  const fsRaw = Number(appAppearance.fontSize);
  const fs = [0, 1, 2].includes(fsRaw) ? fsRaw : 1;   // not `|| 1`: that turned Small (0) into Medium
  document.documentElement.classList.remove('fs-small', 'fs-medium', 'fs-large');
  document.documentElement.classList.add(['fs-small', 'fs-medium', 'fs-large'][fs]);
  const fsLabel = document.getElementById('font-size-label');
  if (fsLabel) fsLabel.textContent = FONT_SIZE_LABELS[fs];
  const fsSlider = document.getElementById('font-size-slider');
  if (fsSlider) fsSlider.value = String(fs);

  // 4) Density
  document.body.classList.remove('density-compact','density-normal','density-spacious');
  document.body.classList.add(`density-${appAppearance.density}`);

  // 5) Sync the active-state on segmented controls
  document.querySelectorAll('#mode-segmented .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === appAppearance.mode);
  });
  document.querySelectorAll('#density-segmented .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.density === appAppearance.density);
  });

  // 6) Phone or computer layout
  applyLayout();

  renderThemeSwatchGrid();
  syncCustomColorPickers();
}

// Saved custom accent, if any (older saves stored it as `main`).
function customAccent() {
  const c = appAppearance.customColors;
  return c ? (c.accent || c.main || null) : null;
}

function renderThemeSwatchGrid() {
  const grid = document.getElementById('theme-swatch-grid');
  if (!grid) return;
  const light = !!appSettings.lightMode;
  grid.innerHTML = THEME_META.map(t => {
    // Preview each theme as it will actually look in the current mode.
    const p = buildPalette(t.key, null, light);
    const bg = p['--bg-color'], accent = p['--accent-color'];
    const surface = light ? '#ffffff' : mixHex(bg, '#ffffff', 0.09);
    const active = t.key === appAppearance.themeName && !customAccent();
    return `
      <button class="theme-swatch ${active ? 'active' : ''}" onclick="applyTheme('${t.key}')" aria-label="${t.label} theme">
        <span class="swatch-preview" style="background:${bg};">
          <span class="swatch-bar" style="background:${surface};"><span style="background:${accent};"></span></span>
          <span class="swatch-dot" style="background:${accent};"></span>
        </span>
        <span class="swatch-label">${t.label}</span>
        ${active ? '<i class="fa-solid fa-check swatch-check"></i>' : ''}
      </button>
    `;
  }).join('');
}

function syncCustomColorPickers() {
  const picker = document.getElementById('picker-main');
  const theme = THEMES[appAppearance.themeName] || THEMES.cyber;
  if (picker) picker.value = customAccent() || theme[appSettings.lightMode ? 'light' : 'dark'].accent;
  const reset = document.getElementById('custom-accent-reset');
  if (reset) reset.style.display = customAccent() ? 'inline-flex' : 'none';
}

function applyTheme(name) {
  appAppearance.themeName = name;
  appAppearance.customColors = null;
  saveAppearance();
  applyAppearance();
}

function updateTheme() {
  const accent = document.getElementById('picker-main').value;
  appAppearance.customColors = { accent };
  saveAppearance();
  applyAppearance();
}

function resetCustomAccent() {
  appAppearance.customColors = null;
  saveAppearance();
  applyAppearance();
}

function setColorMode(mode, btn) {
  appAppearance.mode = mode;
  saveAppearance();
  applyAppearance();
}

function setFontSize(size) {
  appAppearance.fontSize = Number(size);
  saveAppearance();
  applyAppearance();
}

function setDensity(mode, btn) {
  appAppearance.density = mode;
  saveAppearance();
  applyAppearance();
}

// The computer layout (sidebar + wide, multi-column pages) is turned on by
// a class on <html>, so it can follow the screen width or be picked by hand.
function applyLayout() {
  const pref = ['auto', 'phone', 'desktop'].includes(appAppearance.layout) ? appAppearance.layout : 'auto';
  // Phones are always too narrow for the sidebar, so the choice only
  // applies (and is only offered) on screens at least WIDE_MIN_WIDTH wide.
  const wide = window.innerWidth >= WIDE_MIN_WIDTH;
  const desktop = wide && (pref === 'desktop' || (pref === 'auto' && window.innerWidth >= DESKTOP_MIN_WIDTH));
  document.documentElement.classList.toggle('wide-screen', wide);
  document.documentElement.classList.toggle('layout-desktop', desktop);
  document.documentElement.classList.toggle('layout-phone', !desktop);
  document.querySelectorAll('#layout-segmented .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.layout === pref);
  });
}

// Installed iPhone app: work out which kind of status bar iOS gave us.
// - Solid bar (safe-area top inset is 0): iOS paints the bar in the page's
//   background colour and sizes the app to the rest of the screen, so the
//   CSS just keeps the app's top edge that same flat colour (.ios-solid-bar).
// - See-through bar (an icon added while black-translucent was used): iOS 26
//   draws from the top of the screen but sizes the app one status bar short,
//   leaving an undrawable strip at the bottom (WebKit bug 301108). Detected
//   by comparing window and screen heights (.ios-short-viewport); if Apple
//   fixes the bug the numbers match and nothing changes.
function detectShortViewport() {
  const root = document.documentElement;
  if (!root.classList.contains('ios-standalone') || !document.body) {
    root.classList.remove('ios-short-viewport', 'ios-solid-bar');
    return;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;padding-top:var(--safe-top);visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  const safeTop = probe.offsetHeight;
  probe.remove();
  const portrait = window.innerHeight >= window.innerWidth;
  const screenH = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
  const missing = screenH - window.innerHeight;
  root.classList.toggle('ios-solid-bar', safeTop === 0);
  root.classList.toggle('ios-short-viewport', safeTop > 0 && missing > 0 && Math.abs(missing - safeTop) <= 4);
}

function setLayout(layout) {
  appAppearance.layout = layout;
  saveAppearance();
  applyLayout();
}

// One-click switch from the sidebar / top bar: flip to the other layout.
function toggleLayoutQuick() {
  const toDesktop = !document.documentElement.classList.contains('layout-desktop');
  setLayout(toDesktop ? 'desktop' : 'phone');
  showToast(toDesktop ? 'Computer layout on. Switch back from the sidebar or Settings.'
                      : 'Phone layout on. Switch back in Settings → Layout.', 'info', 3500);
}

function resetAppearance() {
  appAppearance = { ...defaultAppearance };
  saveAppearance();
  applyAppearance();
}

function togglePrefSection(headerEl) {
  headerEl.parentElement.classList.toggle('collapsed');
}

// Keep the legacy per-preset function names since older HTML may still call them.
function setCyberTheme()      { applyTheme('cyber'); }
function setSynthwaveTheme()  { applyTheme('synthwave'); }
function setMatrixTheme()     { applyTheme('matrix'); }
function setDraculaTheme()    { applyTheme('dracula'); }
function setNordicTheme()     { applyTheme('nordic'); }
function setOrangeTheme()     { applyTheme('orange'); }
function setCrimsonTheme()    { applyTheme('crimson'); }
function setGoldTheme()       { applyTheme('gold'); }
function setEmeraldTheme()    { applyTheme('emerald'); }
function setMonochromeTheme() { applyTheme('monochrome'); }

function loadSavedSettings() { applyAppearance(); }

function toggleSettingSwitch(listItem, key) {
  const toggle = listItem.querySelector('.toggle-btn');
  toggle.classList.toggle('active');
  appSettings[key] = toggle.classList.contains('active');
}

// Tab Navigation
function switchTab(viewId, element) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(viewId).classList.add('active-view');
  // A teacher page lives under the Teachers tab in the nav.
  const navView = viewId === 'teacher-view' ? 'search-view' : viewId;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === navView));
  document.querySelector('.content-container')?.scrollTo(0, 0);

  if (viewId === 'chat-view') {
    renderFriendsStrip(); renderDMThread({ toBottom: true, instant: true }); markOpenThreadRead();
    if (selectedFriendId) fetchDMs(selectedFriendId, { quiet: true });   // catch up on anything missed
  }
  if (viewId === 'search-view') {
    // Keep the top-bar search (computer layout) showing the same text.
    const g = document.getElementById('global-search');
    const p = document.getElementById('teacher-search-input');
    if (g && p && g.value !== p.value) g.value = p.value;
    fetchTeacherDirectory();
  }
  if (viewId === 'events-view') { fetchEvents(); }
  if (viewId === 'settings-view') { renderAdminPanel(); if (isAdmin) fetchAdminMembers(); }
}

// -------------------- Notifications --------------------
// Rows in `notifications` are written by database triggers when someone
// messages you, likes / reacts to / comments on your post, sends or accepts
// a friend request, joins your group, RSVPs to your event, finds your
// teacher post helpful, or (admins) asks to join a school.
// The bell counts everything except messages; unread messages show on the
// Chat tab and on each friend instead, and clear when you open the chat.
let notifications = [];
let notifsReady = null;          // false until SCHEMA.sql section 6h has been run
let notifFresh = new Set();      // highlighted as "new" while the drawer is open
let notifRefreshTimer = null;

function notifDrawerOpen() { return document.getElementById('notif-drawer')?.classList.contains('open'); }

async function fetchNotifications() {
  if (!currentUserId || !isSupabaseConnected) { notifications = []; return; }
  const { data, error } = await supabaseClient.from('notifications')
    .select('*').order('created_at', { ascending: false }).limit(60);
  if (error) { notifsReady = false; notifications = []; }
  else { notifsReady = true; notifications = data || []; }
  markOpenThreadRead();
  updateNotifBadgeFromState();
  renderFriendsStrip();
  if (notifDrawerOpen()) renderNotifications();
}

function onNotificationChanged(payload) {
  const row = payload?.new;
  if (row && row.id && row.user_id === currentUserId && !row.read_at) {
    const known = notifications.find(n => n.id === row.id);
    const isNew = !known || known.times !== row.times || known.created_at !== row.created_at;
    if (isNew) {
      const viewingThread = row.kind === 'dm' && !document.hidden
        && isViewActive('chat-view') && selectedFriendId === row.ref_id;
      if (row.kind === 'dm' && selectedFriendId === row.ref_id) fetchDMs(selectedFriendId, { quiet: true });
      if (!viewingThread) {
        const text = notifPlainText(row);
        // Tapping the pop-up opens it (the chat, the post, …).
        const open = () => {
          if (!notifications.some(n => n.id === row.id)) notifications.unshift(row);
          openNotification(row.id);
        };
        if (row.kind !== 'dm' || !isViewActive('chat-view')) showToast(text, 'info', 4000, open);
        showDeviceAlert(row, text);
      }
      // An admin removed me from my school: the database already cut access,
      // so reload my profile (opens the school picker) and clear the old data.
      if (row.kind === 'removed_from_school' && row.ref_id === currentSchoolId) {
        ensureProfile().then(() => loadAllSupabaseData());
      }
    }
  }
  clearTimeout(notifRefreshTimer);
  notifRefreshTimer = setTimeout(fetchNotifications, 200);
}

function toggleNotifications(force) {
  const drawer = document.getElementById('notif-drawer');
  const open = typeof force === 'boolean' ? force : !drawer.classList.contains('open');
  drawer.classList.toggle('open', open);
  if (!open) { notifFresh.clear(); return; }
  if (notifsReady) {
    notifFresh = new Set(notifications.filter(n => !n.read_at).map(n => n.id));
    renderNotifications();
    markNotificationsRead(n => n.kind !== 'dm');   // messages clear when you open the chat
  } else {
    renderNotifications();
    unreadNotifs = 0;
    updateNotifBadge();
  }
}

async function markNotificationsRead(pred) {
  if (!notifsReady) return;
  const ids = notifications.filter(n => !n.read_at && (!pred || pred(n))).map(n => n.id);
  if (!ids.length) return;
  const now = new Date().toISOString();
  notifications.forEach(n => { if (ids.includes(n.id)) n.read_at = now; });
  updateNotifBadgeFromState();
  renderFriendsStrip();
  const { error } = await supabaseClient.from('notifications').update({ read_at: now }).in('id', ids);
  if (error) console.warn('mark read failed:', error.message);
}

// Opening a chat marks that friend's message notifications as read.
function markOpenThreadRead() {
  if (!selectedFriendId || document.hidden || !isViewActive('chat-view')) return;
  if (notifications.some(n => n.kind === 'dm' && n.ref_id === selectedFriendId && !n.read_at)) {
    markNotificationsRead(n => n.kind === 'dm' && n.ref_id === selectedFriendId);
  }
}

async function clearNotifications() {
  if (!notifsReady || !notifications.length) return;
  const ids = notifications.map(n => n.id);
  notifications = [];
  notifFresh.clear();
  renderNotifications();
  updateNotifBadgeFromState();
  renderFriendsStrip();
  const { error } = await supabaseClient.from('notifications').delete().in('id', ids);
  if (error) { showToast('Could not clear: ' + error.message, 'error'); fetchNotifications(); }
}

function unreadDmCount(friendId) {
  return notifications.filter(n => n.kind === 'dm' && !n.read_at && (!friendId || n.ref_id === friendId))
    .reduce((sum, n) => sum + (n.times || 1), 0);
}

function describeNotif(n) {
  const times = n.times || 1;
  const who = (!n.actor_id && times > 1)
    ? `<strong>${times} people</strong>`
    : `<strong>${escapeHtml(n.actor_name || 'Someone')}</strong>`;
  const post = (t) => t ? `your post “${escapeHtml(t)}”` : 'your post';
  const em = REACTIONS.find(r => r.key === n.meta)?.em || '';
  switch (n.kind) {
    case 'dm':             return { icon: 'fa-comment',        html: `${who} sent you ${times > 1 ? times + ' messages' : 'a message'}`, sub: n.body };
    case 'like':           return { icon: 'fa-heart',          html: `${who} liked ${post(n.body)}` };
    case 'reaction':       return { icon: 'fa-face-smile',     html: `${who} reacted ${em} to ${post(n.body)}` };
    case 'comment':        return { icon: 'fa-comment-dots',   html: `${who} ${times > 1 ? `left ${times} comments on` : 'commented on'} ${post(n.meta)}`, sub: n.body };
    case 'friend_request': return { icon: 'fa-user-plus',      html: `${who} sent you a friend request`, sub: 'Tap to respond' };
    case 'friend_accept':  return { icon: 'fa-user-check',     html: `${who} accepted your friend request`, sub: 'Tap to say hi' };
    case 'join_request':   return { icon: 'fa-school',         html: `${who} asked to join <strong>${escapeHtml(n.body || 'a school')}</strong>`, sub: 'Tap to review' };
    case 'join_decision':  return n.meta === 'approved'
      ? { icon: 'fa-circle-check', html: `You were approved to join <strong>${escapeHtml(n.body || 'your school')}</strong>` }
      : { icon: 'fa-circle-xmark', html: `Your request to join <strong>${escapeHtml(n.body || 'the school')}</strong> was declined` };
    case 'group_join':     return { icon: 'fa-user-group',     html: `${who} joined your study group <strong>${escapeHtml(n.body || '')}</strong>` };
    case 'helpful':        return { icon: 'fa-thumbs-up',      html: `${times > 1 ? `<strong>${times} people</strong>` : 'Someone'} found your teacher post helpful`, sub: n.body };
    case 'event_rsvp':     return { icon: 'fa-calendar-check', html: `<strong>${times} ${times === 1 ? 'person is' : 'people are'}</strong> going to <strong>${escapeHtml(n.body || 'your event')}</strong>` };
    case 'promoted':       return { icon: 'fa-shield-halved',  html: `${who} made you an admin`, sub: 'Admin tools are in Me → Admin' };
    case 'removed_from_school': return { icon: 'fa-user-slash', html: `An admin removed you from <strong>${escapeHtml(n.body || 'your school')}</strong>`, sub: 'Tap to pick a school' };
    default:              return { icon: 'fa-bell',           html: escapeHtml(n.body || 'New activity') };
  }
}

function notifPlainText(n) {
  const tmp = document.createElement('div');
  tmp.innerHTML = describeNotif(n).html;
  return tmp.textContent;
}

async function openNotification(id) {
  const n = notifications.find(x => x.id === id);
  if (!n) return;
  toggleNotifications(false);
  markNotificationsRead(x => x.id === id);
  switch (n.kind) {
    case 'dm':
    case 'friend_accept':
      switchTab('chat-view');
      if (friends.some(f => f.friend_id === n.ref_id)) selectFriend(n.ref_id);
      break;
    case 'like': case 'reaction': case 'comment':
      openFeedPost(n.ref_id, n.kind === 'comment');
      break;
    case 'friend_request':
      openFriendsModal();
      setFriendsTab('requests');
      break;
    case 'join_request':
      showAdminCard('requests');
      break;
    case 'join_decision':
      switchTab('settings-view');
      break;
    case 'group_join':  switchTab('groups-view'); openGroupDetailModal(n.ref_id); break;
    case 'event_rsvp':  switchTab('events-view'); break;
    case 'helpful':     if (n.meta) openTeacherPage(n.meta); break;
    case 'promoted':    showAdminCard(); break;
    case 'removed_from_school': openSchoolPicker(!currentSchoolId); break;
  }
}

function openFeedPost(postId, showComments) {
  switchTab('home-view');
  const post = findPost(postId);
  if (!post) return showToast('That post is no longer in your feed.', 'info');
  if (showComments) return openCommentsModal(post.id);
  const el = [...document.querySelectorAll('#feed-container .feed-post')]
    .find(a => a.dataset.postId === String(post.id));
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 1600);
}

// ---- Device alerts: a system pop-up while the app is open in the background ----
function deviceAlertsOn() {
  try {
    return localStorage.getItem('deviceAlerts') === 'on'
      && 'Notification' in window && Notification.permission === 'granted';
  } catch (_) { return false; }
}

function syncDeviceAlertsToggle() {
  document.getElementById('alerts-toggle')?.classList.toggle('active', deviceAlertsOn());
}

async function toggleDeviceAlerts() {
  if (!('Notification' in window)) {
    return showToast("This browser can't show alerts. On iPhone, add the app to your Home Screen first.", 'warn', 6000);
  }
  if (deviceAlertsOn()) {
    try { localStorage.setItem('deviceAlerts', 'off'); } catch (_) {}
    syncDeviceAlertsToggle();
    return showToast('Device alerts off.', 'info');
  }
  const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (perm !== 'granted') {
    syncDeviceAlertsToggle();
    return showToast('Alerts are blocked — allow notifications for this site in your browser settings.', 'warn', 6000);
  }
  try { localStorage.setItem('deviceAlerts', 'on'); } catch (_) {}
  syncDeviceAlertsToggle();
  showToast("Device alerts on — you'll get a pop-up while the app is open in the background.", 'success', 5000);
}

function showDeviceAlert(n, text) {
  if (!deviceAlertsOn() || !document.hidden) return;
  const opts = { body: text, tag: n.id, data: { nid: n.id } };
  const fallback = () => { try { new Notification('Campus Pulse', opts); } catch (_) {} };
  if (!navigator.serviceWorker) return fallback();
  navigator.serviceWorker.getRegistration()
    .then(reg => reg ? reg.showNotification('Campus Pulse', opts) : fallback())
    .catch(fallback);
}

function renderNotifications() {
  const body = document.getElementById('notif-body');
  if (!body) return;
  const clearBtn = document.getElementById('notif-clear-btn');
  if (clearBtn) clearBtn.style.display = notifsReady && notifications.length ? 'inline-flex' : 'none';

  if (notifsReady) {
    body.innerHTML = notifications.length ? notifications.map(n => {
      const d = describeNotif(n);
      const unread = !n.read_at || notifFresh.has(n.id);
      return `
        <button class="notif-item ${unread ? 'unread' : ''}" onclick="openNotification('${escapeAttr(n.id)}')">
          <span class="notif-icon-wrap"><i class="fa-solid ${d.icon}"></i></span>
          <span class="notif-text">
            <span class="notif-line">${d.html}</span>
            ${d.sub ? `<span class="notif-sub">${escapeHtml(d.sub)}</span>` : ''}
            <small>${escapeHtml(timeAgo(n.created_at))}</small>
          </span>
          ${unread ? '<span class="notif-dot" aria-label="New"></span>' : ''}
        </button>`;
    }).join('') : `
      <div class="notif-empty">
        <i class="fa-solid fa-bell-slash"></i>
        <p>${currentUserId ? "You're all caught up." : 'Sign in to see notifications.'}</p>
      </div>`;
    return;
  }

  // Older database without the notifications table: show what we can work out.
  const items = [];
  pendingIncoming.forEach(r => {
    items.push(`
      <div class="notif-item">
        <i class="fa-solid fa-user-plus notif-icon"></i>
        <div>
          <strong>Friend request</strong>
          <p>${escapeHtml(r.display_name || r.handle)} wants to connect.</p>
        </div>
      </div>`);
  });
  if (isAdmin && adminJoinRequests.length) {
    const n = adminJoinRequests.length;
    items.push(`
      <div class="notif-item" style="cursor:pointer;" onclick="toggleNotifications(); showAdminCard('requests');">
        <i class="fa-solid fa-user-check notif-icon"></i>
        <div>
          <strong>School join request${n === 1 ? '' : 's'}</strong>
          <p>${n} student${n === 1 ? ' is' : 's are'} waiting for approval. Tap to review.</p>
        </div>
      </div>`);
  }
  body.innerHTML = items.length ? items.join('') : `
    <div class="notif-empty">
      <i class="fa-solid fa-bell-slash"></i>
      <p>You're all caught up.</p>
    </div>`;
}
function updateNotifBadgeFromState() {
  unreadNotifs = notifsReady
    ? notifications.filter(n => !n.read_at && n.kind !== 'dm').length
    : pendingIncoming.length + (isAdmin ? adminJoinRequests.length : 0);
  updateNotifBadge();
  const chatBadge = document.getElementById('chat-nav-badge');
  if (chatBadge) {
    const dms = notifsReady ? unreadDmCount() : 0;
    chatBadge.textContent = dms > 9 ? '9+' : String(dms);
    chatBadge.style.display = dms > 0 ? 'inline-flex' : 'none';
  }
}

// Chat Engine — security-hardened
//
// Client-side we defend against the attacks we CAN defend against here:
// XSS via HTML injection in message text or username, dangerous link
// targets, spam, and oversized payloads. The Supabase anon key is public,
// so anyone can insert rows — for real trust guarantees, add Row Level
// Security in Supabase so INSERTs must satisfy:
//   auth.uid() IS NOT NULL
//   AND length(text) BETWEEN 1 AND 280
//   AND user_id = auth.uid()
// Everything below assumes the DB may still hand us malicious rows.

const CHAT_MAX_LEN = 280;
const CHAT_MAX_NAME_LEN = 32;
// Spam guard only (e.g. a key held down). Normal back-and-forth never hits it:
// 10 messages in 10 seconds is faster than anyone types.
const CHAT_RATE_MAX = 10;            // messages
const CHAT_RATE_WINDOW_MS = 10_000;  // per 10s window
let chatSendTimestamps = [];         // sliding window of recent send times

// Turn arbitrary user content into safe HTML: escape first, then autolink
// only http/https URLs, and mark every anchor as noopener/noreferrer so a
// target page can never reach back into the opener.
function renderSafeMessage(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(
    /\b(https?:\/\/[^\s<]+)/gi,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow ugc">${url}</a>`
  );
}

// Sanitize a displayed username: strip everything that isn't printable
// text, collapse whitespace, cap length. Prevents markup and control
// characters even before HTML escaping catches the rest.
function sanitizeName(name) {
  if (typeof name !== 'string') return 'Student';
  const cleaned = name
    .replace(/[ -<>]/g, '')  // controls + angle brackets
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CHAT_MAX_NAME_LEN);
  return cleaned || 'Student';
}

function updateChatCounter() {
  const input = document.getElementById('app-chat-input');
  const counter = document.getElementById('chat-char-counter');
  if (!input || !counter) return;
  const len = input.value.length;
  counter.textContent = `${len}/${CHAT_MAX_LEN}`;
  counter.classList.toggle('near-limit', len >= CHAT_MAX_LEN - 60);   // only shown near the limit
  counter.classList.toggle('over-limit', len >= CHAT_MAX_LEN);
}

// -------------------- Profiles + Friends ---------------------

async function ensureProfile() {
  if (!isSupabaseConnected || !currentUserId) return;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('handle, display_name, school_id')
    .eq('user_id', currentUserId)
    .maybeSingle();
  if (!error && data) {
    currentHandle = data.handle;
    currentSchoolId = data.school_id || null;
    profileMap[currentUserId] = { handle: data.handle, display_name: data.display_name };
  }
  await refreshSchoolsCache();
  // (Reset when there's no school, e.g. after an admin removed me from it.)
  currentSchool = currentSchoolId ? (schoolsCache.find(s => s.id === currentSchoolId) || null) : null;
  updateSchoolChrome();
  await Promise.all([fetchAdminStatus(), fetchMyJoinRequests()]);
  // If signed in without a school, open the picker before doing anything else.
  if (currentUserId && !currentSchoolId) openSchoolPicker(true);
}

// The school list is public: it loads on every device, signed in or not.
// Returns true on success; on failure the picker shows a Retry button
// instead of looking like there are no schools.
let schoolsLoadState = 'idle';   // 'idle' | 'loading' | 'ok' | 'error'
let schoolsLoadError = '';
let myJoinRequests = {};         // school_id -> 'pending' | 'approved' | 'denied'
let pickerCodeSchoolId = null;   // school whose join-code box is open in the picker

async function refreshSchoolsCache() {
  if (!isSupabaseConnected) { schoolsLoadState = 'error'; schoolsLoadError = 'Offline'; return false; }
  schoolsLoadState = 'loading';
  let { data, error } = await supabaseClient
    .from('schools').select('id, name, slug, join_mode, allowed_domains').order('name');
  if (error && /join_mode|allowed_domains/.test(error.message)) {
    // Database not migrated yet — fall back to the basic columns.
    ({ data, error } = await supabaseClient.from('schools').select('id, name, slug').order('name'));
  }
  if (error) {
    schoolsLoadState = 'error';
    schoolsLoadError = error.message;
    return false;
  }
  schoolsCache = (data || []).map(s => ({ join_mode: 'open', allowed_domains: [], ...s }));
  schoolsLoadState = 'ok';
  if (currentSchoolId) currentSchool = schoolsCache.find(s => s.id === currentSchoolId) || currentSchool;
  return true;
}

async function fetchMyJoinRequests() {
  myJoinRequests = {};
  if (!isSupabaseConnected || !currentUserId) return;
  const { data } = await supabaseClient
    .from('school_join_requests').select('school_id, status').eq('user_id', currentUserId);
  (data || []).forEach(r => { myJoinRequests[r.school_id] = r.status; });
}

function joinRuleLabel(s) {
  switch (s.join_mode) {
    case 'code':     return { icon: 'key',          text: 'Join code needed' };
    case 'domain':   return { icon: 'envelope',     text: 'Needs @' + (s.allowed_domains || []).join(' / @') + ' email' };
    case 'approval': return { icon: 'user-check',   text: 'Admin approval needed' };
    default:         return { icon: 'lock-open',    text: 'Open to join' };
  }
}

function updateSchoolChrome() {
  const welcome = document.getElementById('user-welcome-title');
  if (welcome && currentUser) {
    const name = currentUser.split('@')[0];
    welcome.textContent = currentSchool
      ? `${name} · ${currentSchool.name}`
      : `Welcome Back, ${name}`;
  }
  const label = document.getElementById('current-school-label');
  if (label) label.textContent = currentSchool ? currentSchool.name : 'No school set';

  // Computer layout: school chip in the top bar + profile card in the sidebar
  const schoolName = currentSchool ? currentSchool.name : (currentUserId ? 'Pick a school' : 'No school');
  const chip = document.getElementById('topbar-school');
  if (chip) chip.textContent = schoolName;
  const who = currentUserId ? (currentHandle || (currentUser || '').split('@')[0] || 'Student') : 'Not signed in';
  const nameEl = document.getElementById('sidebar-user-name');
  if (nameEl) nameEl.textContent = who;
  const schoolEl = document.getElementById('sidebar-user-school');
  if (schoolEl) schoolEl.textContent = schoolName;
  const av = document.getElementById('sidebar-avatar');
  if (av) av.textContent = currentUserId ? who[0].toUpperCase() : '?';
}

// Top-bar search (computer layout): searches teachers from any page.
function globalTeacherSearch(value) {
  const input = document.getElementById('teacher-search-input');
  if (input) input.value = value;
  if (value.trim() && !isViewActive('search-view')) {
    switchTab('search-view');
    document.getElementById('global-search')?.focus();
  }
  renderTeacherDirectory();
}

// Home side panels (computer layout): next few events + my study groups.
function renderHomeSide() {
  const up = document.getElementById('home-upcoming');
  if (up) {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const next = calEvents.filter(e => new Date(e.starts_at) >= startOfToday).slice(0, 3);
    up.innerHTML = next.length ? next.map(e => {
      const d = new Date(e.starts_at);
      const when = e.all_day ? 'All day' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return `
        <button class="side-item" onclick="switchTab('events-view'); selectCalDay('${dayKey(d)}')">
          <span class="side-date"><small>${d.toLocaleDateString([], { month: 'short' })}</small><b>${d.getDate()}</b></span>
          <span class="side-text"><strong>${escapeHtml(e.title)}</strong>
            <small>${dayKey(d) === dayKey(new Date()) ? 'Today' : d.toLocaleDateString([], { weekday: 'short' })} · ${when}</small></span>
        </button>`;
    }).join('') : `<p class="side-empty">No upcoming events. <button class="text-btn" onclick="openEventModal()">Add one</button></p>`;
  }
  const gr = document.getElementById('home-groups');
  if (gr) {
    const mine = studyGroups.filter(g => g.joined).slice(0, 3);
    gr.innerHTML = mine.length ? mine.map(g => `
      <button class="side-item" onclick="openGroupDetailModal('${escapeAttr(g.id)}')">
        <span class="side-icon"><i class="fa-solid fa-book-open"></i></span>
        <span class="side-text"><strong>${escapeHtml(g.name || '')}</strong>
          <small>${escapeHtml(g.course || '')}${g.schedule ? ' · ' + escapeHtml(g.schedule) : ''}</small></span>
      </button>`).join('')
      : `<p class="side-empty">You're not in any groups yet. <button class="text-btn" onclick="switchTab('groups-view')">Find one</button></p>`;
  }
}

// -------------------- School picker --------------------

async function openSchoolPicker(required) {
  const modal = document.getElementById('schoolModal');
  if (!modal) return;
  modal.dataset.required = required ? '1' : '0';
  document.getElementById('school-picker-cancel').style.display = required ? 'none' : 'inline-flex';
  document.getElementById('school-picker-status').textContent = '';
  pickerCodeSchoolId = null;
  renderSchoolPicker();
  modal.style.display = 'flex';
  // Always refresh on open so schools added on another device show up.
  await Promise.all([refreshSchoolsCache(), fetchMyJoinRequests()]);
  renderSchoolPicker();
}
function closeSchoolPicker() {
  const modal = document.getElementById('schoolModal');
  if (!modal || modal.dataset.required === '1') return; // must pick
  modal.style.display = 'none';
}
async function retrySchoolList() {
  renderSchoolPicker();
  await refreshSchoolsCache();
  renderSchoolPicker();
  renderAdminPanel();
  renderTeacherSchoolOptions();
}

function setPickerStatus(msg, kind) {
  const el = document.getElementById('school-picker-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'friends-status' + (kind ? ' ' + kind : '');
}

function renderSchoolPicker() {
  const list = document.getElementById('school-picker-list');
  if (!list) return;

  if (!schoolsCache.length && schoolsLoadState === 'loading') {
    list.innerHTML = `<p class="friends-empty-inner"><i class="fa-solid fa-spinner fa-spin"></i> Loading schools…</p>`;
    return;
  }
  if (!schoolsCache.length && schoolsLoadState === 'error') {
    list.innerHTML = `<div class="friends-empty-inner">
      <p>Couldn't load the school list.</p>
      <small class="school-load-err">${escapeHtml(schoolsLoadError)}</small>
      <button class="secondary-btn school-retry-btn" onclick="retrySchoolList()"><i class="fa-solid fa-rotate-right"></i> Try again</button>
    </div>`;
    return;
  }

  const q = (document.getElementById('school-picker-search')?.value || '').toLowerCase();
  const rows = schoolsCache.filter(s => !q || s.name.toLowerCase().includes(q) || s.slug.includes(q));
  if (!rows.length) {
    list.innerHTML = `<p class="friends-empty-inner">${q ? `No schools match "${escapeHtml(q)}".` : 'No schools yet.'}</p>`;
    return;
  }

  list.innerHTML = rows.map(s => {
    const rule = joinRuleLabel(s);
    const current = s.id === currentSchoolId;
    const req = myJoinRequests[s.id];
    const note = current ? 'Your school'
      : req === 'pending' ? 'Request pending'
      : req === 'denied' && s.join_mode === 'approval' ? 'Request denied — ask an admin'
      : rule.text;
    const codeBox = pickerCodeSchoolId === s.id ? `
      <div class="school-code-row">
        <input id="school-code-input" class="auth-input" placeholder="Join code" maxlength="40" autocomplete="off"
               onkeydown="if (event.key === 'Enter') submitSchoolCode()" />
        <button class="primary-btn" onclick="submitSchoolCode()">Join</button>
      </div>` : '';
    return `
      <div class="school-row-wrap">
        <button class="school-row ${current ? 'active' : ''}" onclick="pickSchool('${escapeAttr(s.id)}')">
          <i class="fa-solid fa-graduation-cap"></i>
          <div class="school-row-text">
            <strong>${escapeHtml(s.name)}</strong>
            <small><i class="fa-solid fa-${current ? 'check' : req === 'pending' ? 'hourglass-half' : rule.icon}"></i> ${escapeHtml(note)}</small>
          </div>
          ${current ? '<i class="fa-solid fa-check"></i>' : ''}
        </button>
        ${codeBox}
      </div>`;
  }).join('');
  if (pickerCodeSchoolId) setTimeout(() => document.getElementById('school-code-input')?.focus(), 30);
}

function pickSchool(schoolId) {
  if (!isSupabaseConnected || !currentUserId) return showToast('Sign in to join a school.', 'warn');
  const s = schoolsCache.find(x => x.id === schoolId);
  if (!s) return;
  if (schoolId === currentSchoolId) return closeSchoolPicker();
  if (s.join_mode === 'code' && !isAdmin) {
    pickerCodeSchoolId = pickerCodeSchoolId === schoolId ? null : schoolId;
    setPickerStatus('');
    return renderSchoolPicker();
  }
  return joinSchool(schoolId);
}

function submitSchoolCode() {
  const code = document.getElementById('school-code-input')?.value.trim();
  if (!code) return setPickerStatus('Enter the join code your school gave you.', 'err');
  joinSchool(pickerCodeSchoolId, code);
}

async function joinSchool(schoolId, code = null) {
  const s = schoolsCache.find(x => x.id === schoolId);
  setPickerStatus(`Joining ${s?.name || 'school'}…`);
  const { data, error } = await supabaseClient.rpc('join_school', { target: schoolId, code });

  if (error) {
    // Database not migrated yet: fall back to the old direct update.
    if (/join_school/.test(error.message) && /(function|schema cache)/i.test(error.message)) {
      const { error: e2 } = await supabaseClient.from('profiles').update({ school_id: schoolId }).eq('user_id', currentUserId);
      if (e2) return setPickerStatus('Could not join: ' + e2.message, 'err');
    } else {
      return setPickerStatus(error.message, 'err');
    }
  } else if (data === 'pending') {
    myJoinRequests[schoolId] = 'pending';
    renderSchoolPicker();
    setPickerStatus(`Request sent to join ${s?.name}. An admin will review it — you'll get in automatically once approved.`, 'ok');
    return;
  }

  currentSchoolId = schoolId;
  currentSchool = s || null;
  pickerCodeSchoolId = null;
  updateSchoolChrome();
  const modal = document.getElementById('schoolModal');
  modal.dataset.required = '0';
  modal.style.display = 'none';
  showToast(`Joined ${s?.name || 'school'}.`, 'success');
  // Reload everything now that the RLS view of the world changed.
  loadAllSupabaseData();
  renderAdminPanel();
}

async function createSchoolFromInput() {
  if (!isSupabaseConnected || !currentUserId) return;
  const nameInput = document.getElementById('school-picker-new');
  const name = (nameInput?.value || '').replace(/\s+/g, ' ').trim();
  setPickerStatus('');
  if (name.length < 2) return setPickerStatus('Give the school a real name.', 'err');
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  if (slug.length < 2) return setPickerStatus("That name doesn't produce a valid handle.", 'err');

  const existing = schoolsCache.find(s => s.name.toLowerCase() === name.toLowerCase() || s.slug === slug);
  if (existing) {
    setPickerStatus(`${existing.name} already exists — tap it above to join.`, 'err');
    return;
  }
  const { data, error } = await supabaseClient
    .from('schools')
    .insert([{ name, slug, created_by: currentUserId }])
    .select().single();
  if (error) return setPickerStatus('Could not create: ' + error.message, 'err');
  schoolsCache.push({ join_mode: 'open', allowed_domains: [], ...data });
  schoolsCache.sort((a, b) => a.name.localeCompare(b.name));
  nameInput.value = '';
  await joinSchool(data.id);
}

async function fetchProfilesByIds(ids) {
  const missing = ids.filter(id => id && !profileMap[id]);
  if (!missing.length || !isSupabaseConnected) return;
  const { data } = await supabaseClient
    .from('profiles')
    .select('user_id, handle, display_name')
    .in('user_id', missing);
  (data || []).forEach(p => { profileMap[p.user_id] = { handle: p.handle, display_name: p.display_name }; });
}

async function fetchFriendships() {
  if (!isSupabaseConnected || !currentUserId) return;
  const { data, error } = await supabaseClient
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);
  if (error) { console.warn('friendships fetch failed:', error.message); return; }

  const ids = new Set();
  (data || []).forEach(f => { ids.add(f.requester_id); ids.add(f.addressee_id); });
  await fetchProfilesByIds([...ids]);

  friends = []; pendingIncoming = []; pendingOutgoing = [];
  (data || []).forEach(f => {
    const otherId = f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
    const prof = profileMap[otherId] || { handle: otherId.slice(0,8), display_name: 'Unknown' };
    if (f.status === 'accepted') {
      friends.push({ friend_id: otherId, ...prof });
    } else if (f.status === 'pending') {
      if (f.addressee_id === currentUserId) {
        pendingIncoming.push({ id: f.id, requester_id: f.requester_id, ...prof });
      } else {
        pendingOutgoing.push({ id: f.id, addressee_id: f.addressee_id, ...prof });
      }
    }
  });

  renderFriendsStrip();
  renderFriendsBadge();
  renderFriendsModalIfOpen();
  updateNotifBadgeFromState();
  renderNotifications();
}

async function sendFriendRequestFromInput() {
  const input = document.getElementById('friends-add-input');
  const status = document.getElementById('friends-add-status');
  const raw = (input?.value || '').trim().toLowerCase().replace(/^@/, '');
  if (!raw) return;
  status.textContent = '';
  if (!isSupabaseConnected || !currentUserId) {
    status.textContent = 'Sign in with an account to send real friend requests.';
    status.className = 'friends-status err';
    return;
  }
  if (raw === currentHandle) {
    status.textContent = "You can't friend yourself.";
    status.className = 'friends-status err';
    return;
  }
  const { data: prof } = await supabaseClient
    .from('profiles').select('user_id, handle, display_name').eq('handle', raw).maybeSingle();
  if (!prof) {
    status.textContent = `No user found with handle "${escapeHtml(raw)}".`;
    status.className = 'friends-status err';
    return;
  }
  const { error } = await supabaseClient.from('friendships').insert([{
    requester_id: currentUserId, addressee_id: prof.user_id, status: 'pending'
  }]);
  if (error) {
    status.textContent = 'Could not send request: ' + error.message;
    status.className = 'friends-status err';
    return;
  }
  status.textContent = `Request sent to ${escapeHtml(prof.display_name || raw)}.`;
  status.className = 'friends-status ok';
  input.value = '';
  fetchFriendships();
}

async function respondFriendRequest(id, accept) {
  if (!isSupabaseConnected) return;
  const { error } = await supabaseClient
    .from('friendships')
    .update({ status: accept ? 'accepted' : 'blocked', responded_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return showToast('Could not update request: ' + error.message, 'error');
  fetchFriendships();
}

async function cancelFriendRequest(id) {
  if (!isSupabaseConnected) return;
  await supabaseClient.from('friendships').delete().eq('id', id);
  fetchFriendships();
}

async function unfriend(friendId) {
  if (!isSupabaseConnected) return;
  if (!confirm('Unfriend this person? Your message history stays visible to both of you until deleted.')) return;
  await supabaseClient
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${currentUserId},addressee_id.eq.${friendId}),`+
      `and(requester_id.eq.${friendId},addressee_id.eq.${currentUserId})`
    );
  if (selectedFriendId === friendId) { selectedFriendId = null; dmMessages = []; renderDMThread(); }
  fetchFriendships();
}

// -------------------- Friend UI rendering --------------------

function renderFriendsStrip() {
  const strip = document.getElementById('friends-strip');
  if (!strip) return;
  const list = currentUserId ? friends : [];
  if (!list.length) {
    strip.innerHTML = `
      <div class="friends-empty">
        <i class="fa-solid fa-user-plus"></i>
        <div class="friends-empty-text">
          <span>${currentUserId ? 'No friends yet — add someone to start a private conversation.' : 'Sign in to message your friends.'}</span>
          ${currentUserId ? '<button class="primary-btn friends-empty-btn" onclick="openFriendsModal()">+ Add Friend</button>' : ''}
        </div>
      </div>`;
    return;
  }
  strip.innerHTML = list.map(f => {
    const unread = unreadDmCount(f.friend_id);
    return `
    <button class="friend-chip ${f.friend_id === selectedFriendId ? 'active' : ''}" onclick="selectFriend('${escapeAttr(f.friend_id)}')">
      <span class="friend-avatar">${escapeHtml((f.display_name || f.handle || '?')[0].toUpperCase())}${unread
        ? `<span class="chip-unread" aria-label="${unread} unread">${unread > 9 ? '9+' : unread}</span>` : ''}</span>
      <span class="friend-name">${escapeHtml(f.display_name || f.handle)}</span>
    </button>`;
  }).join('');
}

function escapeAttr(v) { return String(v).replace(/'/g, '&#39;').replace(/"/g, '&quot;'); }

function renderFriendsBadge() {
  const badge = document.getElementById('friends-badge');
  const tabBadge = document.getElementById('friends-tab-badge');
  const count = pendingIncoming.length;
  [badge, tabBadge].forEach(el => {
    if (!el) return;
    if (count > 0) { el.textContent = count > 9 ? '9+' : String(count); el.style.display = 'inline-flex'; }
    else el.style.display = 'none';
  });
}

function openFriendsModal() {
  document.getElementById('friendsModal').style.display = 'flex';
  setFriendsTab('list', document.querySelector('.friends-tab[data-tab="list"]'));
}
function closeFriendsModal() {
  document.getElementById('friendsModal').style.display = 'none';
}

function setFriendsTab(tab, btn) {
  document.querySelectorAll('.friends-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  ['list','requests','add'].forEach(k => {
    document.getElementById(`friends-tab-${k}`).classList.toggle('hidden', k !== tab);
  });
  renderFriendsModalIfOpen();
}

function renderFriendsModalIfOpen() {
  const modal = document.getElementById('friendsModal');
  if (!modal || modal.style.display !== 'flex') { renderFriendsBadge(); return; }
  const listBody = document.getElementById('friends-list-body');
  const rin = document.getElementById('friends-requests-in');
  const rout = document.getElementById('friends-requests-out');

  const emptyMsg = (m) => `<p class="friends-empty-inner">${escapeHtml(m)}</p>`;
  if (listBody) {
    listBody.innerHTML = friends.length
      ? friends.map(f => `
          <div class="friend-row">
            <span class="friend-avatar">${escapeHtml((f.display_name || f.handle)[0].toUpperCase())}</span>
            <div class="friend-row-text">
              <strong>${escapeHtml(f.display_name || f.handle)}</strong>
              <small>@${escapeHtml(f.handle)}</small>
            </div>
            <button class="secondary-btn friend-btn-sm" onclick="unfriend('${escapeAttr(f.friend_id)}')">Unfriend</button>
          </div>`).join('')
      : emptyMsg(currentUserId ? "No friends yet — send a request from the Add tab." : "Sign in to see your friends.");
  }
  if (rin) {
    rin.innerHTML = pendingIncoming.length
      ? pendingIncoming.map(r => `
          <div class="friend-row">
            <span class="friend-avatar">${escapeHtml((r.display_name || r.handle)[0].toUpperCase())}</span>
            <div class="friend-row-text">
              <strong>${escapeHtml(r.display_name || r.handle)}</strong>
              <small>@${escapeHtml(r.handle)}</small>
            </div>
            <button class="primary-btn friend-btn-sm"   onclick="respondFriendRequest('${escapeAttr(r.id)}', true)">Accept</button>
            <button class="secondary-btn friend-btn-sm" onclick="respondFriendRequest('${escapeAttr(r.id)}', false)">Decline</button>
          </div>`).join('')
      : emptyMsg('No incoming requests.');
  }
  if (rout) {
    rout.innerHTML = pendingOutgoing.length
      ? pendingOutgoing.map(r => `
          <div class="friend-row">
            <span class="friend-avatar">${escapeHtml((r.display_name || r.handle)[0].toUpperCase())}</span>
            <div class="friend-row-text">
              <strong>${escapeHtml(r.display_name || r.handle)}</strong>
              <small>@${escapeHtml(r.handle)} · pending</small>
            </div>
            <button class="secondary-btn friend-btn-sm" onclick="cancelFriendRequest('${escapeAttr(r.id)}')">Cancel</button>
          </div>`).join('')
      : emptyMsg('No outgoing requests.');
  }
  renderFriendsBadge();
}

// -------------------- Direct Messages ------------------------

async function selectFriend(friendId) {
  if (friendId !== selectedFriendId) dmMessages = [];
  selectedFriendId = friendId;
  renderFriendsStrip();
  markOpenThreadRead();
  await fetchDMs(friendId);
}

let dmFetchSeq = 0;
let dmLastPoll = 0;
let dmPollTimer = null;
let dmRenderedFor = null;      // whose thread is on screen (to jump to the newest message on open)
let dmShown = new Set();       // message ids already drawn, so only new ones animate in
let dmAutoScrollUntil = 0;

function inThread(msg, friendId) {
  return (msg.sender_id === currentUserId && msg.recipient_id === friendId)
      || (msg.sender_id === friendId && msg.recipient_id === currentUserId);
}

// Confirmed messages in time order, then any still sending at the end.
function setThread(list) {
  const done = list.filter(m => !m.pending)
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
  dmMessages = done.concat(list.filter(m => m.pending));
}

// A message still sending that this saved row is the copy of.
function pendingMatch(list, row) {
  return list.find(m => m.pending && m.sender_id === row.sender_id
    && m.recipient_id === row.recipient_id && m.text === row.text);
}

async function fetchDMs(friendId, opts = {}) {
  if (!friendId || !currentUserId || !isSupabaseConnected) {
    dmMessages = []; renderDMThread(); return;
  }
  const seq = ++dmFetchSeq;
  const startedAt = Date.now();
  dmLastPoll = startedAt;
  // Newest 200, so long conversations still show their latest messages.
  const { data, error } = await supabaseClient
    .from('campus_chat')
    .select('*')
    .or(
      `and(sender_id.eq.${currentUserId},recipient_id.eq.${friendId}),`+
      `and(sender_id.eq.${friendId},recipient_id.eq.${currentUserId})`
    )
    .order('created_at', { ascending: false })
    .limit(200);
  // Ignore a slow answer once a newer one was asked for, or after switching chats.
  if (seq !== dmFetchSeq || friendId !== selectedFriendId) return;
  if (error) {
    if (!opts.quiet) showToast('Could not load messages: ' + error.message, 'error');
    if (!data) return;
  }
  const rows = data || [];
  const ids = new Set(rows.map(m => m.id));
  const known = new Set(dmMessages.map(m => m.id));
  const fresh = rows.filter(r => !known.has(r.id));
  const saved = m => {
    const r = fresh.find(r => !r._was && r.sender_id === m.sender_id && r.recipient_id === m.recipient_id && r.text === m.text);
    if (r) r._was = m.id;
    return !!r;
  };
  // Keep messages that arrived while this was loading, and ones still sending.
  const keep = dmMessages.filter(m => inThread(m, friendId) && !ids.has(m.id)
    && (m.pending ? !saved(m) : (m._addedAt || 0) > startedAt));
  const before = dmMessages.map(m => m.id).join();
  setThread(rows.concat(keep));
  if (dmMessages.map(m => m.id).join() !== before || dmRenderedFor !== friendId) renderDMThread();
}

// Live update from the database.
function onChatChanged(payload) {
  if (!selectedFriendId) return;
  const row = payload?.new;
  if (payload?.eventType === 'INSERT' && row?.id) {
    if (inThread(row, selectedFriendId)) addDmToThread(row);
    return;
  }
  fetchDMs(selectedFriendId, { quiet: true });   // a deleted message, or something we can't place
}

function addDmToThread(row) {
  if (!inThread(row, selectedFriendId) || dmMessages.some(m => m.id === row.id)) return;
  const list = dmMessages.slice();
  const stand = pendingMatch(list, row);
  if (stand) list.splice(list.indexOf(stand), 1);
  list.push({ ...row, _addedAt: Date.now(), _was: stand && stand.id });
  setThread(list);
  renderDMThread();
}

// Backup for live updates: while a chat is open, check for new messages every
// few seconds if the live connection is down (and now and then even if it's up).
function startDmPolling() {
  if (dmPollTimer) return;
  dmPollTimer = setInterval(() => {
    if (!selectedFriendId || !currentUserId || !isSupabaseConnected) return;
    if (document.hidden || !isViewActive('chat-view')) return;
    if (Date.now() - dmLastPoll >= (chatLive ? 20000 : 4000)) fetchDMs(selectedFriendId, { quiet: true });
  }, 2000);
}

function renderChatThreadHead() {
  const head = document.getElementById('chat-thread-head');
  if (!head) return;
  const f = friends.find(x => x.friend_id === selectedFriendId);
  if (!f) { head.style.display = 'none'; head.innerHTML = ''; return; }
  const name = f.display_name || f.handle || 'Friend';
  head.style.display = 'flex';
  head.innerHTML = `
    <span class="friend-avatar">${escapeHtml(name[0].toUpperCase())}</span>
    <div class="chat-thread-who">
      <strong>${escapeHtml(name)}</strong>
      <small>${f.handle ? '@' + escapeHtml(f.handle) : 'Friend'}</small>
    </div>`;
}

function chatDayLabel(d) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((today - day) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return day.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

// Messages from the same person within 5 minutes are grouped: tighter
// spacing, and only the last one in a run shows the time.
function sameRun(a, b) {
  if (!a || !b || a.sender_id !== b.sender_id || !a.created_at || !b.created_at) return false;
  const ta = new Date(a.created_at), tb = new Date(b.created_at);
  return Math.abs(tb - ta) < 5 * 60e3 && ta.toDateString() === tb.toDateString();
}

function renderDMThread(opts = {}) {
  const box = document.getElementById('app-chat-messages');
  if (!box) return;
  renderChatThreadHead();
  // Stay at the newest message unless you've scrolled up to read older ones.
  const onScreen = dmRenderedFor === selectedFriendId;   // same chat as last time
  const stick = opts.toBottom || !onScreen || Date.now() < dmAutoScrollUntil
    || box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  const prevTop = box.scrollTop;
  dmRenderedFor = selectedFriendId;
  if (!onScreen) dmShown = new Set();

  const input = document.getElementById('app-chat-input');
  if (input) {
    input.disabled = !selectedFriendId;
    input.placeholder = selectedFriendId ? 'Message…' : 'Pick a friend to message';
  }

  if (!selectedFriendId) {
    box.innerHTML = `<div class="chat-empty">
      <i class="fa-regular fa-comments"></i>
      <p>${friends.length ? 'Pick a friend above to start chatting.' : 'Add a friend to start a private conversation.'}</p>
    </div>`;
    updateChatCounter();
    return;
  }

  if (!dmMessages.length) {
    const f = friends.find(x => x.friend_id === selectedFriendId);
    box.innerHTML = `<div class="chat-empty">
      <i class="fa-regular fa-hand"></i>
      <p>Say hi to ${escapeHtml(f?.display_name || f?.handle || 'your friend')}!</p>
    </div>`;
    updateChatCounter();
    return;
  }

  let html = '';
  let lastDay = '';
  dmMessages.forEach((msg, i) => {
    const when = msg.created_at ? new Date(msg.created_at) : null;
    if (when && when.toDateString() !== lastDay) {
      lastDay = when.toDateString();
      html += `<div class="chat-day"><span>${chatDayLabel(when)}</span></div>`;
    }
    const mine = msg.sender_id === currentUserId;
    const withPrev = sameRun(dmMessages[i - 1], msg);
    const withNext = sameRun(msg, dmMessages[i + 1]);
    const time = msg.pending ? 'Sending…'
      : escapeHtml(when ? when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : String(msg.time || ''));
    // Animate only what's new since the last draw; a sent message that was
    // already showing as "Sending…" just fades up instead of popping in again.
    const motion = !onScreen || dmShown.has(msg.id) ? ''
      : (msg._was && dmShown.has(msg._was)) ? ' settled' : ' anim-in';
    html += `
      <div class="chat-bubble ${mine ? 'chat-bubble-mine' : 'chat-bubble-other'}${withPrev ? ' grouped' : ''}${withNext ? ' has-next' : ''}${msg.pending ? ' pending' : ''}${motion}">
        <div class="chat-text">${renderSafeMessage(String(msg.text || '').slice(0, CHAT_MAX_LEN))}</div>
        ${withNext && !msg.pending ? '' : `<span class="chat-time">${time}</span>`}
      </div>`;
  });
  box.innerHTML = html;
  dmShown = new Set(dmMessages.map(m => m.id));
  if (stick && onScreen && !opts.instant) {
    // Glide down to a new message. While that's under way, later updates
    // keep following it rather than thinking you'd scrolled up.
    dmAutoScrollUntil = Date.now() + 900;
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  } else {
    box.style.scrollBehavior = 'auto';   // opening a chat jumps straight to the newest message
    box.scrollTop = stick ? box.scrollHeight : prevTop;
    box.style.scrollBehavior = '';
  }
  updateChatCounter();
}

async function sendDM(event) {
  event.preventDefault();
  const input = document.getElementById('app-chat-input');
  if (!input) return;

  if (!selectedFriendId) return showToast('Pick a friend to message first.', 'warn');

  let text = String(input.value || '').replace(/\s+/g, ' ').trim();
  if (!text) return;
  if (text.length > CHAT_MAX_LEN) text = text.slice(0, CHAT_MAX_LEN);

  const now = performance.now();
  chatSendTimestamps = chatSendTimestamps.filter(t => now - t < CHAT_RATE_WINDOW_MS);
  if (chatSendTimestamps.length >= CHAT_RATE_MAX) {
    const waitMs = CHAT_RATE_WINDOW_MS - (now - chatSendTimestamps[0]);
    showToast(`Slow down — ${Math.ceil(waitMs/1000)}s until you can message again.`, 'warn', 3000);
    return;
  }

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!currentUserId || !isSupabaseConnected) return showToast('Sign in to send messages.', 'warn');

  const friendId = selectedFriendId;
  const msgObj = {
    sender_id: currentUserId,
    recipient_id: friendId,
    user: sanitizeName(currentHandle || currentUser.split('@')[0]),
    text, time: timeStr
  };
  chatSendTimestamps.push(now);
  input.value = ''; updateChatCounter();

  // Show it straight away; it's swapped for the saved copy once the database has it.
  const tempId = 'sending-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  dmMessages.push({ ...msgObj, id: tempId, created_at: new Date().toISOString(), pending: true });
  renderDMThread({ toBottom: true });

  const { data, error } = await supabaseClient.from('campus_chat').insert([msgObj]).select().single();
  const i = dmMessages.findIndex(m => m.id === tempId);
  if (i >= 0) dmMessages.splice(i, 1);
  if (error) {
    if (selectedFriendId === friendId) {
      renderDMThread();
      if (!input.value) { input.value = text; updateChatCounter(); }   // give the text back to retry
    }
    return showToast('Message blocked — make sure you two are friends.', 'error', 4500);
  }
  if (selectedFriendId !== friendId) return;
  if (!data) return fetchDMs(friendId, { quiet: true });
  if (!dmMessages.some(m => m.id === data.id)) {
    const list = dmMessages.slice();
    list.push({ ...data, _addedAt: Date.now(), _was: tempId });
    setThread(list);
  }
  renderDMThread();
}

// Back-compat shim: older code paths / a stale HTML cache may still call
// sendAppChatMessage(event) — route it to the new DM sender.
async function sendAppChatMessage(event) { return sendDM(event); }
function renderChat() { renderDMThread(); }

// Feed Engine
// Each like / reaction / comment is its own row per user (feed_reactions,
// feed_comments), so tapping a reaction again removes yours.
const REACTIONS = [
  { key: 'thumbs', em: '👍' }, { key: 'heart', em: '❤️' }, { key: 'laugh', em: '😂' },
  { key: 'party',  em: '🎉' }, { key: 'fire',  em: '🔥' }
];
let feedReactions   = {};          // postId -> { key: count }
let myFeedReactions = new Set();   // "postId|key" for my own reactions
let feedComments    = {};          // postId -> [comment rows]
let feedExtrasReady = null;        // false until SCHEMA.sql section 6h has been run
const reactInFlight = new Set();
let feedExtrasTimer = null;

const samePostId = (a, b) => String(a) === String(b);
const findPost = (id) => campusFeed.find(p => samePostId(p.id, id));

function postReactionCount(post, key) {
  if (feedExtrasReady === false) {   // old database: show the counters stored on the post
    if (key === 'like') return post.likes || 0;
    const em = REACTIONS.find(r => r.key === key)?.em;
    return (post.reactions || {})[em] || 0;
  }
  return feedReactions[String(post.id)]?.[key] || 0;
}
function iReacted(post, key) { return myFeedReactions.has(`${post.id}|${key}`); }
function postComments(post) {
  if (feedExtrasReady === false) return Array.isArray(post.comments) ? post.comments : [];
  return feedComments[String(post.id)] || [];
}

async function fetchFeedExtras() {
  const ids = campusFeed.map(p => p.id);
  if (!ids.length || !currentUserId) {
    feedReactions = {}; myFeedReactions = new Set(); feedComments = {};
    return;
  }
  const [rx, cm] = await Promise.all([
    supabaseClient.from('feed_reactions').select('post_id, user_id, emoji').in('post_id', ids),
    supabaseClient.from('feed_comments').select('id, post_id, author_id, author, body, created_at')
      .in('post_id', ids).order('created_at', { ascending: true })
  ]);
  if (rx.error || cm.error) { feedExtrasReady = false; return; }
  feedExtrasReady = true;
  const counts = {}, mine = new Set(), comments = {};
  (rx.data || []).forEach(r => {
    const pid = String(r.post_id);
    (counts[pid] ||= {})[r.emoji] = (counts[pid][r.emoji] || 0) + 1;
    if (r.user_id === currentUserId) mine.add(`${pid}|${r.emoji}`);
  });
  // Keep taps that are still being saved, so a refresh can't flicker them.
  reactInFlight.forEach(tag => { if (myFeedReactions.has(tag) && !mine.has(tag)) {
    const [pid, key] = tag.split('|'); mine.add(tag); (counts[pid] ||= {})[key] = (counts[pid][key] || 0) + 1; } });
  (cm.data || []).forEach(c => (comments[String(c.post_id)] ||= []).push(c));
  feedReactions = counts; myFeedReactions = mine; feedComments = comments;
}

// Realtime: someone reacted or commented — refresh counts (debounced).
function onFeedExtrasChanged() {
  clearTimeout(feedExtrasTimer);
  feedExtrasTimer = setTimeout(async () => {
    await fetchFeedExtras();
    renderFeed();
    if (currentPostCommentId && document.getElementById('detailModal')?.style.display === 'flex') {
      renderCommentsList();
    }
  }, 250);
}

function sortedFeed() {
  const list = [...campusFeed];
  if (feedSort === 'top') {
    list.sort((a,b) => postReactionCount(b, 'like') - postReactionCount(a, 'like'));
  } else if (feedSort === 'comments') {
    list.sort((a,b) => postComments(b).length - postComments(a).length);
  } else {
    // 'new': DB rows come pre-sorted by created_at desc; keep as-is.
  }
  return list;
}

function setFeedSort(mode, btn) {
  feedSort = mode;
  document.querySelectorAll('#home-view .feed-section .chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderFeed();
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// -------------------- Toast notifications --------------------
// Lightweight toast so we can retire the browser's native alert() for
// user-facing feedback. Kind is 'info' | 'success' | 'warn' | 'error'.
// They drop in at the top of the screen. Tap × or swipe one up (or sideways)
// to dismiss it; tapping the text runs onTap when given (e.g. open that chat).
const TOAST_MAX = 3;
function showToast(message, kind = 'info', durationMs = 3500, onTap = null) {
  const container = document.getElementById('toast-container');
  if (!container) { /* fallback for very early errors */ alert(message); return; }
  const t = document.createElement('div');
  t.className = `toast toast-${kind}${onTap ? ' toast-action' : ''}`;
  t.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  const icons = { info: 'circle-info', success: 'circle-check', warn: 'triangle-exclamation', error: 'circle-xmark' };
  t.innerHTML = `<i class="fa-solid fa-${icons[kind] || icons.info}"></i><span class="toast-text">${escapeHtml(message)}</span>
    <button class="toast-close" type="button" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>`;
  container.appendChild(t);
  // Too many at once: the oldest go first.
  const live = [...container.querySelectorAll('.toast:not(.leaving)')];
  live.slice(0, Math.max(0, live.length - TOAST_MAX)).forEach(dismissToast);

  let timer = null;
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => dismissToast(t), durationMs); };
  arm();
  // Hovering (computer) keeps it up so it can be read.
  t.addEventListener('mouseenter', () => clearTimeout(timer));
  t.addEventListener('mouseleave', arm);

  t.querySelector('.toast-close').addEventListener('click', (e) => { e.stopPropagation(); dismissToast(t); });

  // Swipe to dismiss.
  let start = null, dx = 0, dy = 0, dragged = false;
  t.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.toast-close')) return;
    start = { x: e.clientX, y: e.clientY }; dx = dy = 0; dragged = false;
    clearTimeout(timer);
    try { t.setPointerCapture(e.pointerId); } catch (_) {}
    t.classList.add('dragging');
  });
  t.addEventListener('pointermove', (e) => {
    if (!start) return;
    dx = e.clientX - start.x; dy = Math.min(0, e.clientY - start.y);   // up or sideways only
    if (Math.abs(dx) > 6 || dy < -6) dragged = true;
    t.style.transform = `translate(${dx}px, ${dy}px)`;
    t.style.opacity = String(Math.max(0.2, 1 - Math.max(Math.abs(dx), -dy) / 160));
  });
  const release = () => {
    if (!start) return;
    start = null;
    t.classList.remove('dragging');
    if (Math.abs(dx) > 70 || dy < -32) {
      t.style.transform = Math.abs(dx) > 70 ? `translate(${dx > 0 ? 120 : -120}%, ${dy}px)` : `translateY(-140%)`;
      t.style.opacity = '0';
      dismissToast(t);
    } else {
      t.style.transform = ''; t.style.opacity = '';
      arm();
    }
  };
  t.addEventListener('pointerup', release);
  t.addEventListener('pointercancel', release);
  t.addEventListener('click', () => {
    if (dragged) return;
    if (onTap) { try { onTap(); } catch (_) {} }
    dismissToast(t);
  });

  // trigger enter animation
  requestAnimationFrame(() => t.classList.add('show'));
}

function dismissToast(t) {
  if (!t || t.classList.contains('leaving')) return;
  t.classList.add('leaving');
  t.classList.remove('show');
  // Fold its space away so the others slide smoothly into its place.
  t.style.height = t.offsetHeight + 'px';
  void t.offsetHeight;
  t.style.height = '0px';
  t.style.paddingTop = t.style.paddingBottom = '0px';
  t.style.borderWidth = '0px';
  t.style.marginBottom = '-8px';   // swallow the gap between toasts too
  setTimeout(() => t.remove(), 340);
}

function renderFeed() {
  const container = document.getElementById('feed-container');
  if (!container) return;
  container.innerHTML = '';

  const list = sortedFeed();
  if (!list.length) {
    container.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-bullhorn"></i>
      <p>No posts yet. Be the first to share something!</p>
      <button class="primary-btn" onclick="openNewPostModal()">+ Create Post</button>
    </div>`;
    return;
  }

  list.forEach(post => {
    const pid = escapeAttr(post.id);
    const commentCount = postComments(post).length;
    const likeCount = postReactionCount(post, 'like');
    const liked = iReacted(post, 'like');
    const reactionRow = REACTIONS.map(r => {
      const n = postReactionCount(post, r.key);
      const on = iReacted(post, r.key);
      return `<button class="reaction-chip ${n ? 'has-count' : ''} ${on ? 'mine' : ''}" aria-pressed="${on}"
                onclick="reactToPost('${pid}','${r.key}')" aria-label="${on ? 'Remove' : 'Add'} ${r.em} reaction">
                ${r.em} <span>${n || ''}</span>
              </button>`;
    }).join('');

    const author = String(post.author || 'Student');
    const anon = /^anonymous/i.test(author);
    const mine = post.author_id && post.author_id === currentUserId;
    const el = document.createElement('article');
    el.className = 'info-card feed-post';
    el.dataset.postId = String(post.id);
    el.innerHTML = `
      <header class="post-head">
        <span class="post-avatar">${anon ? '<i class="fa-solid fa-user-secret"></i>' : escapeHtml(author[0].toUpperCase())}</span>
        <div class="post-who">
          <strong>${escapeHtml(author)}${mine ? ' <em>(you)</em>' : ''}</strong>
          <small>${escapeHtml(post.created_at ? timeAgo(post.created_at) : (post.time || ''))}</small>
        </div>
        ${isAdmin || mine
          ? `<button class="post-delete-btn" onclick="deleteFeedPost('${pid}')" aria-label="Delete post"><i class="fa-solid fa-trash"></i></button>`
          : ''}
      </header>
      <h4 class="post-title">${escapeHtml(post.title)}</h4>
      <p class="post-body">${renderSafeMessage(post.text || '')}</p>
      <div class="reaction-row">${reactionRow}</div>
      <footer class="post-actions">
        <button class="post-action-btn ${liked ? 'liked' : ''}" onclick="toggleLikePost('${pid}')" aria-pressed="${liked}" aria-label="${liked ? 'Unlike' : 'Like'}">
          <i class="fa-${liked ? 'solid' : 'regular'} fa-heart"></i> ${likeCount}
        </button>
        <button class="post-action-btn" onclick="openCommentsModal('${pid}')">
          <i class="fa-regular fa-comment"></i> ${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}
        </button>
      </footer>
    `;
    container.appendChild(el);
  });
}

function updateNotifBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (unreadNotifs > 0) {
    badge.textContent = unreadNotifs > 9 ? '9+' : String(unreadNotifs);
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function needsFeedUpdate() {
  if (feedExtrasReady !== false) return false;
  showToast('Reactions and comments need the latest database update — run SCHEMA.sql in Supabase.', 'warn', 6000);
  return true;
}

function setLocalReaction(id, key, on) {
  const tag = `${id}|${key}`;
  const counts = (feedReactions[String(id)] ||= {});
  if (on && !myFeedReactions.has(tag)) {
    myFeedReactions.add(tag); counts[key] = (counts[key] || 0) + 1;
  } else if (!on && myFeedReactions.has(tag)) {
    myFeedReactions.delete(tag); counts[key] = Math.max(0, (counts[key] || 0) - 1);
  }
}

// Tap once to add your like/reaction, tap again to take it back.
async function toggleFeedReaction(id, key) {
  if (!currentUserId) return showToast('Sign in to react.', 'warn');
  if (needsFeedUpdate()) return;
  const post = findPost(id);
  if (!post) return;
  const tag = `${post.id}|${key}`;
  if (reactInFlight.has(tag)) return;          // ignore double-taps while saving
  const had = myFeedReactions.has(tag);

  reactInFlight.add(tag);
  setLocalReaction(post.id, key, !had);        // show it instantly
  renderFeed();

  const { error } = had
    ? await supabaseClient.from('feed_reactions').delete()
        .match({ post_id: post.id, user_id: currentUserId, emoji: key })
    : await supabaseClient.from('feed_reactions')
        .insert([{ post_id: post.id, user_id: currentUserId, emoji: key, anonymous: !!appSettings.anonymous }]);
  reactInFlight.delete(tag);

  if (error && error.code !== '23505') {       // 23505 = it was already saved
    setLocalReaction(post.id, key, had);
    renderFeed();
    showToast('Could not save that: ' + error.message, 'error');
  }
}

function toggleLikePost(id) { return toggleFeedReaction(id, 'like'); }
function reactToPost(id, key) { return toggleFeedReaction(id, key); }

function openCommentsModal(postId) {
  const post = findPost(postId);
  if (!post) return;
  currentPostCommentId = post.id;

  document.getElementById('modalTitle').textContent = post.title || 'Discussion';
  document.getElementById('modalBody').innerHTML = `
    <div id="comments-list" class="comments-list"></div>
    <form class="comment-compose" onsubmit="event.preventDefault(); addCommentToPost();">
      <input type="text" id="new-comment-input" class="chat-input" maxlength="500"
             placeholder="${currentUserId ? 'Write a comment…' : 'Sign in to comment'}" ${currentUserId ? '' : 'disabled'} />
      <button type="submit" class="chat-send-btn" aria-label="Send comment"><i class="fa-solid fa-paper-plane"></i></button>
    </form>`;
  renderCommentsList();
  document.getElementById('detailModal').style.display = 'flex';
}

function renderCommentsList() {
  const box = document.getElementById('comments-list');
  const post = findPost(currentPostCommentId);
  if (!box || !post) return;
  const list = postComments(post);
  const ownsPost = post.author_id && post.author_id === currentUserId;
  box.innerHTML = list.length ? list.map(c => {
    const name = String(c.author || 'Anonymous Student');
    const canDelete = feedExtrasReady && c.id && (c.author_id === currentUserId || ownsPost || isAdmin);
    return `
      <div class="comment-row">
        <span class="post-avatar sm">${/^anonymous/i.test(name) ? '<i class="fa-solid fa-user-secret"></i>' : escapeHtml(name[0].toUpperCase())}</span>
        <div class="comment-main">
          <div class="comment-meta">
            <strong>${escapeHtml(name)}${c.author_id && c.author_id === currentUserId ? ' <em>(you)</em>' : ''}</strong>
            ${c.created_at ? `<small>${escapeHtml(timeAgo(c.created_at))}</small>` : ''}
            ${canDelete ? `<button class="comment-delete" onclick="deleteComment('${escapeAttr(c.id)}')" aria-label="Delete comment"><i class="fa-solid fa-xmark"></i></button>` : ''}
          </div>
          <div class="comment-body">${renderSafeMessage(String(c.body ?? c.text ?? '').slice(0, 500))}</div>
        </div>
      </div>`;
  }).join('') : '<p class="comments-empty">No comments yet. Start the conversation!</p>';
  box.scrollTop = box.scrollHeight;
}

async function addCommentToPost() {
  const input = document.getElementById('new-comment-input');
  const text = (input?.value || '').trim();
  if (!text || !currentPostCommentId) return;
  if (!currentUserId) return showToast('Sign in to comment.', 'warn');
  if (needsFeedUpdate()) return;

  input.value = '';
  const { data, error } = await supabaseClient.from('feed_comments')
    .insert([{ post_id: currentPostCommentId, author_id: currentUserId, body: text.slice(0, 500), anonymous: !!appSettings.anonymous }])
    .select('id, post_id, author_id, author, body, created_at').single();
  if (error) { input.value = text; return showToast('Comment failed: ' + error.message, 'error'); }

  const pid = String(data.post_id);
  const list = (feedComments[pid] ||= []);
  if (!list.some(c => c.id === data.id)) list.push(data);
  renderFeed();
  renderCommentsList();
}

async function deleteComment(id) {
  if (!confirm('Delete this comment?')) return;
  const { data, error } = await supabaseClient.from('feed_comments').delete().eq('id', id).select('id');
  if (error || !data?.length) return showToast('Could not delete: ' + (error?.message || 'not allowed'), 'error');
  Object.keys(feedComments).forEach(k => { feedComments[k] = feedComments[k].filter(c => c.id !== id); });
  renderFeed();
  renderCommentsList();
}

function openNewPostModal() { document.getElementById('postModal').style.display = 'flex'; }
function closePostModal() { document.getElementById('postModal').style.display = 'none'; }

async function submitPost(event) {
  event.preventDefault();
  if (!currentUserId) { closePostModal(); return showToast('Sign in to post.', 'warn'); }
  if (!currentSchoolId) { closePostModal(); return openSchoolPicker(true); }

  const title = document.getElementById('post-title').value.trim();
  const text  = document.getElementById('post-text').value.trim();
  if (!title || !text) return showToast('Add a title and body first.', 'warn');
  if (title.length > 120 || text.length > 2000) return showToast('Post is too long.', 'warn');

  const newPost = {
    author: appSettings.anonymous ? 'Anonymous Student' : (currentHandle || currentUser.split('@')[0]),
    title, text,
    likes: 0, time: 'Just now', comments: [], reactions: {},
    author_id: currentUserId,
    school_id: currentSchoolId
  };

  const { error } = await supabaseClient.from('campus_feed').insert([newPost]);
  if (error) return showToast('Post blocked: ' + error.message, 'error');
  showToast('Posted to your school feed.', 'success');
  closePostModal();
  event.target.reset();
}

// Study Groups Engine
let groupFilter = 'all';       // 'all' | 'open' | 'mine', kept across live refreshes
let groupMembers = {};         // group id -> [user ids]
const groupBusy = new Set();   // groups with a join / leave on the way
let openGroupId = null;        // group whose details are showing

function findGroup(id) { return studyGroups.find(g => String(g.id) === String(id)); }
function groupIsFull(g) { return g.members >= (g.max || 0); }
function memberLabel(uid) {
  if (uid === currentUserId) return 'You';
  const p = profileMap[uid];
  return (p && (p.display_name || p.handle)) || 'Student';
}
function groupHostName(g) {
  if (g.creator_id === currentUserId) return 'You';
  const p = g.creator_id && profileMap[g.creator_id];
  return (p && (p.display_name || p.handle)) || g.host || 'A student';
}

function renderGroups(filter) {
  if (filter) groupFilter = filter;
  renderHomeSide();
  const container = document.getElementById('groups-list');
  if (!container) return;

  const counts = {
    all: studyGroups.length,
    open: studyGroups.filter(g => !groupIsFull(g)).length,
    mine: studyGroups.filter(g => g.joined).length
  };
  document.querySelectorAll('#group-chips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === groupFilter);
    const n = c.querySelector('.chip-count');
    if (n) n.textContent = counts[c.dataset.filter] ? String(counts[c.dataset.filter]) : '';
  });

  const q = (document.getElementById('group-search')?.value || '').trim().toLowerCase();
  const matches = g => !q || [g.name, g.course, g.location, g.schedule, g.host, ...(g.topics || [])]
    .some(v => String(v || '').toLowerCase().includes(q));
  const list = studyGroups.filter(g =>
    (groupFilter === 'open' ? !groupIsFull(g) : groupFilter === 'mine' ? g.joined : true) && matches(g));

  if (!list.length) {
    const msg = q ? `No groups match "${q}".`
      : groupFilter === 'mine' ? "You haven't joined any groups yet."
      : groupFilter === 'open' ? 'No groups with open seats right now.'
      : 'No study groups yet for your school.';
    container.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-user-group"></i>
      <p>${escapeHtml(msg)}</p>
      ${q ? '' : '<button class="primary-btn" onclick="openCreateGroupModal()">+ Start a group</button>'}
    </div>`;
    return;
  }
  container.innerHTML = list.map(groupCardHtml).join('');
}

function groupJoinButton(g) {
  const gid = escapeAttr(g.id);
  const busy = groupBusy.has(String(g.id)) ? ' disabled' : '';
  if (g.joined) return `<button class="secondary-btn group-join-btn"${busy} onclick="toggleGroupJoin('${gid}')">Leave</button>`;
  if (groupIsFull(g)) return `<button class="secondary-btn group-join-btn" disabled>Full</button>`;
  return `<button class="primary-btn group-join-btn"${busy} onclick="toggleGroupJoin('${gid}')">Join</button>`;
}

function groupCardHtml(g) {
  const gid = escapeAttr(g.id);
  const max = g.max || 0;
  const full = groupIsFull(g);
  const left = Math.max(0, max - g.members);
  const host = !!g.creator_id && g.creator_id === currentUserId;
  const canDelete = isAdmin || host;
  const ids = groupMembers[g.id] || [];
  const faces = ids.slice(0, 4).map(uid => {
    const n = memberLabel(uid);
    return `<span class="group-face" title="${escapeAttr(n)}">${escapeHtml(n[0].toUpperCase())}</span>`;
  }).join('') + (ids.length > 4 ? `<span class="group-face more">+${ids.length - 4}</span>` : '');
  const topics = (g.topics || []);
  const topicHtml = topics.slice(0, 3).map(t => `<span class="group-topic">${escapeHtml(t)}</span>`).join('')
    + (topics.length > 3 ? `<span class="group-topic more">+${topics.length - 3}</span>` : '');
  const pct = max ? Math.min(100, Math.round(g.members / max * 100)) : 0;
  const badges = (host ? '<span class="group-badge host">Host</span>' : '')
    + (g.joined && !host ? '<span class="group-badge joined"><i class="fa-solid fa-check"></i> Joined</span>' : '')
    + (full ? '<span class="group-badge full">Full</span>' : '');
  return `
    <article class="info-card group-card${g.joined ? ' joined' : ''}">
      <div class="group-card-top">
        <span class="group-course">${escapeHtml(g.course || 'Study group')}</span>
        <span class="group-badges">${badges}</span>
      </div>
      <button class="group-title" type="button" onclick="openGroupDetailModal('${gid}')">${escapeHtml(g.name || 'Untitled group')}</button>
      <div class="group-meta">
        <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(g.location || 'Place TBD')}</span>
        <span><i class="fa-regular fa-clock"></i> ${escapeHtml(g.schedule || 'Time TBD')}</span>
      </div>
      ${topicHtml ? `<div class="group-topics">${topicHtml}</div>` : ''}
      <div class="group-seats">
        <div class="group-faces">${faces}</div>
        <span>${g.members}/${max} · ${full ? 'full' : `${left} seat${left === 1 ? '' : 's'} left`}</span>
      </div>
      <div class="group-bar${full ? ' full' : ''}"><span style="width:${pct}%"></span></div>
      <div class="group-actions">
        <button class="secondary-btn" onclick="openGroupDetailModal('${gid}')">Details</button>
        ${groupJoinButton(g)}
        ${canDelete ? `<button class="secondary-btn group-icon-btn danger-text" onclick="deleteGroup('${gid}')" aria-label="Delete group"><i class="fa-solid fa-trash"></i></button>` : ''}
      </div>
    </article>`;
}

function groupDetailHtml(g) {
  const gid = escapeAttr(g.id);
  const host = !!g.creator_id && g.creator_id === currentUserId;
  const canDelete = isAdmin || host;
  // Host first, then you, then everyone else.
  const ids = (groupMembers[g.id] || []).slice().sort((a, b) =>
    (b === g.creator_id) - (a === g.creator_id) || (b === currentUserId) - (a === currentUserId)
    || memberLabel(a).localeCompare(memberLabel(b)));
  const people = ids.map(uid => {
    const n = memberLabel(uid);
    const handle = uid !== currentUserId && profileMap[uid]?.handle ? `<small>@${escapeHtml(profileMap[uid].handle)}</small>` : '';
    return `
      <div class="group-member">
        <span class="friend-avatar sm">${escapeHtml(n[0].toUpperCase())}</span>
        <span class="group-member-name"><strong>${escapeHtml(n)}</strong>${handle}</span>
        ${uid === g.creator_id ? '<span class="group-badge host">Host</span>' : ''}
      </div>`;
  }).join('') || '<p class="friends-empty-inner">No one has joined yet. Be the first!</p>';
  const topics = (g.topics || []).map(t => `<span class="group-topic">${escapeHtml(t)}</span>`).join('')
    || '<span class="group-topic">General study</span>';
  const max = g.max || 0;
  return `
    <div class="group-detail">
      <div class="group-course">${escapeHtml(g.course || 'Study group')}</div>
      <div class="group-detail-rows">
        <div><i class="fa-solid fa-location-dot"></i><span>${escapeHtml(g.location || 'Place TBD')}</span></div>
        <div><i class="fa-regular fa-clock"></i><span>${escapeHtml(g.schedule || 'Time TBD')}</span></div>
        <div><i class="fa-solid fa-user"></i><span>Hosted by ${escapeHtml(groupHostName(g))}</span></div>
      </div>
      <div class="group-detail-label">Topics</div>
      <div class="group-topics">${topics}</div>
      <div class="group-detail-label">Members · ${g.members}/${max}${groupIsFull(g) ? ' · full' : ''}</div>
      <div class="group-member-list">${people}</div>
      <div class="group-actions">
        ${groupJoinButton(g)}
        ${host ? `<button class="secondary-btn" onclick="openCreateGroupModal('${gid}')"><i class="fa-solid fa-pen"></i> Edit</button>` : ''}
        ${canDelete ? `<button class="secondary-btn group-icon-btn danger-text" onclick="deleteGroup('${gid}')" aria-label="Delete group"><i class="fa-solid fa-trash"></i></button>` : ''}
      </div>
    </div>`;
}

function openGroupDetailModal(groupId) {
  const g = findGroup(groupId);
  if (!g) return showToast('That group is no longer available.', 'info');
  openModal(g.name || 'Study group', groupDetailHtml(g));
  openGroupId = String(g.id);
  document.getElementById('detailModal').dataset.kind = 'group';
}

// Keep an open details window in step with joins, leaves and edits.
function refreshOpenGroup() {
  const modal = document.getElementById('detailModal');
  if (!openGroupId || !modal || modal.style.display !== 'flex' || modal.dataset.kind !== 'group') return;
  const g = findGroup(openGroupId);
  if (!g) { closeModalForce(); openGroupId = null; return; }
  document.getElementById('modalTitle').textContent = g.name || 'Study group';
  document.getElementById('modalBody').innerHTML = groupDetailHtml(g);
}

function filterGroups(type) {
  renderGroups(type);
}

async function toggleGroupJoin(id) {
  if (!currentUserId) return showToast('Sign in to join a group.', 'warn');
  const g = findGroup(id);
  if (!g) return;
  const key = String(g.id);
  if (groupBusy.has(key)) return;             // a second tap while the first is on its way
  const leaving = g.joined;
  if (!leaving && groupIsFull(g)) return showToast('This group is full.', 'warn');
  if (leaving && g.creator_id === currentUserId
      && !confirm("You're the host. Leave anyway? The group stays up and you can still edit or delete it.")) return;

  // Show the change straight away; the refresh below corrects it if the database said no.
  groupBusy.add(key);
  const ids = (groupMembers[g.id] || []).filter(u => u !== currentUserId);
  if (!leaving) ids.push(currentUserId);
  groupMembers[g.id] = ids;
  g.joined = !leaving; g.members = ids.length;
  renderGroups(); refreshOpenGroup();

  const table = supabaseClient.from('study_group_members');
  const { error } = leaving
    ? await table.delete().eq('group_id', g.id).eq('user_id', currentUserId)
    : await table.insert([{ group_id: g.id, user_id: currentUserId }]);
  groupBusy.delete(key);
  if (error && error.code !== '23505') {        // 23505: already a member, which is fine
    showToast((leaving ? 'Could not leave: ' : 'Could not join: ') + error.message, 'error');
  } else if (!leaving) {
    showToast(`You joined ${g.name || 'the group'}.`, 'success');
  }
  fetchGroups();
}

// ==================== Event calendar ====================
let calEvents = [];                    // campus_events rows for my school
let calRsvps = {};                     // event_id -> { count, mine }
let calMonth = startOfMonth(new Date());
let calSelectedDay = null;             // 'YYYY-MM-DD' (local) or null = upcoming
let calRefreshTimer = null;

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseDayKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }

async function fetchEvents() {
  if (!isSupabaseConnected || !currentUserId || !currentSchoolId) {
    calEvents = []; calRsvps = {};
    return renderCalendar();
  }
  const [evRes, rsvpRes] = await Promise.all([
    supabaseClient.from('campus_events').select('*')
      .eq('school_id', currentSchoolId).order('starts_at', { ascending: true }).limit(1000),
    supabaseClient.from('event_rsvps').select('event_id, user_id')
  ]);
  if (evRes.error) {
    calEvents = []; renderCalendar();
    return showToast('Could not load events: ' + evRes.error.message, 'error');
  }
  calEvents = evRes.data || [];
  calRsvps = {};
  (rsvpRes.data || []).forEach(r => {
    const c = calRsvps[r.event_id] || { count: 0, mine: false };
    c.count += 1;
    if (r.user_id === currentUserId) c.mine = true;
    calRsvps[r.event_id] = c;
  });
  renderCalendar();
}

function onEventsChanged() {
  clearTimeout(calRefreshTimer);
  calRefreshTimer = setTimeout(fetchEvents, 400);
}

function shiftCalMonth(delta) {
  calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + delta, 1);
  renderCalendar();
}
function goToToday() {
  calMonth = startOfMonth(new Date());
  calSelectedDay = dayKey(new Date());
  renderCalendar();
}
function selectCalDay(key) {
  // Tapping the selected day again goes back to the upcoming list.
  calSelectedDay = key && key !== calSelectedDay ? key : null;
  if (calSelectedDay) {
    const d = parseDayKey(calSelectedDay);
    if (d.getMonth() !== calMonth.getMonth() || d.getFullYear() !== calMonth.getFullYear()) calMonth = startOfMonth(d);
  }
  renderCalendar();
}

function renderCalendar() {
  const label = document.getElementById('cal-month-label');
  if (label) label.textContent = calMonth.toLocaleDateString([], { month: 'long', year: 'numeric' });

  const grid = document.getElementById('cal-grid');
  if (grid) {
    const todayKey = dayKey(new Date());
    const counts = {};
    calEvents.forEach(e => { const k = dayKey(new Date(e.starts_at)); counts[k] = (counts[k] || 0) + 1; });
    const start = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1 - calMonth.getDay());
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const k = dayKey(d);
      const n = counts[k] || 0;
      const cls = ['cal-day',
        d.getMonth() !== calMonth.getMonth() ? 'other' : '',
        k === todayKey ? 'today' : '',
        k === calSelectedDay ? 'selected' : '',
        n ? 'has-events' : ''].filter(Boolean).join(' ');
      cells.push(`<button class="${cls}" onclick="selectCalDay('${k}')" aria-label="${d.toDateString()}${n ? `, ${n} event${n === 1 ? '' : 's'}` : ''}">
        <span>${d.getDate()}</span>${n ? `<i class="cal-dots">${'<b></b>'.repeat(Math.min(n, 3))}</i>` : ''}</button>`);
    }
    grid.innerHTML = cells.join('');
  }
  renderEventList();
  renderHomeSide();
}

function renderEventList() {
  const container = document.getElementById('events-list');
  const title = document.getElementById('cal-list-title');
  const clearBtn = document.getElementById('cal-clear-btn');
  if (!container || !title) return;
  if (clearBtn) clearBtn.style.display = calSelectedDay ? 'inline-flex' : 'none';

  if (!currentUserId || !currentSchoolId) {
    title.textContent = 'Upcoming';
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-calendar-days"></i>
      <p>${currentUserId ? 'Pick your school to see its calendar.' : "Sign in to see your school's calendar."}</p></div>`;
    return;
  }

  let list;
  if (calSelectedDay) {
    title.textContent = parseDayKey(calSelectedDay).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    list = calEvents.filter(e => dayKey(new Date(e.starts_at)) === calSelectedDay);
  } else {
    title.textContent = 'Upcoming';
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    list = calEvents.filter(e => new Date(e.starts_at) >= startOfToday).slice(0, 30);
  }

  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-calendar-plus"></i>
      <p>${calSelectedDay ? 'Nothing on this day.' : 'No upcoming events yet.'}</p>
      <button class="primary-btn" onclick="openEventModal()">+ Add Event</button></div>`;
    return;
  }
  container.innerHTML = list.map(eventCardHtml).join('');
}

function eventCardHtml(e) {
  const d = new Date(e.starts_at);
  const r = calRsvps[e.id] || { count: 0, mine: false };
  const isToday = dayKey(d) === dayKey(new Date());
  const past = e.all_day ? (d < new Date() && !isToday) : d < new Date();
  const canDelete = isAdmin || (e.created_by && e.created_by === currentUserId);
  const when = e.all_day ? 'All day' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `
    <div class="info-card event-card ${past ? 'past' : ''}">
      <div class="event-date"><span>${d.toLocaleDateString([], { month: 'short' })}</span><b>${d.getDate()}</b></div>
      <div class="event-body">
        <strong>${escapeHtml(e.title)}</strong>
        <small>${isToday ? 'Today' : d.toLocaleDateString([], { weekday: 'short' })} · ${when}${e.location ? ` · <i class="fa-solid fa-location-dot"></i> ${escapeHtml(e.location)}` : ''}</small>
        ${e.description ? `<p>${renderSafeMessage(e.description)}</p>` : ''}
        <div class="event-actions">
          <button class="${r.mine ? 'secondary-btn active-state' : 'primary-btn'} event-rsvp-btn"
            onclick="toggleRsvp('${escapeAttr(e.id)}')" ${past ? 'disabled' : ''}>${r.mine ? '✓ Going' : 'RSVP'}</button>
          <span class="event-going">${r.count} going</span>
          ${canDelete ? `<button class="text-btn danger-text" onclick="deleteEvent('${escapeAttr(e.id)}')">Delete</button>` : ''}
        </div>
      </div>
    </div>`;
}

async function toggleRsvp(id) {
  if (!currentUserId) return showToast('Sign in to RSVP.', 'warn');
  const cur = calRsvps[id] || { count: 0, mine: false };
  const { error } = cur.mine
    ? await supabaseClient.from('event_rsvps').delete().eq('event_id', id).eq('user_id', currentUserId)
    : await supabaseClient.from('event_rsvps').insert([{ event_id: id, user_id: currentUserId }]);
  if (error) return showToast('RSVP failed: ' + error.message, 'error');
  calRsvps[id] = { count: Math.max(0, cur.count + (cur.mine ? -1 : 1)), mine: !cur.mine };
  renderEventList();
}

async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  const { data, error } = await supabaseClient.from('campus_events').delete().eq('id', id).select('id');
  if (error || !data?.length) return showToast('Could not delete: ' + (error?.message || 'not allowed'), 'error');
  calEvents = calEvents.filter(e => e.id !== id);
  renderCalendar();
  showToast('Event deleted.', 'success');
}

function openEventModal() {
  if (!currentUserId) return showToast('Sign in to add events.', 'warn');
  if (!currentSchoolId) return openSchoolPicker(true);
  document.getElementById('ev-modal-sub').textContent = `Everyone at ${currentSchool?.name || 'your school'} will see it.`;
  document.getElementById('ev-date').value = calSelectedDay || dayKey(new Date());
  document.getElementById('eventModal').style.display = 'flex';
  setTimeout(() => document.getElementById('ev-title')?.focus(), 50);
}
function closeEventModal() { document.getElementById('eventModal').style.display = 'none'; }

async function submitEvent(event) {
  event.preventDefault();
  const title = document.getElementById('ev-title').value.replace(/\s+/g, ' ').trim();
  const date = document.getElementById('ev-date').value;
  const time = document.getElementById('ev-time').value;
  const location = document.getElementById('ev-location').value.trim() || null;
  const description = document.getElementById('ev-desc').value.trim() || null;
  if (title.length < 2) return showToast('Give the event a title.', 'warn');
  const starts = new Date(`${date}T${time || '00:00'}`);   // local time
  if (!date || isNaN(starts)) return showToast('Pick a valid date.', 'warn');

  const btn = document.getElementById('ev-submit-btn');
  btn.disabled = true;
  const { data, error } = await supabaseClient.from('campus_events').insert([{
    title, description, location,
    starts_at: starts.toISOString(), all_day: !time,
    school_id: currentSchoolId, created_by: currentUserId
  }]).select().single();
  btn.disabled = false;
  if (error) return showToast('Could not add event: ' + error.message, 'error');

  calEvents = [...calEvents, data].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  calMonth = startOfMonth(starts);
  calSelectedDay = date;
  renderCalendar();
  closeEventModal();
  event.target.reset();
  showToast('Event added to the calendar.', 'success');
}

// ==================== Admin ====================
// Admin status comes from the `admins` table, which can only be edited
// from the Supabase SQL editor. The UI just shows extra delete buttons;
// the database policies are what actually allow the deletes.
let isAdmin = false;

let adminJoinCodes = {};        // school_id -> join code (admins can read these)
let adminJoinRequests = [];     // pending school_join_requests rows
let adminEditingSchoolId = null;

async function fetchAdminStatus() {
  isAdmin = false;
  if (isSupabaseConnected && currentUserId) {
    const { data } = await supabaseClient.from('admins').select('user_id').eq('user_id', currentUserId).maybeSingle();
    isAdmin = !!data;
  }
  if (isAdmin) { await fetchAdminJoinData(); fetchAdminMembers(); }
  else { adminJoinCodes = {}; adminJoinRequests = []; adminMembers = []; adminBans = []; renderAdminPanel(); }
}

async function fetchAdminJoinData() {
  if (!isAdmin) return;
  const [codes, reqs] = await Promise.all([
    supabaseClient.from('school_join_codes').select('school_id, join_code'),
    supabaseClient.from('school_join_requests').select('id, school_id, user_id, created_at')
      .eq('status', 'pending').order('created_at')
  ]);
  adminJoinCodes = {};
  (codes.data || []).forEach(c => { adminJoinCodes[c.school_id] = c.join_code; });
  adminJoinRequests = reqs.data || [];
  await fetchProfilesByIds(adminJoinRequests.map(r => r.user_id));
  renderAdminPanel();
  renderNotifications();
  updateNotifBadgeFromState();
}

// -------------------- Admin card folding --------------------
// Tap the Admin header to fold the whole card, or a section's header to fold
// just that section. What you left open or closed is remembered on this device.
const ADMIN_FOLD_KEY = 'adminFolded';
let adminFolded = (() => {
  try { return JSON.parse(localStorage.getItem(ADMIN_FOLD_KEY)) || {}; } catch (_) { return {}; }
})();

function applyAdminFolds() {
  const card = document.getElementById('admin-card');
  if (!card) return;
  const fold = (key, wrap, head, body) => {
    const closed = !!adminFolded[key];
    wrap.classList.toggle('collapsed', closed);
    head?.setAttribute('aria-expanded', String(!closed));
    if (body) body.inert = closed;   // folded-away buttons can't be tabbed to
  };
  fold('card', card, card.querySelector('.admin-card-head'), document.getElementById('admin-card-body'));
  card.querySelectorAll('.admin-section').forEach(sec =>
    fold(sec.dataset.section, sec, sec.querySelector('.admin-section-head'), sec.querySelector('.admin-collapse')));
}

function toggleAdminSection(key, open) {
  adminFolded[key] = typeof open === 'boolean' ? !open : !adminFolded[key];
  try { localStorage.setItem(ADMIN_FOLD_KEY, JSON.stringify(adminFolded)); } catch (_) {}
  applyAdminFolds();
}

// Open the Admin card (and one section) and bring it into view, e.g. from a notification.
function showAdminCard(section) {
  switchTab('settings-view');
  toggleAdminSection('card', true);
  if (section) toggleAdminSection(section, true);
  document.getElementById('admin-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function pressOnEnter(e) {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); }
}

function setAdminCount(id, n) {
  const el = document.getElementById(id);
  if (el) el.textContent = n ? String(n) : '';
}

function renderAdminPanel() {
  const card = document.getElementById('admin-card');
  if (!card) return;
  card.style.display = isAdmin ? 'block' : 'none';
  if (!isAdmin) return;
  applyAdminFolds();

  // Waiting requests stay visible on the header even with the card folded.
  const waiting = adminJoinRequests.length;
  const pill = document.getElementById('admin-waiting-pill');
  if (pill) { pill.hidden = !waiting; pill.textContent = `${waiting} waiting`; }
  setAdminCount('admin-requests-count', waiting);
  setAdminCount('admin-schools-count', schoolsCache.length);

  const reqEl = document.getElementById('admin-request-list');
  if (reqEl) {
    reqEl.innerHTML = adminJoinRequests.length
      ? adminJoinRequests.map(r => {
          const p = profileMap[r.user_id] || {};
          const who = p.display_name || p.handle || 'A student';
          const school = schoolsCache.find(s => s.id === r.school_id)?.name || 'a school';
          return `
            <div class="admin-row">
              <span class="friend-avatar sm">${escapeHtml(who[0].toUpperCase())}</span>
              <div class="school-row-text">
                <strong>${escapeHtml(who)}${p.handle ? ` <small>@${escapeHtml(p.handle)}</small>` : ''}</strong>
                <small>Wants to join ${escapeHtml(school)} · ${timeAgo(r.created_at)}</small>
              </div>
              <button class="primary-btn friend-btn-sm" onclick="reviewJoinRequest('${escapeAttr(r.id)}', true)">Approve</button>
              <button class="secondary-btn friend-btn-sm" onclick="reviewJoinRequest('${escapeAttr(r.id)}', false)">Deny</button>
            </div>`;
        }).join('')
      : '<p class="friends-empty-inner">No one is waiting to join.</p>';
  }

  document.getElementById('admin-school-list').innerHTML = schoolsCache.length
    ? schoolsCache.map(s => {
        const rule = joinRuleLabel(s);
        const editing = adminEditingSchoolId === s.id;
        return `
          <div class="admin-school">
            <div class="admin-row">
              <i class="fa-solid fa-graduation-cap"></i>
              <div class="school-row-text">
                <strong>${escapeHtml(s.name)}</strong>
                <small><i class="fa-solid fa-${rule.icon}"></i> ${escapeHtml(rule.text)}${s.id === currentSchoolId ? ' · Your school' : ''}</small>
              </div>
              <button class="secondary-btn admin-rule-btn ${editing ? 'active-state' : ''}" onclick="toggleJoinRuleEditor('${escapeAttr(s.id)}')">Join rules</button>
              <button class="secondary-btn admin-del-btn" onclick="adminDeleteSchool('${escapeAttr(s.id)}')" aria-label="Delete ${escapeAttr(s.name)}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            ${editing ? joinRuleEditorHtml(s) : ''}
          </div>`;
      }).join('')
    : '<p class="friends-empty-inner">No schools.</p>';
  if (adminEditingSchoolId) renderJoinRuleFields();
  renderAdminMembers();
}

function joinRuleEditorHtml(s) {
  const opt = (v, label) => `<option value="${v}" ${s.join_mode === v ? 'selected' : ''}>${label}</option>`;
  return `
    <div class="join-rule-editor">
      <label class="tp-label" for="jr-mode">Who can join ${escapeHtml(s.name)}?</label>
      <select id="jr-mode" class="mini-select" onchange="renderJoinRuleFields()">
        ${opt('open', 'Anyone (open)')}
        ${opt('code', 'People with a join code')}
        ${opt('domain', 'People with a school email')}
        ${opt('approval', 'Only people an admin approves')}
      </select>
      <input id="jr-code" class="auth-input" maxlength="40" autocomplete="off"
             placeholder="Join code (at least 4 characters)" value="${escapeAttr(adminJoinCodes[s.id] || '')}" />
      <input id="jr-domains" class="auth-input" autocomplete="off"
             placeholder="Email domains, e.g. hmhs.org, students.hmhs.org" value="${escapeAttr((s.allowed_domains || []).join(', '))}" />
      <p class="admin-hint" id="jr-help"></p>
      <div class="join-rule-actions">
        <button class="secondary-btn" onclick="toggleJoinRuleEditor(null)">Cancel</button>
        <button class="primary-btn" onclick="saveJoinRules('${escapeAttr(s.id)}')">Save rules</button>
      </div>
    </div>`;
}

function renderJoinRuleFields() {
  const mode = document.getElementById('jr-mode')?.value;
  const code = document.getElementById('jr-code');
  const domains = document.getElementById('jr-domains');
  const help = document.getElementById('jr-help');
  if (!mode || !code || !domains || !help) return;
  code.style.display = mode === 'code' ? 'block' : 'none';
  domains.style.display = mode === 'domain' ? 'block' : 'none';
  help.textContent = {
    open: 'Anyone can join. Good for testing, not for a real school.',
    code: 'Share the code only with students (e.g. in class). Change it any time; current members stay.',
    domain: 'Only accounts with a confirmed email at these domains can join. Turn on "Confirm email" in Supabase → Authentication, or people could sign up with a fake address.',
    approval: 'Students send a request; you approve or deny it above. Current members stay.'
  }[mode];
}

function toggleJoinRuleEditor(id) {
  adminEditingSchoolId = adminEditingSchoolId === id ? null : id;
  renderAdminPanel();
}

async function saveJoinRules(id) {
  const mode = document.getElementById('jr-mode').value;
  const code = document.getElementById('jr-code').value.trim() || null;
  const domains = document.getElementById('jr-domains').value.split(/[\s,;]+/).map(d => d.replace(/^@/, '').trim()).filter(Boolean);
  const { error } = await supabaseClient.rpc('admin_set_school_join', { target: id, mode, code, domains });
  if (error) return showToast('Could not save: ' + error.message, 'error');
  showToast('Join rules saved.', 'success');
  adminEditingSchoolId = null;
  await refreshSchoolsCache();
  await fetchAdminJoinData();
}

async function reviewJoinRequest(requestId, approve) {
  const { error } = await supabaseClient.rpc('admin_review_join_request', { request: requestId, approve });
  if (error) return showToast('Could not update request: ' + error.message, 'error');
  showToast(approve ? 'Approved — they\'re in.' : 'Request denied.', approve ? 'success' : 'info');
  fetchAdminJoinData();
  fetchAdminMembers();
}

// -------------------- Admin: school members --------------------
// Everyone in a school, plus remove (they can't rejoin until let back in)
// and make / unmake admin. The database functions check is_admin().
let adminMembersSchoolId = null;
let adminMembers = [];          // profiles in the selected school
let adminIds = new Set();       // every admin's user_id
let adminBans = [];             // students removed from the selected school
let adminMembersState = 'idle'; // 'idle' | 'loading' | 'ok' | 'error:<msg>'

function setAdminMembersSchool(id) {
  adminMembersSchoolId = id || null;
  fetchAdminMembers();
}

async function fetchAdminMembers() {
  if (!isAdmin || !isSupabaseConnected) return;
  if (!adminMembersSchoolId || !schoolsCache.some(s => s.id === adminMembersSchoolId)) {
    adminMembersSchoolId = currentSchoolId || schoolsCache[0]?.id || null;
  }
  const sid = adminMembersSchoolId;
  if (!sid) { adminMembers = []; adminBans = []; adminMembersState = 'ok'; return renderAdminMembers(); }
  adminMembersState = 'loading';
  renderAdminMembers();
  const [mem, adm, bans] = await Promise.all([
    supabaseClient.from('profiles').select('user_id, handle, display_name, created_at')
      .eq('school_id', sid).order('handle').limit(1000),
    supabaseClient.from('admins').select('user_id'),
    supabaseClient.from('school_bans').select('user_id, created_at').eq('school_id', sid)
  ]);
  if (sid !== adminMembersSchoolId) return;           // picked another school meanwhile
  if (mem.error) { adminMembersState = 'error:' + mem.error.message; return renderAdminMembers(); }
  adminMembers = mem.data || [];
  adminIds = new Set((adm.data || []).map(a => a.user_id));
  adminBans = bans.error ? [] : (bans.data || []);    // table missing until SCHEMA.sql 6g is re-run
  await fetchProfilesByIds(adminBans.map(b => b.user_id));
  adminMembersState = 'ok';
  renderAdminMembers();
}

function renderAdminMembers() {
  const sel = document.getElementById('admin-members-school');
  const list = document.getElementById('admin-member-list');
  if (!sel || !list || !isAdmin) return;

  sel.innerHTML = schoolsCache.map(s =>
    `<option value="${escapeAttr(s.id)}" ${s.id === adminMembersSchoolId ? 'selected' : ''}>${escapeHtml(s.name)}${s.id === currentSchoolId ? ' (your school)' : ''}</option>`
  ).join('') || '<option value="">No schools</option>';

  if (adminMembersState === 'loading' && !adminMembers.length) {
    list.innerHTML = '<p class="friends-empty-inner"><i class="fa-solid fa-spinner fa-spin"></i> Loading students…</p>';
    return;
  }
  if (adminMembersState.startsWith('error:')) {
    list.innerHTML = `<p class="friends-empty-inner">Couldn't load students: ${escapeHtml(adminMembersState.slice(6))}</p>`;
    return;
  }

  const q = (document.getElementById('admin-members-search')?.value || '').trim().toLowerCase().replace(/^@/, '');
  const shown = adminMembers.filter(m => !q
    || (m.handle || '').toLowerCase().includes(q) || (m.display_name || '').toLowerCase().includes(q));
  const nAdmins = adminMembers.filter(m => adminIds.has(m.user_id)).length;

  const rows = shown.map(m => {
    const name = m.display_name || m.handle || 'Student';
    const me = m.user_id === currentUserId;
    const admin = adminIds.has(m.user_id);
    const uid = escapeAttr(m.user_id);
    const actions = me ? '' : `
      <button class="secondary-btn friend-btn-sm" onclick="adminToggleAdmin('${uid}', ${!admin})">${admin ? 'Remove admin' : 'Make admin'}</button>
      ${admin ? '' : `<button class="secondary-btn friend-btn-sm danger-text" onclick="adminRemoveMember('${uid}')">Remove</button>`}`;
    return `
      <div class="admin-row admin-member-row">
        <span class="friend-avatar sm">${escapeHtml(name[0].toUpperCase())}</span>
        <div class="school-row-text">
          <strong>${escapeHtml(name)}${admin ? ' <span class="admin-badge">ADMIN</span>' : ''}${me ? ' <small>(you)</small>' : ''}</strong>
          <small>@${escapeHtml(m.handle || '')}${m.created_at ? ' · joined the app ' + escapeHtml(timeAgo(m.created_at)) : ''}</small>
        </div>
        <div class="admin-member-actions">${actions}</div>
      </div>`;
  }).join('');

  const removed = adminBans.filter(b => {
    const p = profileMap[b.user_id] || {};
    return !q || (p.handle || '').toLowerCase().includes(q) || (p.display_name || '').toLowerCase().includes(q);
  }).map(b => {
    const p = profileMap[b.user_id] || {};
    const name = p.display_name || p.handle || 'A student';
    return `
      <div class="admin-row admin-member-row">
        <span class="friend-avatar sm">${escapeHtml(name[0].toUpperCase())}</span>
        <div class="school-row-text">
          <strong>${escapeHtml(name)}</strong>
          <small>${p.handle ? '@' + escapeHtml(p.handle) + ' · ' : ''}removed ${escapeHtml(timeAgo(b.created_at))}</small>
        </div>
        <div class="admin-member-actions">
          <button class="secondary-btn friend-btn-sm" onclick="adminAllowBack('${escapeAttr(b.user_id)}')">Let back in</button>
        </div>
      </div>`;
  }).join('');

  setAdminCount('admin-students-count', adminMembers.length);
  const count = `${adminMembers.length} ${adminMembers.length === 1 ? 'person' : 'people'}${nAdmins ? ` · ${nAdmins} admin${nAdmins === 1 ? '' : 's'}` : ''}`;
  list.innerHTML = `
    <p class="admin-hint admin-members-count">${count}</p>
    ${rows || `<p class="friends-empty-inner">${q ? 'No one matches that search.' : 'No one has joined this school yet.'}</p>`}
    ${removed ? `<div class="friends-subheading" style="margin-top:10px;">Removed from this school</div>${removed}` : ''}`;
}

function adminRpcError(error) {
  const msg = error?.message || 'Something went wrong';
  if (/admin_(remove_member|allow_back|set_admin)/.test(msg) && /(function|schema cache)/i.test(msg)) {
    return 'Run the updated SCHEMA.sql in Supabase first (section 6i adds this).';
  }
  return msg;
}

function memberName(userId) {
  const p = adminMembers.find(m => m.user_id === userId) || profileMap[userId] || {};
  return p.display_name || p.handle || 'this student';
}

async function adminToggleAdmin(userId, make) {
  const name = memberName(userId);
  const ok = confirm(make
    ? `Make ${name} an admin?\n\nAdmins can delete posts, reviews, teachers, groups, events and schools, change join rules, and remove or promote students — at every school.`
    : `Remove ${name}'s admin role?`);
  if (!ok) return;
  const { error } = await supabaseClient.rpc('admin_set_admin', { target_user: userId, make });
  if (error) return showToast(adminRpcError(error), 'error', 5500);
  showToast(make ? `${name} is now an admin.` : `${name} is no longer an admin.`, 'success');
  fetchAdminMembers();
}

async function adminRemoveMember(userId) {
  const name = memberName(userId);
  const school = schoolsCache.find(s => s.id === adminMembersSchoolId)?.name || 'this school';
  const ok = confirm(`Remove ${name} from ${school}?\n\nThey lose access to its feed, study groups, teacher pages and calendar right away, and can't rejoin until an admin lets them back in. Their posts and reviews stay.`);
  if (!ok) return;
  const { error } = await supabaseClient.rpc('admin_remove_member', { target_user: userId, target_school: adminMembersSchoolId });
  if (error) return showToast(adminRpcError(error), 'error', 5500);
  showToast(`${name} was removed from ${school}.`, 'success');
  fetchAdminMembers();
}

async function adminAllowBack(userId) {
  const name = memberName(userId);
  const { error } = await supabaseClient.rpc('admin_allow_back', { target_user: userId, target_school: adminMembersSchoolId });
  if (error) return showToast(adminRpcError(error), 'error', 5500);
  showToast(`${name} can join again.`, 'success');
  fetchAdminMembers();
}

// Realtime: someone was promoted/demoted (maybe me), or a removal changed.
function onAdminsChanged() {
  clearTimeout(onAdminsChanged.t);
  onAdminsChanged.t = setTimeout(async () => {
    const was = isAdmin;
    await fetchAdminStatus();
    // (Being made an admin also arrives as a notification, which shows its own toast.)
    if (!isAdmin && was) showToast('Your admin role was removed.', 'info', 6000);
  }, 300);
}

// Realtime: an admin sees new requests; a student gets let in when approved.
async function onJoinRequestChanged(payload) {
  if (isAdmin) fetchAdminJoinData();
  const row = payload?.new;
  if (!row || row.user_id !== currentUserId) return;
  myJoinRequests[row.school_id] = row.status;
  if (row.status === 'approved') {
    const name = schoolsCache.find(s => s.id === row.school_id)?.name || 'your school';
    showToast(`You've been approved to join ${name}!`, 'success', 6000);
    await ensureProfile();
    loadAllSupabaseData();
  } else if (row.status === 'denied') {
    showToast('Your request to join was denied.', 'warn', 6000);
  }
  if (document.getElementById('schoolModal')?.style.display === 'flex') renderSchoolPicker();
}

async function onSchoolsChanged() {
  await refreshSchoolsCache();
  renderAdminPanel();
  renderTeacherSchoolOptions();
  if (document.getElementById('schoolModal')?.style.display === 'flex') renderSchoolPicker();
}

async function adminDeleteSchool(id) {
  const s = schoolsCache.find(x => x.id === id);
  if (!s) return;
  const typed = prompt(
    `Delete "${s.name}"?\n\nThis permanently removes its teacher pages, reviews, feed posts, ` +
    `study groups and events. Its students will be asked to pick another school.\n\n` +
    `Type the school name to confirm:`);
  if (typed == null) return;
  if (typed.trim().toLowerCase() !== s.name.toLowerCase()) {
    return showToast("Name didn't match — nothing was deleted.", 'info');
  }
  const { error } = await supabaseClient.rpc('admin_delete_school', { target: id });
  if (error) return showToast('Could not delete school: ' + error.message, 'error');
  showToast(`${s.name} deleted.`, 'success');
  await refreshSchoolsCache();
  if (id === currentSchoolId) {
    currentSchoolId = null; currentSchool = null;
    updateSchoolChrome();
    openSchoolPicker(true);
  }
  renderAdminPanel();
  loadAllSupabaseData();
}

async function adminDeleteTeacher() {
  if (!isAdmin || !currentTeacher) return;
  const n = teacherPosts.length;
  if (!confirm(`Delete ${currentTeacher.name}'s page and all ${n} post${n === 1 ? '' : 's'} on it? This can't be undone.`)) return;
  const { data, error } = await supabaseClient.from('teachers').delete().eq('id', currentTeacher.id).select('id');
  if (error || !data?.length) return showToast('Could not delete: ' + (error?.message || 'not allowed'), 'error');
  showToast('Teacher page deleted.', 'success');
  currentTeacher = null;
  switchTab('search-view');
}

async function deleteFeedPost(id) {
  if (!confirm('Delete this post?')) return;
  const { data, error } = await supabaseClient.from('campus_feed').delete().eq('id', id).select('id');
  if (error || !data?.length) return showToast('Could not delete: ' + (error?.message || 'not allowed'), 'error');
  campusFeed = campusFeed.filter(p => !samePostId(p.id, id));
  renderFeed();
  showToast('Post deleted.', 'success');
}

async function deleteGroup(id) {
  const g = findGroup(id);
  if (!g || !confirm(`Delete the group "${g.name}"? Everyone in it will lose it.`)) return;
  const { data, error } = await supabaseClient.from('study_groups').delete().eq('id', g.id).select('id');
  if (error || !data?.length) return showToast('Could not delete: ' + (error?.message || 'not allowed'), 'error');
  studyGroups = studyGroups.filter(x => x !== g);
  if (openGroupId === String(g.id)) { closeModalForce(); openGroupId = null; }
  renderGroups();
  showToast('Group deleted.', 'success');
  fetchGroups();
}

// ==================== GPA calculator ====================
// Courses for this term, plus an optional GPA/credits you already have
// (for an overall GPA) and a goal. Saved per account on this device.
const GPA_GRADES = [
  ['A+', 4.0], ['A', 4.0], ['A-', 3.7], ['B+', 3.3], ['B', 3.0], ['B-', 2.7],
  ['C+', 2.3], ['C', 2.0], ['C-', 1.7], ['D+', 1.3], ['D', 1.0], ['D-', 0.7], ['F', 0.0]
];
const GPA_POINTS = Object.fromEntries(GPA_GRADES);
const GPA_LEVELS = [['reg', 'Regular', 0], ['hon', 'Honors', 0.5], ['ap', 'AP / IB', 1.0]];
const GPA_BONUS = Object.fromEntries(GPA_LEVELS.map(([k, , b]) => [k, b]));
let gpaState = { mode: 'unweighted', prevGpa: '', prevCredits: '', target: '' };

function gpaKey() { return currentUserId ? `gpa_${currentUserId}` : null; }

function loadGpa() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(gpaKey()) || 'null'); } catch (_) {}
  // Older versions saved just the list of courses.
  const raw = Array.isArray(saved) ? { courses: saved } : (saved || {});
  gpaCourses = (raw.courses || []).map(c => ({
    id: c.id || gpaId(),
    name: String(c.name || ''),
    grade: GPA_POINTS[c.grade] !== undefined ? c.grade : 'A',
    level: GPA_BONUS[c.level] !== undefined ? c.level : 'reg',
    credits: Number.isFinite(+c.credits) ? +c.credits : 3
  }));
  gpaState = {
    mode: raw.mode === 'weighted' ? 'weighted' : 'unweighted',
    prevGpa: raw.prevGpa ?? '', prevCredits: raw.prevCredits ?? '', target: raw.target ?? ''
  };
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('gpa-prev', gpaState.prevGpa); set('gpa-prev-credits', gpaState.prevCredits); set('gpa-target', gpaState.target);
  renderGpaRows();
}

function saveGpaLocal() {
  const key = gpaKey();
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify({ v: 2, courses: gpaCourses, ...gpaState })); } catch (_) {}
}

function gpaId() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function renderGpaRows() {
  const container = document.getElementById('gpa-rows-container');
  if (!container) return;

  if (!gpaCourses.length) {
    container.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-calculator"></i>
      <p>No courses added yet. Add your classes for this term to see your GPA.</p>
      <button class="primary-btn" onclick="addGpaRow()">+ Add Course</button>
    </div>`;
    calculateGPA();
    return;
  }

  container.innerHTML = gpaCourses.map(c => {
    const id = escapeAttr(c.id);
    return `
    <div class="gpa-row" data-id="${id}">
      <input type="text" class="auth-input gpa-name" value="${escapeAttr(c.name)}" placeholder="Course name" maxlength="60"
             aria-label="Course name" oninput="updateGpaData('${id}', 'name', this.value)" onkeydown="gpaNameKey(event)" />
      <div class="gpa-fields">
        <select class="mini-select gpa-grade" aria-label="Grade" onchange="updateGpaData('${id}', 'grade', this.value)">
          ${GPA_GRADES.map(([g]) => `<option value="${g}" ${c.grade === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
        <select class="mini-select gpa-level" aria-label="Level" onchange="updateGpaData('${id}', 'level', this.value)">
          ${GPA_LEVELS.map(([k, label]) => `<option value="${k}" ${c.level === k ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
        <label class="gpa-credits" title="Credits">
          <input type="number" class="auth-input credit-input" value="${escapeAttr(c.credits)}" min="0" max="10" step="0.5"
                 inputmode="decimal" aria-label="Credits" oninput="updateGpaData('${id}', 'credits', this.value)" />
          <span>cr</span>
        </label>
        <span class="gpa-pts" data-pts title="Grade points"></span>
      </div>
      <button class="gpa-del" type="button" onclick="deleteGpaRow('${id}')" aria-label="Remove ${escapeAttr(c.name || 'course')}">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>`;
  }).join('');
  calculateGPA();
}

function addGpaRow() {
  const last = gpaCourses[gpaCourses.length - 1];
  gpaCourses.push({ id: gpaId(), name: '', grade: 'A', level: 'reg', credits: last ? last.credits : 3 });
  saveGpaLocal();
  renderGpaRows();
  const inputs = document.querySelectorAll('#gpa-rows-container .gpa-name');
  inputs[inputs.length - 1]?.focus();
}

// Enter in a course name moves to the next course (or adds one).
function gpaNameKey(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const row = e.target.closest('.gpa-row');
  if (row && row.nextElementSibling) row.nextElementSibling.querySelector('.gpa-name')?.focus();
  else addGpaRow();
}

function updateGpaData(id, key, val) {
  const c = gpaCourses.find(x => x.id === id);
  if (!c) return;
  if (key === 'credits') {
    const n = parseFloat(val);
    c.credits = Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 0;
  } else {
    c[key] = val;
  }
  saveGpaLocal();
  calculateGPA();
}

function deleteGpaRow(id) {
  const i = gpaCourses.findIndex(x => x.id === id);
  if (i < 0) return;
  const [removed] = gpaCourses.splice(i, 1);
  saveGpaLocal();
  renderGpaRows();
  // Tapping the pop-up puts it back.
  showToast(`Removed ${removed.name || 'course'}. Tap to undo.`, 'info', 5000, () => {
    if (gpaCourses.some(x => x.id === removed.id)) return;
    gpaCourses.splice(Math.min(i, gpaCourses.length), 0, removed);
    saveGpaLocal();
    renderGpaRows();
  });
}

function setGpaMode(mode) {
  gpaState.mode = mode === 'weighted' ? 'weighted' : 'unweighted';
  saveGpaLocal();
  calculateGPA();
}

function updateGpaExtra() {
  gpaState.prevGpa = document.getElementById('gpa-prev')?.value ?? '';
  gpaState.prevCredits = document.getElementById('gpa-prev-credits')?.value ?? '';
  gpaState.target = document.getElementById('gpa-target')?.value ?? '';
  saveGpaLocal();
  calculateGPA();
}

function coursePoints(c, weighted) {
  const base = GPA_POINTS[c.grade] ?? 0;
  return weighted && base > 0 ? base + (GPA_BONUS[c.level] || 0) : base;
}

function gpaLetter(g) {
  const cut = [[3.85, 'A'], [3.5, 'A-'], [3.15, 'B+'], [2.85, 'B'], [2.5, 'B-'], [2.15, 'C+'],
               [1.85, 'C'], [1.5, 'C-'], [1.15, 'D+'], [0.85, 'D'], [0.5, 'D-']];
  const hit = cut.find(([min]) => g >= min);
  return hit ? hit[1] : 'F';
}

function calculateGPA() {
  const weighted = gpaState.mode === 'weighted';
  const scaleMax = weighted ? 5 : 4;
  let pts = 0, credits = 0;
  gpaCourses.forEach(c => {
    const cr = +c.credits || 0;
    pts += coursePoints(c, weighted) * cr;
    credits += cr;
  });
  const term = credits > 0 ? pts / credits : null;

  const prevGpa = parseFloat(gpaState.prevGpa);
  const prevCr = parseFloat(gpaState.prevCredits);
  const hasPrev = Number.isFinite(prevGpa) && Number.isFinite(prevCr) && prevCr > 0;
  const overall = hasPrev ? (prevGpa * prevCr + pts) / (prevCr + credits) : term;
  const totalCr = +(credits + (hasPrev ? prevCr : 0)).toFixed(1);
  const fmt = v => v === null || !Number.isFinite(v) ? '–' : v.toFixed(2);

  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setText('calculated-gpa', fmt(overall ?? 0));
  setText('gpa-hero-label', `${weighted ? 'Weighted' : 'Unweighted'} · out of ${scaleMax.toFixed(1)}`);
  setText('gpa-letter', overall === null ? '' : `≈ ${gpaLetter(Math.min(4, overall))} average${hasPrev ? ' overall' : ''}`);
  setText('gpa-term-val', fmt(term));
  setText('gpa-cum-val', hasPrev ? fmt(overall) : '–');
  setText('gpa-credits-val', String(totalCr));
  // Home screen stats
  setText('gpa-summary-val', fmt(overall ?? 0));
  setText('total-credits-val', String(totalCr));

  const ring = document.getElementById('gpa-ring-fill');
  if (ring) {
    const len = 2 * Math.PI * 52;
    ring.style.strokeDasharray = `${len}`;
    ring.style.strokeDashoffset = `${len * (1 - Math.max(0, Math.min(1, (overall || 0) / scaleMax)))}`;
  }
  document.querySelectorAll('#gpa-mode .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === gpaState.mode));

  // What each course is worth, on its row.
  document.querySelectorAll('#gpa-rows-container .gpa-row').forEach(row => {
    const c = gpaCourses.find(x => x.id === row.dataset.id);
    const out = row.querySelector('[data-pts]');
    if (c && out) out.textContent = coursePoints(c, weighted).toFixed(1);
  });

  renderGpaGoal({ weighted, scaleMax, credits, hasPrev, prevGpa, prevCr, overall });
}

// "What do I need this term?" from the goal and the GPA so far.
function renderGpaGoal({ weighted, scaleMax, credits, hasPrev, prevGpa, prevCr, overall }) {
  const el = document.getElementById('gpa-goal');
  if (!el) return;
  const target = parseFloat(gpaState.target);
  el.className = 'gpa-goal';
  if (!Number.isFinite(target)) { el.hidden = true; return; }
  el.hidden = false;
  const t = target.toFixed(2);
  if (!hasPrev) {
    if (overall === null) { el.textContent = `Add your courses to compare them with your goal of ${t}.`; return; }
    const onTrack = overall >= target - 1e-9;
    el.classList.add(onTrack ? 'good' : 'warn');
    el.textContent = onTrack
      ? `On track: ${overall.toFixed(2)} meets your goal of ${t}.`
      : `${(target - overall).toFixed(2)} below your goal of ${t}. Add your GPA so far to see exactly what you need this term.`;
    return;
  }
  if (credits <= 0) { el.textContent = `Add this term's courses to see what you need to reach ${t}.`; return; }
  const need = (target * (prevCr + credits) - prevGpa * prevCr) / credits;
  const best = (prevGpa * prevCr + scaleMax * credits) / (prevCr + credits);
  if (need > scaleMax + 1e-9) {
    el.classList.add('warn');
    el.textContent = `${t} isn't reachable this term. A perfect ${scaleMax.toFixed(1)} this term would get you to ${best.toFixed(2)} overall.`;
  } else if (need <= 0) {
    el.classList.add('good');
    el.textContent = `You'll stay at or above ${t} overall whatever you get this term.`;
  } else {
    const onTrack = overall >= target - 1e-9;
    el.classList.add(onTrack ? 'good' : 'warn');
    el.textContent = `To reach ${t} overall you need ${need.toFixed(2)} this term` +
      (need <= 4 ? ` (about a${/^[AEF]/.test(gpaLetter(need)) ? 'n' : ''} ${gpaLetter(need)} average${weighted ? ' before the Honors/AP bonus' : ''}).` : '.') +
      (onTrack ? ' Your grades right now get you there.' : ` Right now you're at ${overall.toFixed(2)}.`);
  }
}

// ==================== Pomodoro timer ====================
// Timestamp-based: stays accurate when a phone suspends the tab, keeps
// running while the modal is closed, and survives a page reload.
const POMO_DURATIONS = { focus: 25 * 60 * 1000, break: 5 * 60 * 1000 };
let pomo = { mode: 'focus', running: false, endAt: 0, remaining: POMO_DURATIONS.focus };
let pomoTick = null;

function loadPomo() {
  try {
    const saved = JSON.parse(localStorage.getItem('pomo') || 'null');
    if (saved && POMO_DURATIONS[saved.mode]) pomo = { ...pomo, ...saved };
  } catch (_) { /* corrupt state — keep defaults */ }
  if (pomo.running) startPomoTick();
  onPomoTick();
}
function savePomo() { try { localStorage.setItem('pomo', JSON.stringify(pomo)); } catch (_) {} }
function pomoRemainingMs() { return pomo.running ? Math.max(0, pomo.endAt - Date.now()) : pomo.remaining; }
function startPomoTick() { if (!pomoTick) pomoTick = setInterval(onPomoTick, 250); }
function stopPomoTick() { clearInterval(pomoTick); pomoTick = null; }

function onPomoTick() {
  if (pomo.running && pomoRemainingMs() <= 0) return finishPomo();
  renderTimer();
}

function finishPomo() {
  const wasFocus = pomo.mode === 'focus';
  stopPomoTick();
  pomo.mode = wasFocus ? 'break' : 'focus';
  pomo.running = false;
  pomo.remaining = POMO_DURATIONS[pomo.mode];
  savePomo();
  renderTimer();
  showToast(wasFocus ? '🍅 Focus done — take a 5-minute break.' : 'Break over — ready for another round?', 'success', 6000);
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

function openTimerModal() { renderTimer(); document.getElementById('timerModal').style.display = 'flex'; }
function closeTimerModal() { document.getElementById('timerModal').style.display = 'none'; }

function toggleTimer() {
  if (pomo.running) {
    pomo.remaining = pomoRemainingMs();
    pomo.running = false;
    stopPomoTick();
  } else {
    if (pomo.remaining <= 0) pomo.remaining = POMO_DURATIONS[pomo.mode];
    pomo.endAt = Date.now() + pomo.remaining;
    pomo.running = true;
    startPomoTick();
  }
  savePomo();
  renderTimer();
}

function resetTimer() {
  stopPomoTick();
  pomo.running = false;
  pomo.remaining = POMO_DURATIONS[pomo.mode];
  savePomo();
  renderTimer();
}

function setTimerMode(mode) {
  if (!POMO_DURATIONS[mode] || mode === pomo.mode) return;
  if (pomo.running && !confirm('Switch modes? The current countdown will reset.')) return;
  pomo.mode = mode;
  resetTimer();
}

function fmtClock(ms) {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function renderTimer() {
  const ms = pomoRemainingMs();
  const full = POMO_DURATIONS[pomo.mode];
  const inProgress = pomo.running || ms < full;

  const display = document.getElementById('timer-display');
  if (display) display.textContent = fmtClock(ms);
  const fill = document.getElementById('timer-progress-fill');
  if (fill) fill.style.width = `${Math.min(100, 100 * (1 - ms / full))}%`;
  const btn = document.getElementById('timer-start-btn');
  if (btn) {
    btn.textContent = pomo.running ? 'Pause' : (inProgress ? 'Resume' : 'Start');
    btn.classList.toggle('active-state', pomo.running);
  }
  document.querySelectorAll('#timer-mode-seg .seg-btn')
    .forEach(b => b.classList.toggle('active', b.dataset.mode === pomo.mode));
  const hint = document.getElementById('timer-hint');
  if (hint) hint.textContent = pomo.mode === 'focus'
    ? 'Focus session — keeps running if you close this.'
    : 'Break — stretch, drink water, look away from the screen.';

  const label = document.getElementById('pomo-tool-label');
  if (label) label.textContent = inProgress ? `${pomo.running ? '' : '⏸ '}${fmtClock(ms)}` : 'Pomodoro';
  document.getElementById('pomo-tool-btn')?.classList.toggle('pomo-live', pomo.running);
}

document.addEventListener('visibilitychange', () => { if (!document.hidden) onPomoTick(); });

// ==================== Teachers ====================
// Teachers belong to a school and each has a page of posts:
//   review       — rating, difficulty, would-take-again, tags, text
//   requirement  — course requirements (textbook, grading, workload...)
//   note         — tips, heads-ups, resources
// Anyone can browse any school; only that school's students can post.

const ANON_AUTHOR = 'Anonymous student';
const POST_KIND_META = {
  review: {
    title: 'Write a review', editTitle: 'Edit your review', bodyLabel: 'Your review',
    placeholder: 'What was the class like? How do they teach, grade, and treat students?',
    tags: ['Clear lectures', 'Tough grader', 'Lots of homework', 'Test heavy', 'Caring', 'Inspiring',
           'Extra credit', 'Group projects', 'Strict deadlines', 'Easy A'],
    tagLabel: 'Tags (up to 3)', maxTags: 3, empty: 'No reviews yet.', cta: '+ Write a review'
  },
  requirement: {
    title: 'Add course info', editTitle: 'Edit course info', bodyLabel: 'Requirements',
    placeholder: 'Textbook, grading breakdown, homework load, exams, projects, supplies...',
    tags: ['Textbook', 'Grading', 'Homework', 'Exams', 'Projects', 'Attendance', 'Materials', 'Prerequisites'],
    tagLabel: 'What does this cover?', maxTags: 4, empty: 'No course requirements posted yet.', cta: '+ Add course info'
  },
  note: {
    title: 'Add a note', editTitle: 'Edit note', bodyLabel: 'Note',
    placeholder: 'Tips, heads-ups, useful resources, how to do well...',
    tags: ['Tip', 'Heads up', 'Resource', 'Office hours', 'Study guide'],
    tagLabel: 'Type', maxTags: 2, empty: 'No notes yet.', cta: '+ Add a note'
  }
};
const RATING_WORDS = ['', 'Awful', 'Poor', 'OK', 'Good', 'Awesome'];
const DIFFICULTY_WORDS = ['', 'Very easy', 'Easy', 'Medium', 'Hard', 'Very hard'];

let teacherDir = [];              // teacher_stats rows for the selected school
let teacherDirSchoolId = 'mine';  // 'mine' | <school_id>
let teacherSort = 'top';
let currentTeacher = null;        // teacher_stats row for the open page
let teacherPosts = [];
let teacherVotes = {};            // post_id -> { count, mine }
let teacherTab = 'review';
let composerKind = 'review';
let editingPostId = null;
let tpDraft = { rating: 0, difficulty: 0, again: null, tags: [] };
let myReviewCount = 0;
let teacherRefreshTimer = null;

function dirSchoolId() { return teacherDirSchoolId === 'mine' ? currentSchoolId : teacherDirSchoolId; }
function schoolName(id) { return (schoolsCache.find(s => s.id === id) || {}).name || 'another school'; }
function toNum(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : null; }
function ratingClass(avg) { return avg == null ? 'r-none' : avg >= 4 ? 'r-good' : avg >= 3 ? 'r-ok' : 'r-bad'; }
function isViewActive(id) { return document.getElementById(id)?.classList.contains('active-view'); }

function teacherInitials(name) {
  const clean = String(name || '').replace(/^(mr|mrs|ms|mx|dr|prof|coach)\.?\s+/i, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const units = [[31536000, 'y'], [2592000, 'mo'], [604800, 'w'], [86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [secs, u] of units) if (s >= secs) return `${Math.floor(s / secs)}${u} ago`;
  return 'just now';
}

function starsHtml(n) {
  const r = Math.max(0, Math.min(5, Math.round(n || 0)));
  return `<span class="stars">${'★'.repeat(r)}<span class="stars-off">${'★'.repeat(5 - r)}</span></span>`;
}

// ---------- Directory ----------

async function fetchTeacherDirectory() {
  if (!isSupabaseConnected || !currentUserId) return renderTeacherDirectory();
  const school = dirSchoolId();
  if (!school) { teacherDir = []; return renderTeacherDirectory(); }
  const { data, error } = await supabaseClient
    .from('teacher_stats').select('*').eq('school_id', school).limit(500);
  if (error) return showToast('Could not load teachers: ' + error.message, 'error');
  teacherDir = data || [];
  renderTeacherDirectory();
}

function setTeacherDirSchool(value) {
  teacherDirSchoolId = value || 'mine';
  fetchTeacherDirectory();
}

function setTeacherSort(mode, btn) {
  teacherSort = mode;
  document.querySelectorAll('#teacher-sort-chips .chip').forEach(c => c.classList.toggle('active', c === btn));
  renderTeacherDirectory();
}

function renderTeacherSchoolOptions() {
  const sel = document.getElementById('teacher-school-filter');
  if (!sel) return;
  sel.innerHTML = [
    `<option value="mine">${currentSchool ? 'My school · ' + escapeHtml(currentSchool.name) : 'My school'}</option>`,
    ...schoolsCache.filter(s => s.id !== currentSchoolId)
      .map(s => `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)}</option>`)
  ].join('');
  sel.value = [...sel.options].some(o => o.value === teacherDirSchoolId) ? teacherDirSchoolId : 'mine';
}

function renderTeacherDirectory() {
  const container = document.getElementById('teacher-directory');
  if (!container) return;
  renderTeacherSchoolOptions();

  if (!currentUserId) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-chalkboard-user"></i><p>Sign in to browse teachers.</p></div>`;
    return;
  }
  if (!dirSchoolId()) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-graduation-cap"></i>
      <p>Pick your school to see its teachers.</p>
      <button class="primary-btn" onclick="openSchoolPicker(false)">Pick school</button></div>`;
    return;
  }

  const q = (document.getElementById('teacher-search-input')?.value || '').trim().toLowerCase();
  const list = teacherDir.filter(t => !q
    || t.name.toLowerCase().includes(q)
    || (t.subject || '').toLowerCase().includes(q));

  const byRating = (a, b) => (toNum(b.avg_rating) ?? -1) - (toNum(a.avg_rating) ?? -1) || b.review_count - a.review_count;
  const sorters = {
    top:  byRating,
    most: (a, b) => b.review_count - a.review_count || byRating(a, b),
    easy: (a, b) => (toNum(a.avg_difficulty) ?? 99) - (toNum(b.avg_difficulty) ?? 99),
    az:   (a, b) => a.name.localeCompare(b.name)
  };
  list.sort(sorters[teacherSort] || byRating);

  if (!list.length) {
    const ownSchool = dirSchoolId() === currentSchoolId;
    container.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-chalkboard-user"></i>
      <p>${q ? `No teachers match "${escapeHtml(q)}".` : 'No teacher pages here yet.'}</p>
      ${ownSchool ? '<button class="primary-btn" onclick="openAddTeacherModal()">+ Add a teacher</button>' : ''}
    </div>`;
    return;
  }

  container.innerHTML = list.map(t => {
    const avg = toNum(t.avg_rating);
    const diff = toNum(t.avg_difficulty);
    const meta = [
      t.subject ? escapeHtml(t.subject) : null,
      `${t.review_count} review${t.review_count === 1 ? '' : 's'}`,
      diff != null ? `Difficulty ${diff.toFixed(1)}` : null
    ].filter(Boolean).join(' · ');
    return `
      <button class="teacher-card" onclick="openTeacherPage('${escapeAttr(t.id)}')">
        <div class="teacher-avatar">${escapeHtml(teacherInitials(t.name))}</div>
        <div class="teacher-meta">
          <strong>${escapeHtml(t.name)}</strong>
          <small>${meta}</small>
        </div>
        <div class="rating-badge ${ratingClass(avg)}">${avg != null ? avg.toFixed(1) : '–'}</div>
      </button>`;
  }).join('');
}

// ---------- Add teacher ----------

function openAddTeacherModal() {
  if (!currentUserId) return showToast('Sign in to add a teacher.', 'warn');
  if (!currentSchoolId) return openSchoolPicker(true);
  document.getElementById('add-teacher-sub').textContent = `Creates a page for them at ${currentSchool?.name || 'your school'}.`;
  document.getElementById('addTeacherModal').style.display = 'flex';
  setTimeout(() => document.getElementById('new-teacher-name')?.focus(), 50);
}
function closeAddTeacherModal() { document.getElementById('addTeacherModal').style.display = 'none'; }

async function submitAddTeacher(event) {
  event.preventDefault();
  const name = document.getElementById('new-teacher-name').value.replace(/\s+/g, ' ').trim();
  const subject = document.getElementById('new-teacher-subject').value.trim() || null;
  if (name.length < 2) return showToast('Enter the teacher\'s name.', 'warn');

  const { data, error } = await supabaseClient
    .from('teachers')
    .insert([{ name, subject, school_id: currentSchoolId, created_by: currentUserId }])
    .select('id').single();

  let teacherId = data?.id;
  if (error) {
    if (error.code !== '23505') return showToast('Could not add teacher: ' + error.message, 'error');
    // Already exists at this school — open their page instead.
    const { data: existing } = await supabaseClient
      .from('teachers').select('id')
      .eq('school_id', currentSchoolId)
      .ilike('name', name.replace(/[%_\\]/g, '\\$&'))
      .maybeSingle();
    if (!existing) return showToast('That teacher already exists.', 'warn');
    teacherId = existing.id;
    showToast(`${name} already has a page — opening it.`, 'info');
  } else {
    showToast(`Page created for ${name}.`, 'success');
  }
  closeAddTeacherModal();
  event.target.reset();
  openTeacherPage(teacherId);
}

// ---------- Teacher page ----------

async function openTeacherPage(id) {
  teacherTab = 'review';
  currentTeacher = null;
  teacherPosts = [];
  document.getElementById('teacher-hero').innerHTML = '<div class="teacher-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>';
  document.getElementById('teacher-posts').innerHTML = '';
  switchTab('teacher-view');
  await loadTeacherPage(id);
}

async function loadTeacherPage(id) {
  const [statsRes, postsRes] = await Promise.all([
    supabaseClient.from('teacher_stats').select('*').eq('id', id).maybeSingle(),
    supabaseClient.from('teacher_posts').select('*').eq('teacher_id', id)
      .order('created_at', { ascending: false }).limit(200)
  ]);
  if (statsRes.error || !statsRes.data) {
    showToast('That teacher page could not be found.', 'error');
    return switchTab('search-view');
  }
  currentTeacher = statsRes.data;
  teacherPosts = postsRes.data || [];

  teacherVotes = {};
  const ids = teacherPosts.map(p => p.id);
  if (ids.length) {
    const { data: votes } = await supabaseClient
      .from('teacher_post_votes').select('post_id, user_id').in('post_id', ids);
    (votes || []).forEach(v => {
      const cur = teacherVotes[v.post_id] || { count: 0, mine: false };
      cur.count += 1;
      if (v.user_id === currentUserId) cur.mine = true;
      teacherVotes[v.post_id] = cur;
    });
  }
  renderTeacherPage();
}

function canPostOnTeacher() {
  return !!(currentUserId && currentTeacher && currentTeacher.school_id === currentSchoolId);
}
function myReviewOnTeacher() {
  return teacherPosts.find(p => p.kind === 'review' && p.author_id === currentUserId) || null;
}

function renderTeacherPage() {
  if (!currentTeacher) return;
  renderTeacherHero();
  ['review', 'requirement', 'note'].forEach(k => {
    const el = document.getElementById(`tt-count-${k}`);
    if (el) el.textContent = teacherPosts.filter(p => p.kind === k).length;
  });
  document.querySelectorAll('#teacher-tabs .teacher-tab')
    .forEach(b => b.classList.toggle('active', b.dataset.kind === teacherTab));
  renderTeacherCourseFilter();
  renderTeacherPosts();
}

function renderTeacherHero() {
  const t = currentTeacher;
  const reviews = teacherPosts.filter(p => p.kind === 'review');
  const avg = toNum(t.avg_rating);
  const diff = toNum(t.avg_difficulty);
  const again = toNum(t.take_again_pct);

  const dist = [5, 4, 3, 2, 1].map(n => {
    const c = reviews.filter(r => r.rating === n).length;
    const pct = reviews.length ? Math.round(100 * c / reviews.length) : 0;
    return `<div class="dist-row"><span>${n}★</span><div class="dist-bar"><div style="width:${pct}%"></div></div><span>${c}</span></div>`;
  }).join('');

  const tagCounts = {};
  reviews.forEach(r => (r.tags || []).forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }));
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const courses = [...new Set(teacherPosts.map(p => (p.course || '').trim()).filter(Boolean))];

  document.getElementById('teacher-hero').innerHTML = `
    <div class="teacher-hero-top">
      <div class="teacher-avatar lg">${escapeHtml(teacherInitials(t.name))}</div>
      <div class="teacher-hero-text">
        <h1>${escapeHtml(t.name)}</h1>
        <p>${[t.subject, schoolName(t.school_id)].filter(Boolean).map(escapeHtml).join(' · ')}</p>
      </div>
    </div>
    <div class="teacher-stat-grid">
      <div class="tstat"><span class="tstat-num ${ratingClass(avg)}">${avg != null ? avg.toFixed(1) : '–'}</span><span class="tstat-label">Rating</span></div>
      <div class="tstat"><span class="tstat-num">${diff != null ? diff.toFixed(1) : '–'}</span><span class="tstat-label">Difficulty</span></div>
      <div class="tstat"><span class="tstat-num">${again != null ? Math.round(again) + '%' : '–'}</span><span class="tstat-label">Take again</span></div>
      <div class="tstat"><span class="tstat-num">${t.review_count}</span><span class="tstat-label">Reviews</span></div>
    </div>
    ${reviews.length ? `<div class="rating-dist">${dist}</div>` : ''}
    ${topTags.length ? `<div class="teacher-top-tags">${topTags.map(([tag, c]) =>
      `<span class="tag-chip">${escapeHtml(tag)} <b>${c}</b></span>`).join('')}</div>` : ''}
    ${courses.length ? `<div class="teacher-courses"><i class="fa-solid fa-book"></i> ${courses.map(escapeHtml).join(' · ')}</div>` : ''}
    ${canPostOnTeacher() ? '' : `<div class="teacher-readonly"><i class="fa-solid fa-eye"></i> ${currentUserId
      ? `Only students at ${escapeHtml(schoolName(t.school_id))} can post here.` : 'Sign in to post.'}</div>`}
    ${isAdmin ? `<button class="secondary-btn admin-inline-btn" onclick="adminDeleteTeacher()">
      <i class="fa-solid fa-shield-halved"></i> Delete teacher page</button>` : ''}
  `;
}

function setTeacherTab(kind) {
  if (!POST_KIND_META[kind]) return;
  teacherTab = kind;
  renderTeacherPage();
}

function renderTeacherCourseFilter() {
  const sel = document.getElementById('teacher-course-filter');
  if (!sel) return;
  const prev = sel.value;
  const courses = [...new Set(teacherPosts.filter(p => p.kind === teacherTab)
    .map(p => (p.course || '').trim()).filter(Boolean))].sort();
  sel.innerHTML = `<option value="all">All courses</option>` +
    courses.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join('');
  sel.value = courses.includes(prev) ? prev : 'all';
  sel.style.visibility = courses.length ? 'visible' : 'hidden';

  const btn = document.getElementById('teacher-compose-btn');
  if (btn) {
    const mine = teacherTab === 'review' && myReviewOnTeacher();
    btn.textContent = mine ? 'Edit my review' : POST_KIND_META[teacherTab].cta;
    btn.disabled = !canPostOnTeacher();
  }
}

function renderTeacherPosts() {
  const container = document.getElementById('teacher-posts');
  if (!container || !currentTeacher) return;
  const meta = POST_KIND_META[teacherTab];
  const course = document.getElementById('teacher-course-filter')?.value || 'all';

  const list = teacherPosts
    .filter(p => p.kind === teacherTab && (course === 'all' || (p.course || '').trim() === course))
    .sort((a, b) =>
      (b.author_id === currentUserId) - (a.author_id === currentUserId)
      || (teacherVotes[b.id]?.count || 0) - (teacherVotes[a.id]?.count || 0)
      || new Date(b.created_at) - new Date(a.created_at));

  if (!list.length) {
    container.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-${teacherTab === 'review' ? 'star' : teacherTab === 'requirement' ? 'list-check' : 'note-sticky'}"></i>
      <p>${meta.empty}</p>
      ${canPostOnTeacher() ? `<button class="primary-btn" onclick="openTeacherPostModal()">${meta.cta}</button>` : ''}
    </div>`;
    return;
  }

  container.innerHTML = list.map(p => {
    const mine = p.author_id && p.author_id === currentUserId;
    const votes = teacherVotes[p.id] || { count: 0, mine: false };
    const author = p.author_name || ANON_AUTHOR;
    const sub = [p.course ? escapeHtml(p.course) : null, timeAgo(p.created_at), p.updated_at ? 'edited' : null]
      .filter(Boolean).join(' · ');
    const reviewBits = p.kind === 'review' ? `
      <div class="tpost-metrics">
        ${starsHtml(p.rating)}
        ${p.difficulty ? `<span>Difficulty <b>${p.difficulty}/5</b></span>` : ''}
        ${p.would_take_again != null ? `<span>Take again <b>${p.would_take_again ? 'Yes' : 'No'}</b></span>` : ''}
      </div>` : '';
    return `
      <div class="info-card tpost ${mine ? 'tpost-mine' : ''}">
        <div class="tpost-head">
          <span class="friend-avatar sm">${escapeHtml(author[0].toUpperCase())}</span>
          <div class="tpost-author">
            <strong>${escapeHtml(author)}${mine ? ' <em>(you)</em>' : ''}</strong>
            <small>${sub}</small>
          </div>
          ${p.kind === 'review' ? `<div class="rating-badge sm ${ratingClass(p.rating)}">${p.rating}</div>` : ''}
        </div>
        ${reviewBits}
        ${(p.tags || []).length ? `<div class="tpost-tags">${p.tags.map(tag => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        <p class="tpost-body">${renderSafeMessage(p.body || '')}</p>
        <div class="tpost-actions">
          <button class="helpful-btn ${votes.mine ? 'active' : ''}" onclick="toggleHelpful('${escapeAttr(p.id)}')" ${mine ? 'disabled' : ''}>
            <i class="fa-solid fa-thumbs-up"></i> Helpful${votes.count ? ' · ' + votes.count : ''}
          </button>
          ${mine ? `
            <button class="text-btn" onclick="openTeacherPostModal('${escapeAttr(p.id)}')">Edit</button>` : ''}
          ${mine || isAdmin ? `
            <button class="text-btn danger-text" onclick="deleteTeacherPost('${escapeAttr(p.id)}')">Delete</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

async function toggleHelpful(postId) {
  if (!currentUserId) return showToast('Sign in to vote.', 'warn');
  const cur = teacherVotes[postId] || { count: 0, mine: false };
  const req = cur.mine
    ? supabaseClient.from('teacher_post_votes').delete().eq('post_id', postId).eq('user_id', currentUserId)
    : supabaseClient.from('teacher_post_votes').insert([{ post_id: postId, user_id: currentUserId }]);
  const { error } = await req;
  if (error) return showToast('Vote failed: ' + error.message, 'error');
  teacherVotes[postId] = { count: Math.max(0, cur.count + (cur.mine ? -1 : 1)), mine: !cur.mine };
  renderTeacherPosts();
}

async function deleteTeacherPost(postId) {
  if (!confirm('Delete this post? This can\'t be undone.')) return;
  // .select() so a delete blocked by the database is reported instead of silently doing nothing.
  const { data, error } = await supabaseClient.from('teacher_posts').delete().eq('id', postId).select('id');
  if (error || !data?.length) return showToast('Could not delete: ' + (error?.message || 'not allowed'), 'error');
  showToast('Post deleted.', 'success');
  fetchMyReviewCount();
  loadTeacherPage(currentTeacher.id);
}

// ---------- Composer ----------

function openTeacherPostModal(editId) {
  if (!currentUserId) return showToast('Sign in to post.', 'warn');
  if (!currentTeacher) return;
  if (!canPostOnTeacher()) {
    return showToast(`Only students at ${schoolName(currentTeacher.school_id)} can post here.`, 'warn');
  }

  let post = editId ? teacherPosts.find(p => p.id === editId) : null;
  if (!post && teacherTab === 'review') post = myReviewOnTeacher();
  editingPostId = post?.id || null;
  composerKind = post?.kind || teacherTab;
  const meta = POST_KIND_META[composerKind];

  tpDraft = {
    rating: post?.rating || 0,
    difficulty: post?.difficulty || 0,
    again: post?.would_take_again == null ? null : (post.would_take_again ? 'yes' : 'no'),
    tags: [...(post?.tags || [])]
  };

  document.getElementById('tp-modal-title').textContent = editingPostId ? meta.editTitle : meta.title;
  document.getElementById('tp-modal-sub').textContent = `About ${currentTeacher.name}`;
  document.getElementById('tp-review-fields').style.display = composerKind === 'review' ? 'block' : 'none';
  document.getElementById('tp-tags-label').textContent = meta.tagLabel;
  document.getElementById('tp-body-label').textContent = meta.bodyLabel;

  const courseInput = document.getElementById('tp-course');
  courseInput.value = post?.course || '';
  courseInput.placeholder = composerKind === 'requirement' ? 'Which course? (required)' : 'Course (optional)';
  const courses = [...new Set(teacherPosts.map(p => (p.course || '').trim()).filter(Boolean))];
  document.getElementById('tp-course-list').innerHTML = courses.map(c => `<option value="${escapeAttr(c)}"></option>`).join('');

  const body = document.getElementById('tp-body');
  body.value = post?.body || '';
  body.placeholder = meta.placeholder;
  document.getElementById('tp-anon').checked = post ? post.author_name === ANON_AUTHOR : !!appSettings.anonymous;
  document.getElementById('tp-submit-btn').textContent = editingPostId ? 'Save changes' : 'Post';

  renderTpScale('tp-rating', 'rating', RATING_WORDS);
  renderTpScale('tp-difficulty', 'difficulty', DIFFICULTY_WORDS);
  syncTpAgain();
  renderTpTags();
  updateTpCounter();
  document.getElementById('teacherPostModal').style.display = 'flex';
}

function closeTeacherPostModal() { document.getElementById('teacherPostModal').style.display = 'none'; }

function renderTpScale(containerId, field, words) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const val = tpDraft[field];
  el.innerHTML = [1, 2, 3, 4, 5].map(n =>
    `<button type="button" class="tp-scale-btn ${n <= val ? 'on' : ''} ${n === val ? 'picked' : ''}"
       onclick="setTpScale('${containerId}', '${field}', ${n})">${n}</button>`).join('') +
    `<span class="tp-scale-word">${val ? words[val] : 'Tap to rate'}</span>`;
}
function setTpScale(containerId, field, n) {
  tpDraft[field] = n;
  renderTpScale(containerId, field, field === 'rating' ? RATING_WORDS : DIFFICULTY_WORDS);
}
function setTpAgain(val) {
  tpDraft.again = tpDraft.again === val ? null : val;  // tap again to clear
  syncTpAgain();
}
function syncTpAgain() {
  document.querySelectorAll('#tp-again .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.val === tpDraft.again));
}

function renderTpTags() {
  const meta = POST_KIND_META[composerKind];
  document.getElementById('tp-tags').innerHTML = meta.tags.map(tag =>
    `<button type="button" class="tp-tag ${tpDraft.tags.includes(tag) ? 'on' : ''}" onclick="toggleTpTag('${escapeAttr(tag)}')">${escapeHtml(tag)}</button>`
  ).join('');
}
function toggleTpTag(tag) {
  const meta = POST_KIND_META[composerKind];
  if (tpDraft.tags.includes(tag)) tpDraft.tags = tpDraft.tags.filter(t => t !== tag);
  else if (tpDraft.tags.length >= meta.maxTags) return showToast(`Pick up to ${meta.maxTags}.`, 'info', 2000);
  else tpDraft.tags.push(tag);
  renderTpTags();
}

function updateTpCounter() {
  const len = document.getElementById('tp-body')?.value.length || 0;
  const el = document.getElementById('tp-counter');
  if (el) { el.textContent = `${len}/2000`; el.classList.toggle('over-limit', len >= 2000); }
}

async function submitTeacherPost(event) {
  event.preventDefault();
  if (!canPostOnTeacher()) return;
  const kind = composerKind;
  const body = document.getElementById('tp-body').value.trim();
  const course = document.getElementById('tp-course').value.replace(/\s+/g, ' ').trim() || null;

  if (kind === 'review' && !tpDraft.rating) return showToast('Pick an overall rating.', 'warn');
  if (kind === 'requirement' && !course) return showToast('Which course are these requirements for?', 'warn');
  if (!body) return showToast('Write something first.', 'warn');

  const anon = document.getElementById('tp-anon').checked;
  const row = {
    kind, course, body,
    tags: tpDraft.tags.slice(0, 8),
    author_name: anon ? ANON_AUTHOR : sanitizeName(currentHandle || currentUser.split('@')[0])
  };
  if (kind === 'review') {
    row.rating = tpDraft.rating;
    row.difficulty = tpDraft.difficulty || null;
    row.would_take_again = tpDraft.again == null ? null : tpDraft.again === 'yes';
  }

  const btn = document.getElementById('tp-submit-btn');
  btn.disabled = true;
  const { error } = editingPostId
    ? await supabaseClient.from('teacher_posts').update({ ...row, updated_at: new Date().toISOString() }).eq('id', editingPostId)
    : await supabaseClient.from('teacher_posts').insert([{ ...row, teacher_id: currentTeacher.id, author_id: currentUserId }]);
  btn.disabled = false;

  if (error) {
    if (error.code === '23505') return showToast('You already reviewed this teacher — edit that review instead.', 'warn', 4500);
    return showToast('Could not post: ' + error.message, 'error');
  }
  showToast(editingPostId ? 'Saved.' : 'Posted — thanks for helping other students!', 'success');
  closeTeacherPostModal();
  teacherTab = kind;
  fetchMyReviewCount();
  loadTeacherPage(currentTeacher.id);
}

// ---------- Home stat + realtime ----------

async function fetchMyReviewCount() {
  if (!currentUserId || !isSupabaseConnected) { myReviewCount = 0; return updateAnalytics(); }
  const { count } = await supabaseClient
    .from('teacher_posts').select('id', { count: 'exact', head: true })
    .eq('author_id', currentUserId).eq('kind', 'review');
  myReviewCount = count || 0;
  updateAnalytics();
}

function updateAnalytics() {
  const el = document.getElementById('total-reviews-count');
  if (el) el.textContent = myReviewCount;
}

// Debounced so a burst of votes/posts doesn't trigger a burst of refetches.
function onTeacherDataChanged() {
  clearTimeout(teacherRefreshTimer);
  teacherRefreshTimer = setTimeout(() => {
    if (isViewActive('teacher-view') && currentTeacher) loadTeacherPage(currentTeacher.id);
    if (isViewActive('search-view')) fetchTeacherDirectory();
  }, 400);
}

function openModal(title, text) {
  document.getElementById('detailModal').dataset.kind = '';
  document.getElementById('modalTitle').textContent = title;
  if (typeof text === 'string' && text.trim().startsWith('<')) {
    document.getElementById('modalBody').innerHTML = text;
  } else {
    document.getElementById('modalBody').textContent = text;
  }
  document.getElementById('detailModal').style.display = 'flex';
}

function closeModal(event) {
  if (event.target.id === 'detailModal') document.getElementById('detailModal').style.display = 'none';
}

function closeModalForce() {
  document.getElementById('detailModal').style.display = 'none';
}
