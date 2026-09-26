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

const defaultFeed = [
  { id: "1", author: "Campus News", title: "Library Extended Hours for Finals Week", text: "Main Campus Library will remain open 24 hours starting next Monday.", likes: 24, time: "2h ago", comments: [] },
  { id: "2", author: "Physics Club", title: "Quantum Physics Guest Lecture", text: "Dr. Aris Thorne joins us virtually this Thursday at 5:00 PM.", likes: 15, time: "5h ago", comments: [] }
];

const defaultGroups = [
  { id: "1", name: "Physics 101 Midterm Squad", course: "Physics 101", members: 4, max: 6, joined: false, host: "Elena Vance", location: "Science Hall Rm 204", schedule: "Tue/Thu 5:00 PM", topics: ["Thermodynamics", "Lab Quiz Prep"], roster: ["Elena V.", "Mark K."] },
  { id: "2", name: "Calculus Problem Solvers", course: "Calculus II", members: 5, max: 5, joined: false, host: "Marcus Brody", location: "Library Pod B", schedule: "Mondays 6:30 PM", topics: ["Integration by Parts"], roster: ["Marcus B.", "Priya N."] }
];

const defaultEvents = [
  { id: "1", title: "Career Fair 2026", date: "Sept 28, 10:00 AM", location: "Student Union", rsvp: false, attendeesCount: 142, description: "Connect with over 40 hiring partners, tech startups, and research institutes." },
  { id: "2", title: "CS Hackathon Warmup", date: "Oct 2, 4:00 PM", location: "Tech Lab 3", rsvp: true, attendeesCount: 38, description: "Practice rapid prototyping and meet team partners." }
];

const defaultGpaCourses = [
  { name: "Physics 101", grade: "A", credits: 4 },
  { name: "Calculus II", grade: "B+", credits: 4 },
  { name: "World History", grade: "A-", credits: 3 }
];

const defaultReviews = [
  { id: "1", teacher: "Mr. Smith (Physics)", rating: "5", text: "Fair grader and clear study sheets provided before midterms." }
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
let userReviews = [];
let campusFeed = [];
let studyGroups = [];
let gpaCourses = [];
let campusEvents = [];
let chatMessages = [];         // legacy — no longer rendered directly; kept for online-count
let dmMessages = [];           // messages for the currently-selected friend thread
let selectedFriendId = null;
let friends = [];              // [{friend_id, handle, display_name}]
let pendingIncoming = [];      // [{id, requester_id, handle, display_name}]
let pendingOutgoing = [];      // [{id, addressee_id, handle, display_name}]
let profileMap = {};           // user_id -> {handle, display_name}
let appSettings = { ...defaultSettings };
let appTheme = { ...THEME_PRESETS.cyber };

// Guest-mode seed friends so the UI is explorable without a real account.
const GUEST_FRIENDS = [
  { friend_id: 'guest-alice', handle: 'alice', display_name: 'Alice (demo)' },
  { friend_id: 'guest-bob',   handle: 'bob',   display_name: 'Bob (demo)' }
];
const GUEST_SEED_DMS = {
  'guest-alice': [
    { sender_id: 'guest-alice', recipient_id: 'guest', text: 'Hey! Ready for the midterm review?', time: '10:15 AM' },
    { sender_id: 'guest',       recipient_id: 'guest-alice', text: 'Almost — one more chapter to go.', time: '10:17 AM' }
  ],
  'guest-bob': [
    { sender_id: 'guest-bob', recipient_id: 'guest', text: 'Yo, coffee before class?', time: '9:02 AM' }
  ]
};

let currentPostCommentId = null;
let timerSeconds = 1500;
let timerInterval = null;
let realtimeChannel = null;
let feedSort = 'new'; // 'new' | 'top' | 'comments'
let unreadNotifs = 2;
let appAppearance = { ...defaultAppearance };

// A row that lives only in the local seed uses ids like "1"/"2"; a row that
// actually exists in Supabase has a UUID. Only UUID-backed rows should be
// pushed to the DB — otherwise updates silently match zero rows and the UI
// looks broken.
function isDbRow(id) {
  return typeof id === 'string' && id.length >= 32 && id.includes('-');
}

function saveLocalGroups() {
  if (currentUser) localStorage.setItem(`groups_${currentUser}`, JSON.stringify(studyGroups));
}
function loadLocalGroups() {
  if (!currentUser) return null;
  const raw = localStorage.getItem(`groups_${currentUser}`);
  return raw ? JSON.parse(raw) : null;
}
function saveLocalFeed() {
  if (currentUser) localStorage.setItem(`feed_${currentUser}`, JSON.stringify(campusFeed));
}
function loadLocalFeed() {
  if (!currentUser) return null;
  const raw = localStorage.getItem(`feed_${currentUser}`);
  return raw ? JSON.parse(raw) : null;
}

document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  loadAppearance();
  applyAppearance();
  initSystemThemeListener();

  if (isSupabaseConnected) {
    const boot = (session) => {
      if (session) {
        currentUser = session.user.email;
        currentUserId = session.user.id;
        document.getElementById('auth-screen').style.display = 'none';
        const nameDisplay = currentUser.split('@')[0];
        document.getElementById('user-welcome-title').textContent = `Welcome Back, ${nameDisplay}`;
        ensureProfile().finally(() => {
          initSupabaseRealtime();
          loadAllSupabaseData();
        });
      } else {
        currentUser = null;
        currentUserId = null;
        currentHandle = null;
        document.getElementById('auth-screen').style.display = 'flex';
      }
    };
    supabaseClient.auth.getSession().then(({ data: { session } }) => boot(session));
    supabaseClient.auth.onAuthStateChange((_ev, session) => boot(session));
  } else {
    currentUser = localStorage.getItem('knowledge_app_current_user') || 'guest@campus.edu';
    if (currentUser !== 'guest@campus.edu') {
      document.getElementById('auth-screen').style.display = 'none';
    }
    loadLocalFallbackData();
  }
});

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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'instructor_reviews' }, () => fetchReviews())
    .subscribe();
}

