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

// Campus-wide events are curated content, kept as a small static seed so
// the Events tab is not empty on first launch. Everything else (feed,
// study groups, reviews, GPA) starts empty and is authored by real users.
const defaultEvents = [
  { id: "1", title: "Career Fair 2026", date: "Sept 28, 10:00 AM", location: "Student Union", rsvp: false, attendeesCount: 142, description: "Connect with over 40 hiring partners, tech startups, and research institutes." },
  { id: "2", title: "CS Hackathon Warmup", date: "Oct 2, 4:00 PM", location: "Tech Lab 3", rsvp: true, attendeesCount: 38, description: "Practice rapid prototyping and meet team partners." }
];

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
let reviewSchoolFilterId = 'mine'; // 'mine' | '<school_id>' — for reviews lookup
let userReviews = [];
let campusFeed = [];
let studyGroups = [];
let gpaCourses = [];
let campusEvents = [];
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
let timerSeconds = 1500;
let timerInterval = null;
let realtimeChannel = null;
let feedSort = 'new'; // 'new' | 'top' | 'comments'
let unreadNotifs = 0;
let appAppearance = { ...defaultAppearance };

document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  loadAppearance();
  applyAppearance();
  initSystemThemeListener();
  // The Events tab is curated campus-life content; not user-generated.
  campusEvents = [...defaultEvents];
  renderEvents();
  renderEmptyStates();

  if (!isSupabaseConnected) {
    // Supabase misconfigured — surface it instead of silently degrading.
    showToast('Supabase not configured — sign-in disabled.', 'error', 6000);
    document.getElementById('auth-screen').style.display = 'flex';
    return;
  }

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
      campusFeed = []; studyGroups = []; userReviews = [];
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
  renderReviews();
  renderGpaRows();
  renderFriendsStrip();
  renderDMThread();
  renderFriendsBadge();
  updateAnalytics();
  updateNotifBadge();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration skipped:', err));
  }
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'instructor_reviews' }, () => fetchReviews())
    .subscribe();
}

async function loadAllSupabaseData() {
  await Promise.all([fetchFeed(), fetchGroups(), fetchReviews(), fetchFriendships()]);
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
    supabaseClient.from('study_groups').select('*').order('created_at', { ascending: false }),
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
  }));
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

async function fetchReviews() {
  let q = supabaseClient.from('instructor_reviews').select('*').order('created_at', { ascending: false });
  const wantSchool = reviewSchoolFilterId === 'mine' ? currentSchoolId : reviewSchoolFilterId;
  if (wantSchool) q = q.eq('school_id', wantSchool);
  const { data, error } = await q;
  if (error) { showToast('Reviews load failed: ' + error.message, 'error'); return; }
  userReviews = data || [];
  renderReviews();
  updateAnalytics();
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
  campusFeed = []; studyGroups = []; userReviews = []; gpaCourses = [];
  selectedFriendId = null; dmMessages = [];
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

  // 3) Font size scale (0/1/2 → small/medium/large)
  document.body.classList.remove('fs-small','fs-medium','fs-large');
  document.body.classList.add(['fs-small','fs-medium','fs-large'][Number(appAppearance.fontSize) || 1]);
  const fsLabel = document.getElementById('font-size-label');
  if (fsLabel) fsLabel.textContent = FONT_SIZE_LABELS[Number(appAppearance.fontSize) || 1];
  const fsSlider = document.getElementById('font-size-slider');
  if (fsSlider) fsSlider.value = String(appAppearance.fontSize);

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
  if (element) {
    element.classList.add('active');
  } else {
    const viewOrder = ['home-view', 'search-view', 'groups-view', 'chat-view', 'profile-view', 'settings-view'];
    const btns = document.querySelectorAll('.nav-btn');
    const idx = viewOrder.indexOf(viewId);
    if (idx !== -1 && btns[idx]) btns[idx].classList.add('active');
  }

  if (viewId === 'chat-view')   { renderFriendsStrip(); renderDMThread(); }
  if (viewId === 'search-view') { fetchTeachersForView(); }
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
  body.innerHTML = items.length ? items.join('') : `
    <div class="notif-empty">
      <i class="fa-solid fa-bell-slash"></i>
      <p>You're all caught up.</p>
    </div>`;
}
function updateNotifBadgeFromState() { unreadNotifs = pendingIncoming.length; updateNotifBadge(); }

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
  // If signed in without a school, open the picker before doing anything else.
  if (currentUserId && !currentSchoolId) openSchoolPicker(true);
}

