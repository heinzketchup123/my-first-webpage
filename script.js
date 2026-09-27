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

// Storage Keys
const THEME_PRESETS = {
  cyber: { main: '#00f3ff', light: '#0088cc', card: 'rgba(0, 243, 255, 0.06)', nav: 'rgba(10, 20, 30, 0.95)', bg: '#080d14', textOnAccent: '#000000' },
  synthwave: { main: '#ff007f', light: '#cc0066', card: 'rgba(255, 0, 127, 0.08)', nav: 'rgba(25, 10, 30, 0.95)', bg: '#120518', textOnAccent: '#ffffff' },
  matrix: { main: '#00ff66', light: '#00993d', card: 'rgba(0, 255, 102, 0.06)', nav: 'rgba(5, 20, 10, 0.95)', bg: '#040d06', textOnAccent: '#000000' },
  dracula: { main: '#bd93f9', light: '#7243c2', card: 'rgba(189, 147, 249, 0.08)', nav: 'rgba(24, 20, 37, 0.95)', bg: '#181425', textOnAccent: '#ffffff' },
  nordic: { main: '#0088cc', light: '#5e81ac', card: 'rgba(136, 192, 208, 0.08)', nav: 'rgba(20, 28, 38, 0.95)', bg: '#0f141c', textOnAccent: '#ffffff' },
  orange: { main: '#ff7b00', light: '#d95300', card: 'rgba(255, 123, 0, 0.08)', nav: 'rgba(26, 20, 15, 0.95)', bg: '#140e0a', textOnAccent: '#ffffff' },
  crimson: { main: '#ff4757', light: '#d63031', card: 'rgba(255, 71, 87, 0.08)', nav: 'rgba(30, 12, 15, 0.95)', bg: '#14080a', textOnAccent: '#ffffff' },
  gold: { main: '#d9822b', light: '#b36200', card: 'rgba(255, 177, 66, 0.08)', nav: 'rgba(30, 24, 12, 0.95)', bg: '#141008', textOnAccent: '#ffffff' },
  emerald: { main: '#10ac84', light: '#0f9b74', card: 'rgba(46, 213, 115, 0.08)', nav: 'rgba(12, 30, 20, 0.95)', bg: '#08140c', textOnAccent: '#ffffff' },
  monochrome: { main: '#222222', light: '#444444', card: 'rgba(255, 255, 255, 0.08)', nav: 'rgba(20, 20, 20, 0.95)', bg: '#0a0a0a', textOnAccent: '#ffffff' }
};

const defaultSettings = { lightMode: false, anonymous: true, autoSystemTheme: false };
const defaultAppearance = { themeName: 'cyber', mode: 'dark', fontSize: 1, density: 'normal', customColors: null };

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
let chatMessages = [];         // (legacy — no longer rendered directly)
let dmMessages = [];           // messages for the currently-selected friend thread
let selectedFriendId = null;
let friends = [];              // [{friend_id, handle, display_name}]
let pendingIncoming = [];      // [{id, requester_id, handle, display_name}]
let pendingOutgoing = [];      // [{id, addressee_id, handle, display_name}]
let profileMap = {};           // user_id -> {handle, display_name}
let appSettings = { ...defaultSettings };
let appTheme = { ...THEME_PRESETS.cyber };

let currentPostCommentId = null;
let realtimeChannel = null;
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

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
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
function initSupabaseRealtime() {
  if (realtimeChannel) return;

  realtimeChannel = supabaseClient
    .channel('public-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campus_chat' }, () => {
      if (selectedFriendId) fetchDMs(selectedFriendId);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => fetchFriendships())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campus_feed' }, () => fetchFeed())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'study_groups' }, () => fetchGroups())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'study_group_members' }, () => fetchGroups())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, () => onTeacherDataChanged())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_posts' }, () => onTeacherDataChanged())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_post_votes' }, () => onTeacherDataChanged())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campus_events' }, () => onEventsChanged())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'event_rsvps' }, () => onEventsChanged())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'school_join_requests' }, p => onJoinRequestChanged(p))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schools' }, () => onSchoolsChanged())
    .subscribe();
}