async function loadAllSupabaseData() {
  await Promise.all([fetchFeed(), fetchGroups(), fetchReviews(), fetchFriendships()]);
  const savedGpa = localStorage.getItem(`gpa_${currentUser}`);
  gpaCourses = savedGpa ? JSON.parse(savedGpa) : [...defaultGpaCourses];
  campusEvents = [...defaultEvents];
  renderGpaRows();
  renderEvents();
  updateNotifBadge();
}

async function fetchFeed() {
  const { data, error } = await supabaseClient.from('campus_feed').select('*').order('created_at', { ascending: false }).limit(30);
  if (!error && data) {
    // Merge DB rows with local seed content: DB rows first, then any locally
    // saved edits (likes/reactions on seed rows) fall back to defaults.
    const localSeed = loadLocalFeed() || [...defaultFeed];
    campusFeed = data.length ? [...data, ...localSeed] : localSeed;
    renderFeed();
    updateAnalytics();
  }
}

async function fetchGroups() {
  const { data, error } = await supabaseClient.from('study_groups').select('*');
  if (!error && data) {
    const localSeed = loadLocalGroups() || [...defaultGroups];
    studyGroups = data.length ? [...data, ...localSeed.filter(g => !isDbRow(g.id))] : localSeed;
    renderGroups();
  }
}

async function fetchReviews() {
  const { data, error } = await supabaseClient.from('instructor_reviews').select('*').order('created_at', { ascending: false });
  if (!error && data) {
    userReviews = data.length ? data : [...defaultReviews];
    renderReviews();
    updateAnalytics();
  }
}

function loadLocalFallbackData() {
  userReviews = [...defaultReviews];
  campusFeed = loadLocalFeed() || [...defaultFeed];
  studyGroups = loadLocalGroups() || [...defaultGroups];
  gpaCourses = [...defaultGpaCourses];
  campusEvents = [...defaultEvents];
  // Guest mode: expose the demo friends so the Messages tab is explorable.
  friends = [];
  pendingIncoming = [];
  pendingOutgoing = [];
  renderFeed();
  renderGroups();
  renderEvents();
  renderGpaRows();
  renderReviews();
  renderFriendsStrip();
  renderDMThread();
  renderFriendsBadge();
  updateAnalytics();
  updateNotifBadge();
}

// Authentication Handlers
function toggleAuthMode() {
  document.getElementById('login-form').classList.toggle('hidden');
  document.getElementById('signup-form').classList.toggle('hidden');
}

async function handleAuth(event) {
  event.preventDefault();
  const isSignup = !document.getElementById('signup-form').classList.contains('hidden');

  if (isSupabaseConnected) {
    try {
      if (isSignup) {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
          alert("Sign up failed: " + error.message + "\n\nTip: use \"Continue as Guest\" to explore without an account.");
          return;
        }
        // If Supabase returned a session, we're auto-logged in.
        // If not, email confirmation is required — try to sign in anyway
        // (works when the project has confirmation disabled), otherwise
        // tell the user and drop them into guest mode so they aren't stuck.
        if (!data?.session) {
          const { error: signInErr } = await supabaseClient.auth.signInWithPassword({ email, password });
          if (signInErr) {
            alert("Account created. If your Supabase project requires email confirmation, check your inbox before signing in. Continuing as guest for now.");
            enterGuestMode(email);
          }
        }
      } else {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) alert("Login failed: " + error.message);
      }
    } catch (err) {
      alert("Auth error: " + err.message);
    }
  } else {
    enterGuestMode(document.getElementById('login-email').value || 'student@campus.edu');
  }
}