async function refreshSchoolsCache() {
  if (!isSupabaseConnected) return;
  const { data } = await supabaseClient.from('schools').select('id, name, slug').order('name');
  schoolsCache = data || [];
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

function openSchoolPicker(required) {
  const modal = document.getElementById('schoolModal');
  if (!modal) return;
  modal.dataset.required = required ? '1' : '0';
  document.getElementById('school-picker-cancel').style.display = required ? 'none' : 'inline-flex';
  renderSchoolPicker();
  modal.style.display = 'flex';
}
function closeSchoolPicker() {
  const modal = document.getElementById('schoolModal');
  if (!modal || modal.dataset.required === '1') return; // must pick
  modal.style.display = 'none';
}

function renderSchoolPicker() {
  const filterEl = document.getElementById('school-picker-search');
  const list = document.getElementById('school-picker-list');
  if (!list) return;
  const q = (filterEl?.value || '').toLowerCase();
  const rows = schoolsCache.filter(s => !q || s.name.toLowerCase().includes(q) || s.slug.includes(q));
  list.innerHTML = rows.length
    ? rows.map(s => `
        <button class="school-row ${s.id === currentSchoolId ? 'active' : ''}" onclick="pickSchool('${escapeAttr(s.id)}')">
          <i class="fa-solid fa-graduation-cap"></i>
          <div class="school-row-text"><strong>${escapeHtml(s.name)}</strong><small>@${escapeHtml(s.slug)}</small></div>
          ${s.id === currentSchoolId ? '<i class="fa-solid fa-check"></i>' : ''}
        </button>`).join('')
    : `<p class="friends-empty-inner">No schools match "${escapeHtml(q)}".</p>`;
}

async function pickSchool(schoolId) {
  if (!isSupabaseConnected || !currentUserId) return;
  const { error } = await supabaseClient.from('profiles').update({ school_id: schoolId }).eq('user_id', currentUserId);
  if (error) return showToast('Could not set school: ' + error.message, 'error');
  currentSchoolId = schoolId;
  currentSchool = schoolsCache.find(s => s.id === schoolId) || null;
  updateSchoolChrome();
  document.getElementById('schoolModal').dataset.required = '0';
  document.getElementById('schoolModal').style.display = 'none';
  // Reload everything now that the RLS view of the world changed.
  loadAllSupabaseData();
}

// Reviews view: pick which school's reviews to browse.
function setReviewSchool(value) {
  reviewSchoolFilterId = value || 'mine';
  if (isSupabaseConnected) fetchReviews();
}
function renderReviewSchoolOptions() {
  const sel = document.getElementById('review-school-filter');
  if (!sel) return;
  const cur = sel.value;
  const opts = [
    `<option value="mine">${currentSchool ? 'My school (' + escapeHtml(currentSchool.name) + ')' : 'My school'}</option>`,
    ...schoolsCache.filter(s => s.id !== currentSchoolId).map(s => `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)}</option>`)
  ];
  sel.innerHTML = opts.join('');
  sel.value = (cur && [...sel.options].some(o => o.value === cur)) ? cur : reviewSchoolFilterId;
}

async function createSchoolFromInput() {
  if (!isSupabaseConnected || !currentUserId) return;
  const nameInput = document.getElementById('school-picker-new');
  const status = document.getElementById('school-picker-status');
  const name = (nameInput?.value || '').trim();
  status.textContent = '';
  if (name.length < 2) { status.textContent = 'Give the school a real name.'; status.className = 'friends-status err'; return; }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  if (slug.length < 2) { status.textContent = "That name doesn't produce a valid handle."; status.className = 'friends-status err'; return; }
  const { data, error } = await supabaseClient
    .from('schools')
    .insert([{ name, slug, created_by: currentUserId }])
    .select().single();
  if (error) {
    // Handle unique conflict gracefully
    const existing = schoolsCache.find(s => s.name.toLowerCase() === name.toLowerCase() || s.slug === slug);
    if (existing) return pickSchool(existing.id);
    status.textContent = 'Could not create: ' + error.message; status.className = 'friends-status err'; return;
  }
  schoolsCache.push(data);
  await pickSchool(data.id);
  nameInput.value = '';
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
        <span>${escapeHtml(post.time || '')}</span>
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
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-weight:800; color:var(--accent-color);">${group.course}</span>
        <span style="font-size:0.75rem; color:var(--sub-text-color);">${group.members}/${group.max} Members</span>
      </div>
      <div style="font-weight:700; margin-bottom:6px; cursor:pointer;" onclick="openGroupDetailModal('${group.id}')">${group.name}</div>
      <div style="font-size:0.75rem; color:var(--sub-text-color); margin-bottom:10px;">
        <i class="fa-solid fa-location-dot"></i> ${group.location || 'Campus Center'} • <i class="fa-solid fa-clock"></i> ${group.schedule || 'TBD'}
      </div>
      <div style="display:flex; gap:8px;">
        <button class="secondary-btn" style="flex:1; padding:8px; font-size:0.8rem;" onclick="openGroupDetailModal('${group.id}')">Details</button>
        <button class="${group.joined ? 'secondary-btn active-state' : 'primary-btn'}" style="flex:1; padding:8px; font-size:0.8rem;" onclick="toggleGroupJoin('${group.id}')">
          ${group.joined ? 'Leave' : 'Join'}
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function openGroupDetailModal(groupId) {
  const group = studyGroups.find(g => g.id === groupId);
  if (!group) return;

  const topicsList = (group.topics || []).map(t => `<li style="font-size:0.8rem; color:var(--main-text-color);">${t}</li>`).join('') || '<li>General study</li>';
  const rosterList = (group.roster || []).map(r => `<span style="font-size:0.72rem; background:var(--card-bg); border:1px solid var(--card-border); padding:2px 8px; border-radius:10px;">${r}</span>`).join(' ');

  openModal(
    group.name,
    `
      <div style="text-align:left;">
        <p style="font-size:0.82rem; margin-bottom:8px;"><strong>Course:</strong> ${group.course}</p>
        <p style="font-size:0.82rem; margin-bottom:8px;"><strong>Host:</strong> ${group.host || 'Student Organizer'}</p>
        <p style="font-size:0.82rem; margin-bottom:8px;"><strong>Location:</strong> ${group.location || 'Library'}</p>
        <p style="font-size:0.82rem; margin-bottom:10px;"><strong>Meeting Time:</strong> ${group.schedule || 'Weekly'}</p>
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

// Events Engine
function renderEvents() {
  const container = document.getElementById('events-list');
  if (!container) return;
  container.innerHTML = '';

  campusEvents.forEach((ev, idx) => {
    const card = document.createElement('div');
    card.className = 'info-card';
    card.innerHTML = `
      <div style="font-weight:800; color:var(--accent-color); font-size:1rem;">${ev.title}</div>
      <div style="font-size:0.8rem; color:var(--sub-text-color); margin:4px 0;"><i class="fa-solid fa-clock"></i> ${ev.date}</div>
      <div style="font-size:0.8rem; color:var(--sub-text-color); margin-bottom:6px;"><i class="fa-solid fa-location-dot"></i> ${ev.location} • ${ev.attendeesCount || 0} Attending</div>
      <p style="font-size:0.8rem; color:var(--main-text-color); margin-bottom:10px; line-height:1.3;">${ev.description}</p>
      <button class="${ev.rsvp ? 'secondary-btn active-state' : 'primary-btn'}" style="width:100%; padding:8px;" onclick="toggleRsvp(${idx})">
        ${ev.rsvp ? '✓ Attending (Cancel RSVP)' : 'RSVP Now'}
      </button>
    `;
    container.appendChild(card);
  });
}

function toggleRsvp(idx) {
  campusEvents[idx].rsvp = !campusEvents[idx].rsvp;
  campusEvents[idx].attendeesCount += campusEvents[idx].rsvp ? 1 : -1;
  renderEvents();
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

// Timer Engine
function openTimerModal() { document.getElementById('timerModal').style.display = 'flex'; }
function closeTimerModal() { document.getElementById('timerModal').style.display = 'none'; clearInterval(timerInterval); timerInterval = null; }

function toggleTimer() {
  const btn = document.getElementById('timer-start-btn');
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    btn.textContent = "Resume Focus";
    btn.classList.remove('active-state');
  } else {
    btn.textContent = "Pause Focus";
    btn.classList.add('active-state');
    timerInterval = setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
        updateTimerDisplay();
      } else {
        clearInterval(timerInterval);
        showToast('🍅 Pomodoro complete — take a 5-minute break.', 'success', 6000);
        resetTimer();
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerSeconds = 1500;
  updateTimerDisplay();
  const btn = document.getElementById('timer-start-btn');
  btn.textContent = "Start Focus";
  btn.classList.remove('active-state');
}

function updateTimerDisplay() {
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  document.getElementById('timer-display').textContent = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
}

// Reviews Engine
function openReviewModal() { document.getElementById('reviewModal').style.display = 'flex'; }
function closeReviewModal() { document.getElementById('reviewModal').style.display = 'none'; }

async function submitReview(event) {
  event.preventDefault();
  if (!currentUserId) { closeReviewModal(); return showToast('Sign in to leave a review.', 'warn'); }
  if (!currentSchoolId) { closeReviewModal(); return openSchoolPicker(true); }

  const teacher = document.getElementById('review-teacher').value.trim();
  const rating  = document.getElementById('review-rating').value;
  const text    = document.getElementById('review-text').value.trim();
  if (!teacher || !text) return showToast('Fill in teacher and review text.', 'warn');
  if (text.length > 2000) return showToast('Review is too long.', 'warn');

  const { error } = await supabaseClient
    .from('instructor_reviews')
    .insert([{ teacher, rating, text, author_id: currentUserId, school_id: currentSchoolId }]);
  if (error) return showToast('Review blocked: ' + error.message, 'error');
  showToast('Review posted.', 'success');
  event.target.reset();
  closeReviewModal();
  switchTab('profile-view');
}

function renderReviews() {
  const container = document.getElementById('user-reviews-list');
  const filterVal = document.getElementById('rating-filter') ? document.getElementById('rating-filter').value : 'all';
  if (!container) return;
  renderReviewSchoolOptions();

  container.innerHTML = '';
  const teacherChipHtml = selectedTeacherName ? `
    <div class="active-teacher-chip">
      Showing reviews for <strong>${escapeHtml(selectedTeacherName)}</strong>
      <button class="teacher-clear-btn" onclick="clearTeacherFilter()"><i class="fa-solid fa-xmark"></i></button>
    </div>` : '';

  let filtered = userReviews.filter(rev => filterVal === 'all' || rev.rating === filterVal);
  if (selectedTeacherName) {
    filtered = filtered.filter(rev => (rev.teacher || '').trim().toLowerCase() === selectedTeacherName.toLowerCase());
  }

  if (!filtered.length) {
    const isOwn = reviewSchoolFilterId === 'mine' && currentSchool;
    container.innerHTML = teacherChipHtml + `<div class="empty-state">
      <i class="fa-solid fa-star"></i>
      <p>No reviews${selectedTeacherName ? ' for ' + escapeHtml(selectedTeacherName) : isOwn ? ' for ' + escapeHtml(currentSchool.name) : ''} yet.</p>
      ${currentUserId ? '<button class="primary-btn" onclick="openReviewModal()">+ Add Review</button>' : ''}
    </div>`;
    return;
  }

  container.innerHTML = teacherChipHtml;

  filtered.forEach(rev => {
    const isMine = rev.author_id && rev.author_id === currentUserId;
    const card = document.createElement('div');
    card.className = 'info-card';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-weight:700; margin-bottom:6px;">
        <span style="color:var(--accent-color);">${escapeHtml(rev.teacher || '')}</span>
        <span>${'⭐'.repeat(parseInt(rev.rating) || 0)}</span>
      </div>
      <p style="font-size:0.82rem; color:var(--sub-text-color);">${escapeHtml(rev.text || '')}</p>
      <div style="text-align:right; margin-top:8px;">
        ${isMine ? `<i class="fa-solid fa-trash" style="color:#ff3b30; cursor:pointer;" onclick="deleteReview('${escapeAttr(rev.id)}')"></i>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

async function deleteReview(id) {
  if (!currentUserId) return showToast('Sign in first.', 'warn');
  if (!confirm('Delete this review?')) return;
  const { error } = await supabaseClient.from('instructor_reviews').delete().eq('id', id);
  if (error) return showToast('Could not delete: ' + error.message, 'error');
  showToast('Review deleted.', 'success');
}

function updateAnalytics() {
  const countEl = document.getElementById('total-reviews-count');
  if (countEl) countEl.textContent = userReviews.length;
}

// Search Engine
// -------------------- Teacher Directory --------------------
// The Explore tab lists every teacher that appears in instructor_reviews,
// with a live average rating and a review count. Tap one to jump to the
// Reviews tab pre-filtered to just their reviews.

let teachersAll = [];              // full aggregated list (for whatever school filter is active)
let teacherViewSchoolId = 'mine';  // 'mine' | <school_id>
let selectedTeacherName = null;    // when set, Reviews view filters to this teacher

async function fetchTeachersForView() {
  if (!isSupabaseConnected) return;
  let q = supabaseClient
    .from('instructor_reviews')
    .select('teacher, rating, school_id')
    .order('created_at', { ascending: false })
    .limit(1000);
  const school = teacherViewSchoolId === 'mine' ? currentSchoolId : teacherViewSchoolId;
  if (school) q = q.eq('school_id', school);
  const { data, error } = await q;
  if (error) { showToast('Could not load teachers: ' + error.message, 'error'); return; }

  // Aggregate: {name -> {count, sumRating, avg, schoolIds:Set}}
  const map = new Map();
  (data || []).forEach(r => {
    const key = (r.teacher || '').trim();
    if (!key) return;
    const cur = map.get(key) || { name: key, count: 0, sum: 0, schools: new Set() };
    const num = parseInt(r.rating, 10) || 0;
    cur.count += 1;
    cur.sum   += num;
    if (r.school_id) cur.schools.add(r.school_id);
    map.set(key, cur);
  });
  teachersAll = [...map.values()]
    .map(t => ({ name: t.name, count: t.count, avg: t.count ? t.sum / t.count : 0, schools: [...t.schools] }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count);
  renderTeacherDirectory();
}

function renderTeacherSchoolOptions() {
  const sel = document.getElementById('teacher-school-filter');
  if (!sel) return;
  const cur = sel.value;
  const opts = [
    `<option value="mine">${currentSchool ? 'My school (' + escapeHtml(currentSchool.name) + ')' : 'My school'}</option>`,
    ...schoolsCache.filter(s => s.id !== currentSchoolId)
      .map(s => `<option value="${escapeAttr(s.id)}">${escapeHtml(s.name)}</option>`)
  ];
  sel.innerHTML = opts.join('');
  sel.value = (cur && [...sel.options].some(o => o.value === cur)) ? cur : teacherViewSchoolId;
  // Wire change to refetch (since the list depends on selected school).
  sel.onchange = () => { teacherViewSchoolId = sel.value; fetchTeachersForView(); };
}

function renderTeacherDirectory() {
  const container = document.getElementById('teacher-directory');
  if (!container) return;
  renderTeacherSchoolOptions();

  const query = (document.getElementById('teacher-search-input')?.value || '').trim().toLowerCase();
  const list  = teachersAll.filter(t => !query || t.name.toLowerCase().includes(query));

  if (!list.length) {
    container.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-chalkboard-user"></i>
      <p>${query ? 'No teachers match your search.' : 'No teachers reviewed yet — be the first to share what a class was like.'}</p>
      ${currentUserId ? '<button class="primary-btn" onclick="openReviewModal()">+ Add Review</button>' : ''}
    </div>`;
    return;
  }

  container.innerHTML = list.map(t => {
    const starStr  = '⭐'.repeat(Math.round(t.avg));
    const avgStr   = t.avg.toFixed(1);
    return `
      <button class="teacher-card" onclick="openTeacherReviews('${escapeAttr(t.name)}')">
        <div class="teacher-avatar"><i class="fa-solid fa-chalkboard-user"></i></div>
        <div class="teacher-meta">
          <strong>${escapeHtml(t.name)}</strong>
          <small>${t.count} review${t.count === 1 ? '' : 's'} · ${avgStr}★</small>
        </div>
        <div class="teacher-stars">${starStr}</div>
      </button>
    `;
  }).join('');
}

function openTeacherReviews(name) {
  selectedTeacherName = name;
  // Sync the reviews view to whatever school the directory is currently on.
  reviewSchoolFilterId = teacherViewSchoolId;
  fetchReviews();
  switchTab('profile-view');
}
function clearTeacherFilter() { selectedTeacherName = null; renderReviews(); }

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