async function loadAllSupabaseData() {
  await Promise.all([fetchFeed(), fetchGroups(), fetchFriendships(), fetchTeacherDirectory(),
                     fetchMyReviewCount(), fetchEvents()]);
  const savedGpa = localStorage.getItem(`gpa_${currentUserId}`);
  gpaCourses = savedGpa ? JSON.parse(savedGpa) : [];
  renderGpaRows();
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

  // Build member counts and my-membership set from the join table so the
  // "members" and "joined" fields on the card are true per-user facts.
  const counts = {};
  const mine   = new Set();
  (memRes?.data || []).forEach(m => {
    counts[m.group_id] = (counts[m.group_id] || 0) + 1;
    if (m.user_id === currentUserId) mine.add(m.group_id);
  });

  studyGroups = (data || []).map(g => ({
    ...g,
    members: counts[g.id] || 0,
    joined:  mine.has(g.id)
  })).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  renderGroups();
}

// -------------------- Study group creation --------------------

function openCreateGroupModal() {
  if (!currentUserId) return showToast('Sign in to create a study group.', 'warn');
  if (!currentSchoolId) return openSchoolPicker(true);
  document.getElementById('groupModal').style.display = 'flex';
}
function closeCreateGroupModal() {
  document.getElementById('groupModal').style.display = 'none';
}

async function createGroup(event) {
  event.preventDefault();
  if (!currentUserId || !currentSchoolId) return;

  const name     = document.getElementById('group-name').value.trim();
  const course   = document.getElementById('group-course').value.trim();
  const schedule = document.getElementById('group-schedule').value.trim();
  const location = document.getElementById('group-location').value.trim();
  const max      = Math.max(2, Math.min(30, parseInt(document.getElementById('group-max').value, 10) || 6));
  const topics   = document.getElementById('group-topics').value.split(',').map(s => s.trim()).filter(Boolean);
  if (!name || !course) return showToast('Give the group a name and a course.', 'warn');

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
  selectedFriendId = null; dmMessages = [];
  teacherDir = []; currentTeacher = null; teacherPosts = []; myReviewCount = 0;
  calEvents = []; calRsvps = {}; isAdmin = false;
  adminJoinRequests = []; adminJoinCodes = {}; myJoinRequests = {};
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

  // 2) Theme palette (custom colors override the preset if present)
  const preset = THEME_PRESETS[appAppearance.themeName] || THEME_PRESETS.cyber;
  const config = appAppearance.customColors ? { ...preset, ...appAppearance.customColors } : preset;
  applyPresetConfig(config);

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

  renderThemeSwatchGrid();
  syncCustomColorPickers();
}

function applyPresetConfig(config) {
  const root = document.documentElement;
  root.style.setProperty('--accent-color', config.main);
  root.style.setProperty('--accent-light', config.light);
  root.style.setProperty('--text-on-accent', config.textOnAccent || '#ffffff');

  if (!appSettings.lightMode) {
    root.style.setProperty('--card-bg', config.card);
    root.style.setProperty('--nav-bg', config.nav);
    root.style.setProperty('--bg-color', config.bg);
  } else {
    // In light mode, only the accent should follow the theme — clear
    // any prior dark-mode overrides so the light palette shows through.
    root.style.removeProperty('--card-bg');
    root.style.removeProperty('--nav-bg');
    root.style.removeProperty('--bg-color');
  }
  appTheme = { ...config };
}

function renderThemeSwatchGrid() {
  const grid = document.getElementById('theme-swatch-grid');
  if (!grid) return;
  grid.innerHTML = THEME_META.map(t => {
    const p = THEME_PRESETS[t.key];
    const active = t.key === appAppearance.themeName && !appAppearance.customColors;
    return `
      <button class="theme-swatch ${active ? 'active' : ''}" onclick="applyTheme('${t.key}')" aria-label="${t.label} theme">
        <span class="swatch-preview" style="background:${p.bg};">
          <span class="swatch-dot" style="background:${p.main}; box-shadow:0 0 8px ${p.main};"></span>
          <span class="swatch-dot" style="background:${p.light};"></span>
        </span>
        <span class="swatch-label">${t.label}</span>
        ${active ? '<i class="fa-solid fa-check swatch-check"></i>' : ''}
      </button>
    `;
  }).join('');
}