function enterGuestMode(email) {
  currentUser = email || 'guest@campus.edu';
  localStorage.setItem('knowledge_app_current_user', currentUser);
  document.getElementById('auth-screen').style.display = 'none';
  const nameDisplay = currentUser.split('@')[0];
  const welcome = document.getElementById('user-welcome-title');
  if (welcome) welcome.textContent = `Welcome, ${nameDisplay}`;
  loadLocalFallbackData();
}

async function logout() {
  // Always clear form fields + local user + hard-reset auth screen so a
  // second sign-in works cleanly regardless of Supabase's async callback.
  ['login-email','login-password','signup-name','signup-email','signup-password']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  localStorage.removeItem('knowledge_app_current_user');

  if (isSupabaseConnected) {
    try { await supabaseClient.auth.signOut(); } catch (_) {}
  }
  currentUser = null;
  const authScreen = document.getElementById('auth-screen');
  if (authScreen) authScreen.style.display = 'flex';
  // Ensure the login form (not signup) is showing after logout.
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  if (loginForm && signupForm) {
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
  }
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

  if (viewId === 'chat-view') { renderFriendsStrip(); renderDMThread(); }
}

function toggleNotifications() {
  document.getElementById('notif-drawer').classList.toggle('open');
  // Opening the drawer clears the unread badge.
  unreadNotifs = 0;
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
    .select('handle, display_name')
    .eq('user_id', currentUserId)
    .maybeSingle();
  if (!error && data) {
    currentHandle = data.handle;
    profileMap[currentUserId] = data;
  }
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
  if (error) return alert('Could not update request: ' + error.message);
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
  const list = currentUserId ? friends : (currentUser ? GUEST_FRIENDS : []);
  if (!list.length) {
    strip.innerHTML = `
      <div class="friends-empty">
        <i class="fa-solid fa-user-plus"></i>
        <div class="friends-empty-text">
          <span>${currentUserId ? 'No friends yet.' : 'Sign in to add real friends. Guest mode shows demo friends only.'}</span>
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
  if (!friendId) { dmMessages = []; renderDMThread(); return; }
  if (currentUserId && isSupabaseConnected) {
    const { data, error } = await supabaseClient
      .from('campus_chat')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},recipient_id.eq.${friendId}),`+
        `and(sender_id.eq.${friendId},recipient_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true })
      .limit(200);
    dmMessages = error ? [] : (data || []);
  } else {
    dmMessages = [...(GUEST_SEED_DMS[friendId] || [])];
  }
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

  if (!selectedFriendId) return alert('Pick a friend first.');

  let text = String(input.value || '').replace(/\s+/g, ' ').trim();
  if (!text) return;
  if (text.length > CHAT_MAX_LEN) text = text.slice(0, CHAT_MAX_LEN);

  const now = performance.now();
  chatSendTimestamps = chatSendTimestamps.filter(t => now - t < CHAT_RATE_WINDOW_MS);
  if (chatSendTimestamps.length >= CHAT_RATE_MAX) {
    const waitMs = CHAT_RATE_WINDOW_MS - (now - chatSendTimestamps[0]);
    alert(`Slow down — up to ${CHAT_RATE_MAX} messages every ${CHAT_RATE_WINDOW_MS/1000}s. Try again in ${Math.ceil(waitMs/1000)}s.`);
    return;
  }

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (currentUserId && isSupabaseConnected) {
    const msgObj = {
      sender_id: currentUserId,
      recipient_id: selectedFriendId,
      user: sanitizeName(currentHandle || currentUser.split('@')[0]),
      text, time: timeStr
    };
    chatSendTimestamps.push(now);
    input.value = ''; updateChatCounter();
    const { error } = await supabaseClient.from('campus_chat').insert([msgObj]);
    if (error) return alert('Message blocked: ' + error.message + '\n(Make sure you and this person are friends.)');
  } else {
    dmMessages.push({ sender_id: 'guest', recipient_id: selectedFriendId, text, time: timeStr });
    chatSendTimestamps.push(now);
    input.value = ''; updateChatCounter();
    renderDMThread();
  }
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

  if (isSupabaseConnected && isDbRow(id)) {
    await supabaseClient.from('campus_feed').update({ likes: newLikes }).eq('id', id);
  } else {
    saveLocalFeed();
  }
  renderFeed();
}

async function reactToPost(id, emoji) {
  const post = campusFeed.find(p => p.id === id);
  if (!post) return;
  post.reactions = post.reactions || {};
  post.reactions[emoji] = (post.reactions[emoji] || 0) + 1;

  if (isSupabaseConnected && isDbRow(id)) {
    await supabaseClient.from('campus_feed').update({ reactions: post.reactions }).eq('id', id);
  } else {
    saveLocalFeed();
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
      <div style="font-weight:700; color:var(--accent-color); font-size:0.75rem;">${c.author}</div>
      <div style="font-size:0.82rem; color:var(--main-text-color); margin-top:2px;">${c.text}</div>
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

    if (isSupabaseConnected && isDbRow(currentPostCommentId)) {
      await supabaseClient.from('campus_feed').update({ comments: updatedComments }).eq('id', currentPostCommentId);
    } else {
      saveLocalFeed();
    }
    renderFeed();
    openCommentsModal(currentPostCommentId);
  }
}

function openNewPostModal() { document.getElementById('postModal').style.display = 'flex'; }
function closePostModal() { document.getElementById('postModal').style.display = 'none'; }

async function submitPost(event) {
  event.preventDefault();
  const title = document.getElementById('post-title').value;
  const text = document.getElementById('post-text').value;

  const newPost = {
    author: appSettings.anonymous ? "Anonymous Student" : (currentUser ? currentUser.split('@')[0] : "Student"),
    title,
    text,
    likes: 0,
    time: "Just now",
    comments: []
  };

  if (isSupabaseConnected && currentUserId) {
    const { error } = await supabaseClient.from('campus_feed').insert([{ ...newPost, author_id: currentUserId }]);
    if (error) alert('Post blocked: ' + error.message);
  } else {
    campusFeed.unshift({ id: String(Date.now()), ...newPost });
    saveLocalFeed();
    renderFeed();
  }

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
  const group = studyGroups.find(g => g.id === id);
  if (!group) return;

  if (!group.joined && group.members >= group.max) return alert("Group is full!");

  const isJoining = !group.joined;
  const newMembers = Math.max(0, group.members + (isJoining ? 1 : -1));
  group.joined = isJoining;
  group.members = newMembers;

  if (isSupabaseConnected && isDbRow(id)) {
    await supabaseClient.from('study_groups').update({ joined: isJoining, members: newMembers }).eq('id', id);
  } else {
    saveLocalGroups();
  }
  renderGroups();
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
  if (currentUser) localStorage.setItem(`gpa_${currentUser}`, JSON.stringify(gpaCourses));
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
        alert("Pomodoro complete! Take a break.");
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
  const teacher = document.getElementById('review-teacher').value;
  const rating = document.getElementById('review-rating').value;
  const text = document.getElementById('review-text').value;

  const revObj = { teacher, rating, text };

  if (isSupabaseConnected && currentUserId) {
    const { error } = await supabaseClient.from('instructor_reviews').insert([{ ...revObj, author_id: currentUserId }]);
    if (error) alert('Review blocked: ' + error.message);
  } else {
    userReviews.unshift({ id: String(Date.now()), ...revObj });
    renderReviews();
    updateAnalytics();
  }

  event.target.reset();
  closeReviewModal();
  switchTab('profile-view');
}

function renderReviews() {
  const container = document.getElementById('user-reviews-list');
  const filterVal = document.getElementById('rating-filter') ? document.getElementById('rating-filter').value : 'all';
  if (!container) return;

  container.innerHTML = '';
  const filtered = userReviews.filter(rev => filterVal === 'all' || rev.rating === filterVal);

  filtered.forEach(rev => {
    const card = document.createElement('div');
    card.className = 'info-card';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-weight:700; margin-bottom:6px;">
        <span style="color:var(--accent-color);">${rev.teacher}</span>
        <span>${'⭐'.repeat(parseInt(rev.rating))}</span>
      </div>
      <p style="font-size:0.82rem; color:var(--sub-text-color);">${rev.text}</p>
      <div style="text-align:right; margin-top:8px;">
        <i class="fa-solid fa-trash" style="color:#ff3b30; cursor:pointer;" onclick="deleteReview('${rev.id}')"></i>
      </div>
    `;
    container.appendChild(card);
  });
}

async function deleteReview(id) {
  if (isSupabaseConnected) {
    await supabaseClient.from('instructor_reviews').delete().eq('id', id);
  } else {
    userReviews = userReviews.filter(r => r.id !== id);
    renderReviews();
    updateAnalytics();
  }
}

function updateAnalytics() {
  const countEl = document.getElementById('total-reviews-count');
  if (countEl) countEl.textContent = userReviews.length;
}

// Search Engine
function filterChip(cat, el) {
  document.querySelectorAll('#search-view .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('#searchGrid .card').forEach(card => {
    card.style.display = (cat === 'all' || card.dataset.category === cat) ? 'flex' : 'none';
  });
}

function filterCards() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  document.querySelectorAll('#searchGrid .card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
  });
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