function syncCustomColorPickers() {
  const preset = THEME_PRESETS[appAppearance.themeName] || THEME_PRESETS.cyber;
  const src = appAppearance.customColors || preset;
  const set = (id, val) => { const el = document.getElementById(id); if (el && /^#[0-9a-fA-F]{6}$/.test(val)) el.value = val; };
  set('picker-main', src.main);
  set('picker-light', src.light);
  // card/nav are rgba by default; show a reasonable hex fallback
  set('picker-card', hexish(src.card, '#001a24'));
  set('picker-nav',  hexish(src.nav,  '#081018'));
}

function hexish(val, fallback) {
  return typeof val === 'string' && /^#[0-9a-fA-F]{6}$/.test(val) ? val : fallback;
}

function applyTheme(name) {
  appAppearance.themeName = name;
  appAppearance.customColors = null;
  saveAppearance();
  applyAppearance();
}

function updateTheme() {
  const main = document.getElementById('picker-main').value;
  const light = document.getElementById('picker-light').value;
  const card = document.getElementById('picker-card').value;
  const nav = document.getElementById('picker-nav').value;
  appAppearance.customColors = { main, light, card, nav, bg: appTheme.bg, textOnAccent: '#ffffff' };
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

  if (viewId === 'chat-view')   { renderFriendsStrip(); renderDMThread(); }
  if (viewId === 'search-view') { fetchTeacherDirectory(); }
  if (viewId === 'events-view') { fetchEvents(); }
  if (viewId === 'settings-view') { renderAdminPanel(); }
}

function toggleNotifications() {
  document.getElementById('notif-drawer').classList.toggle('open');
  renderNotifications();
  unreadNotifs = 0;
  updateNotifBadge();
}

function renderNotifications() {
  const body = document.getElementById('notif-body');
  if (!body) return;
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
      <div class="notif-item" style="cursor:pointer;" onclick="toggleNotifications(); switchTab('settings-view'); document.getElementById('admin-card')?.scrollIntoView({ block: 'start' });">
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
  unreadNotifs = pendingIncoming.length + (isAdmin ? adminJoinRequests.length : 0);
  updateNotifBadge();
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
const CHAT_RATE_MAX = 5;             // messages
const CHAT_RATE_WINDOW_MS = 30_000;  // per 30s window
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
  if (currentSchoolId) {
    currentSchool = schoolsCache.find(s => s.id === currentSchoolId) || null;
  }
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
  strip.innerHTML = list.map(f => `
    <button class="friend-chip ${f.friend_id === selectedFriendId ? 'active' : ''}" onclick="selectFriend('${escapeAttr(f.friend_id)}')">
      <span class="friend-avatar">${escapeHtml((f.display_name || f.handle || '?')[0].toUpperCase())}</span>
      <span class="friend-name">${escapeHtml(f.display_name || f.handle)}</span>
    </button>
  `).join('');
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
  selectedFriendId = friendId;
  renderFriendsStrip();
  await fetchDMs(friendId);
}

async function fetchDMs(friendId) {
  if (!friendId || !currentUserId || !isSupabaseConnected) {
    dmMessages = []; renderDMThread(); return;
  }
  const { data, error } = await supabaseClient
    .from('campus_chat')
    .select('*')
    .or(
      `and(sender_id.eq.${currentUserId},recipient_id.eq.${friendId}),`+
      `and(sender_id.eq.${friendId},recipient_id.eq.${currentUserId})`
    )
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) showToast('Could not load messages: ' + error.message, 'error');
  dmMessages = data || [];
  renderDMThread();
}

function renderDMThread() {
  const box = document.getElementById('app-chat-messages');
  if (!box) return;

  if (!selectedFriendId) {
    box.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-comments"></i>
        <p>Pick a friend above to start chatting.</p>
        ${currentUserId ? '' : '<p style="font-size:0.75rem; margin-top:6px;">Guest mode uses demo friends — sign in to message real ones.</p>'}
      </div>`;
    updateChatCounter();
    return;
  }

  const meId = currentUserId || 'guest';
  box.innerHTML = '';
  dmMessages.forEach(msg => {
    const isMine = msg.sender_id === meId;
    const safeText = renderSafeMessage(String(msg.text || '').slice(0, CHAT_MAX_LEN));
    const safeTime = escapeHtml(String(msg.time || (msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '')));
    const el = document.createElement('div');
    el.className = `chat-bubble ${isMine ? 'chat-bubble-mine' : 'chat-bubble-other'}`;
    el.innerHTML = `<div class="chat-text">${safeText}</div><span class="chat-time">${safeTime}</span>`;
    box.appendChild(el);
  });
  box.scrollTop = box.scrollHeight;
  updateChatOnlineCount();
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

  const msgObj = {
    sender_id: currentUserId,
    recipient_id: selectedFriendId,
    user: sanitizeName(currentHandle || currentUser.split('@')[0]),
    text, time: timeStr
  };
  chatSendTimestamps.push(now);
  input.value = ''; updateChatCounter();
  const { error } = await supabaseClient.from('campus_chat').insert([msgObj]);
  if (error) return showToast('Message blocked — make sure you two are friends.', 'error', 4500);
}

// Back-compat shim: older code paths / a stale HTML cache may still call
// sendAppChatMessage(event) — route it to the new DM sender.
async function sendAppChatMessage(event) { return sendDM(event); }
function renderChat() { renderDMThread(); }

// Feed Engine
const REACTION_EMOJIS = ['👍','❤️','😂','🎉','🔥'];

function sortedFeed() {
  const list = [...campusFeed];
  if (feedSort === 'top') {
    list.sort((a,b) => (b.likes||0) - (a.likes||0));
  } else if (feedSort === 'comments') {
    list.sort((a,b) => ((b.comments||[]).length) - ((a.comments||[]).length));
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
function showToast(message, kind = 'info', durationMs = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) { /* fallback for very early errors */ alert(message); return; }
  const t = document.createElement('div');
  t.className = `toast toast-${kind}`;
  const icons = { info: 'circle-info', success: 'circle-check', warn: 'triangle-exclamation', error: 'circle-xmark' };
  t.innerHTML = `<i class="fa-solid fa-${icons[kind] || icons.info}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(t);
  // trigger enter animation
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 250);
  }, durationMs);
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
    const commentCount = post.comments ? post.comments.length : 0;
    const reactions = post.reactions || {};
    const reactionRow = REACTION_EMOJIS.map(em => `
      <button class="reaction-chip ${reactions[em] ? 'has-count' : ''}" onclick="reactToPost('${post.id}','${em}')">
        ${em} <span>${reactions[em] || ''}</span>
      </button>
    `).join('');

    const el = document.createElement('div');
    el.className = 'info-card';
    el.innerHTML = `
      <div class="post-meta">
        <span class="post-author">${escapeHtml(post.author)}</span>
        <span class="post-meta-right">
          ${escapeHtml(post.created_at ? timeAgo(post.created_at) : (post.time || ''))}
          ${isAdmin || (post.author_id && post.author_id === currentUserId)
            ? `<button class="post-delete-btn" onclick="deleteFeedPost('${escapeAttr(post.id)}')" aria-label="Delete post"><i class="fa-solid fa-trash"></i></button>`
            : ''}
        </span>
      </div>
      <div class="post-title">${escapeHtml(post.title)}</div>
      <p class="post-body">${escapeHtml(post.text)}</p>
      <div class="reaction-row">${reactionRow}</div>
      <div class="post-actions">
        <span class="post-action-btn ${post.liked ? 'liked' : ''}" onclick="toggleLikePost('${post.id}')">
          <i class="fa-solid fa-heart"></i> ${post.likes || 0}
        </span>
        <span class="post-action-btn" onclick="openCommentsModal('${post.id}')">
          <i class="fa-solid fa-comment"></i> ${commentCount} Comments
        </span>
      </div>
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

function updateChatOnlineCount() {
  const el = document.getElementById('chat-online-num');
  if (!el) return;
  // Approximate "active now" as unique authors who sent a message in the
  // last 15 minutes. Real presence would need Supabase Realtime presence
  // channels; this is a light-weight proxy that updates for free with chat.
  const cutoff = Date.now() - 15 * 60 * 1000;
  const seen = new Set();
  (chatMessages || []).forEach(m => {
    const t = m.created_at ? Date.parse(m.created_at) : NaN;
    if (!isNaN(t) && t >= cutoff) seen.add(m.user);
  });
  // Always count "you" as active once logged in.
  if (currentUser) seen.add('__self__');
  el.textContent = String(Math.max(1, seen.size));
}

async function toggleLikePost(id) {
  const post = campusFeed.find(p => p.id === id);
  if (!post) return;

  post.liked = !post.liked;
  const newLikes = Math.max(0, (post.likes || 0) + (post.liked ? 1 : -1));
  post.likes = newLikes;

  if (isSupabaseConnected && currentUserId) {
    await supabaseClient.from('campus_feed').update({ likes: newLikes }).eq('id', id);
  }
  renderFeed();
}

async function reactToPost(id, emoji) {
  const post = campusFeed.find(p => p.id === id);
  if (!post) return;
  post.reactions = post.reactions || {};
  post.reactions[emoji] = (post.reactions[emoji] || 0) + 1;

  if (isSupabaseConnected && currentUserId) {
    await supabaseClient.from('campus_feed').update({ reactions: post.reactions }).eq('id', id);
  }
  renderFeed();
}

function openCommentsModal(postId) {
  currentPostCommentId = postId;
  const post = campusFeed.find(p => p.id === postId);
  if (!post) return;

  const modal = document.getElementById('detailModal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');

  title.textContent = `Discussion: ${post.title}`;
  
  const commentsList = (post.comments || []).map(c => `
    <div style="background:var(--input-bg); padding:10px; border-radius:10px; margin-bottom:8px; border:1px solid var(--card-border);">
      <div style="font-weight:700; color:var(--accent-color); font-size:0.75rem;">${escapeHtml(c.author || 'Anonymous')}</div>
      <div style="font-size:0.82rem; color:var(--main-text-color); margin-top:2px;">${renderSafeMessage(String(c.text || '').slice(0, 500))}</div>
    </div>
  `).join('') || '<p style="color:var(--sub-text-color); font-size:0.8rem;">No comments yet. Start the conversation!</p>';

  body.innerHTML = `
    <div style="max-height:180px; overflow-y:auto; text-align:left; margin-bottom:12px;">
      ${commentsList}
    </div>
    <div style="display:flex; gap:6px;">
      <input type="text" id="new-comment-input" class="auth-input" placeholder="Write a comment..." style="padding:8px 10px; font-size:0.8rem;" />
      <button class="primary-btn" style="padding:8px 14px; font-size:0.8rem;" onclick="addCommentToPost()">Send</button>
    </div>
  `;

  modal.style.display = 'flex';
}

async function addCommentToPost() {
  const input = document.getElementById('new-comment-input');
  if (!input || !input.value.trim() || !currentPostCommentId) return;

  const post = campusFeed.find(p => p.id === currentPostCommentId);
  if (post) {
    const updatedComments = post.comments || [];
    updatedComments.push({
      author: appSettings.anonymous ? "Anonymous Student" : (currentUser ? currentUser.split('@')[0] : "Student"),
      text: input.value.trim()
    });
    post.comments = updatedComments;

    if (isSupabaseConnected && currentUserId) {
      const { error } = await supabaseClient.from('campus_feed').update({ comments: updatedComments }).eq('id', currentPostCommentId);
      if (error) showToast('Comment failed: ' + error.message, 'error');
    }
    renderFeed();
    openCommentsModal(currentPostCommentId);
  }
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
function renderGroups(filter = 'all') {
  const container = document.getElementById('groups-list');
  if (!container) return;
  container.innerHTML = '';

  const list = studyGroups.filter(g => {
    if (filter === 'open') return g.members < g.max;
    if (filter === 'mine') return g.joined;
    return true;
  });

  if (!list.length) {
    container.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-user-group"></i>
      <p>${filter === 'mine' ? "You haven't joined any groups yet." : filter === 'open' ? 'No groups with open seats right now.' : 'No study groups yet for your school.'}</p>
    </div>`;
    return;
  }

  list.forEach(group => {
    const card = document.createElement('div');
    card.className = 'info-card';
    const gid = escapeAttr(group.id);
    const canDelete = isAdmin || (group.creator_id && group.creator_id === currentUserId);
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-weight:800; color:var(--accent-color);">${escapeHtml(group.course || '')}</span>
        <span style="font-size:0.75rem; color:var(--sub-text-color);">${group.members}/${group.max} Members</span>
      </div>
      <div style="font-weight:700; margin-bottom:6px; cursor:pointer;" onclick="openGroupDetailModal('${gid}')">${escapeHtml(group.name || '')}</div>
      <div style="font-size:0.75rem; color:var(--sub-text-color); margin-bottom:10px;">
        <i class="fa-solid fa-location-dot"></i> ${escapeHtml(group.location || 'Campus Center')} • <i class="fa-solid fa-clock"></i> ${escapeHtml(group.schedule || 'TBD')}
      </div>
      <div style="display:flex; gap:8px;">
        <button class="secondary-btn" style="flex:1; padding:8px; font-size:0.8rem;" onclick="openGroupDetailModal('${gid}')">Details</button>
        <button class="${group.joined ? 'secondary-btn active-state' : 'primary-btn'}" style="flex:1; padding:8px; font-size:0.8rem;" onclick="toggleGroupJoin('${gid}')">
          ${group.joined ? 'Leave' : 'Join'}
        </button>
        ${canDelete ? `<button class="secondary-btn danger-text" style="padding:8px 12px;" onclick="deleteGroup('${gid}')" aria-label="Delete group"><i class="fa-solid fa-trash"></i></button>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

function openGroupDetailModal(groupId) {
  const group = studyGroups.find(g => g.id === groupId);
  if (!group) return;

  const topicsList = (group.topics || []).map(t => `<li style="font-size:0.8rem; color:var(--main-text-color);">${escapeHtml(t)}</li>`).join('') || '<li>General study</li>';
  const rosterList = (group.roster || []).map(r => `<span style="font-size:0.72rem; background:var(--card-bg); border:1px solid var(--card-border); padding:2px 8px; border-radius:10px;">${escapeHtml(r)}</span>`).join(' ');

  openModal(
    group.name,
    `
      <div style="text-align:left;">
        <p style="font-size:0.82rem; margin-bottom:8px;"><strong>Course:</strong> ${escapeHtml(group.course || '')}</p>
        <p style="font-size:0.82rem; margin-bottom:8px;"><strong>Host:</strong> ${escapeHtml(group.host || 'Student Organizer')}</p>
        <p style="font-size:0.82rem; margin-bottom:8px;"><strong>Location:</strong> ${escapeHtml(group.location || 'Library')}</p>
        <p style="font-size:0.82rem; margin-bottom:10px;"><strong>Meeting Time:</strong> ${escapeHtml(group.schedule || 'Weekly')}</p>
        <div style="font-weight:700; font-size:0.8rem; color:var(--accent-color); margin-bottom:4px;">Key Topics:</div>
        <ul style="padding-left:18px; margin-bottom:12px;">${topicsList}</ul>
        <div style="font-weight:700; font-size:0.8rem; color:var(--accent-color); margin-bottom:6px;">Active Members (${group.members}/${group.max}):</div>
        <div style="display:flex; flex-wrap:wrap; gap:4px;">${rosterList}</div>
      </div>
    `
  );
}

function filterGroups(type, btn) {
  document.querySelectorAll('#groups-view .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderGroups(type);
}

async function toggleGroupJoin(id) {
  if (!currentUserId) return showToast('Sign in to join a group.', 'warn');
  const group = studyGroups.find(g => g.id === id);
  if (!group) return;
  if (!group.joined && group.members >= group.max) return showToast('Group is full.', 'warn');

  if (group.joined) {
    const { error } = await supabaseClient
      .from('study_group_members').delete()
      .eq('group_id', id).eq('user_id', currentUserId);
    if (error) return showToast('Could not leave: ' + error.message, 'error');
  } else {
    const { error } = await supabaseClient
      .from('study_group_members').insert([{ group_id: id, user_id: currentUserId }]);
    if (error) return showToast('Could not join: ' + error.message, 'error');
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
  if (isAdmin) await fetchAdminJoinData();
  else { adminJoinCodes = {}; adminJoinRequests = []; renderAdminPanel(); }
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

function renderAdminPanel() {
  const card = document.getElementById('admin-card');
  if (!card) return;
  card.style.display = isAdmin ? 'block' : 'none';
  if (!isAdmin) return;

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
  campusFeed = campusFeed.filter(p => p.id !== id);
  renderFeed();
  showToast('Post deleted.', 'success');
}

async function deleteGroup(id) {
  const g = studyGroups.find(x => x.id === id);
  if (!g || !confirm(`Delete the group "${g.name}"?`)) return;
  const { data, error } = await supabaseClient.from('study_groups').delete().eq('id', id).select('id');
  if (error || !data?.length) return showToast('Could not delete: ' + (error?.message || 'not allowed'), 'error');
  showToast('Group deleted.', 'success');
  fetchGroups();
}

// GPA Calculator
function renderGpaRows() {
  const container = document.getElementById('gpa-rows-container');
  if (!container) return;
  container.innerHTML = '';

  if (!gpaCourses.length) {
    container.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-calculator"></i>
      <p>No courses added yet. Add your first course to start tracking.</p>
      <button class="primary-btn" onclick="addGpaRow()">+ Add Course</button>
    </div>`;
    calculateGPA();
    return;
  }

  gpaCourses.forEach((c, idx) => {
    const row = document.createElement('div');
    row.className = 'gpa-row';
    row.innerHTML = `
      <input type="text" class="auth-input" value="${c.name}" placeholder="Course" onchange="updateGpaData(${idx}, 'name', this.value)" />
      <select class="mini-select" onchange="updateGpaData(${idx}, 'grade', this.value)">
        ${['A','A-','B+','B','B-','C+','C','F'].map(g => `<option value="${g}" ${c.grade===g?'selected':''}>${g}</option>`).join('')}
      </select>
      <input type="number" class="auth-input credit-input" value="${c.credits}" min="1" max="6" onchange="updateGpaData(${idx}, 'credits', parseInt(this.value)||0)" />
      <i class="fa-solid fa-trash" style="color:#ff3b30; cursor:pointer;" onclick="deleteGpaRow(${idx})"></i>
    `;
    container.appendChild(row);
  });

  calculateGPA();
}

function addGpaRow() {
  gpaCourses.push({ name: "New Course", grade: "A", credits: 3 });
  saveGpaLocal();
  renderGpaRows();
}

function updateGpaData(idx, key, val) {
  gpaCourses[idx][key] = val;
  saveGpaLocal();
  calculateGPA();
}

function deleteGpaRow(idx) {
  gpaCourses.splice(idx, 1);
  saveGpaLocal();
  renderGpaRows();
}

function saveGpaLocal() {
  if (currentUserId) localStorage.setItem(`gpa_${currentUserId}`, JSON.stringify(gpaCourses));
}

function calculateGPA() {
  const points = { 'A':4.0, 'A-':3.7, 'B+':3.3, 'B':3.0, 'B-':2.7, 'C+':2.3, 'C':2.0, 'F':0.0 };
  let totalPts = 0, totalCredits = 0;

  gpaCourses.forEach(c => {
    const pts = points[c.grade] || 0;
    totalPts += pts * c.credits;
    totalCredits += c.credits;
  });

  const gpa = totalCredits > 0 ? (totalPts / totalCredits).toFixed(2) : "0.00";
  document.getElementById('calculated-gpa').textContent = gpa;
  document.getElementById('gpa-summary-val').textContent = gpa;
  document.getElementById('total-credits-val').textContent = totalCredits;
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