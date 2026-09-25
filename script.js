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

let currentUser = null;
let userReviews = [];
let campusFeed = [];
let studyGroups = [];
let gpaCourses = [];
let campusEvents = [];
let chatMessages = [];
let appSettings = { ...defaultSettings };
let appTheme = { ...THEME_PRESETS.cyber };

let currentPostCommentId = null;
let timerSeconds = 1500;
let timerInterval = null;
let realtimeChannel = null;

document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  initSystemThemeListener();

  if (isSupabaseConnected) {
    // Check initial Auth session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        currentUser = session.user.email;
        document.getElementById('auth-screen').style.display = 'none';
        const nameDisplay = currentUser.split('@')[0];
        document.getElementById('user-welcome-title').textContent = `Welcome Back, ${nameDisplay}`;
        initSupabaseRealtime();
        loadAllSupabaseData();
      } else {
        document.getElementById('auth-screen').style.display = 'flex';
      }
    });

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session) {
        currentUser = session.user.email;
        document.getElementById('auth-screen').style.display = 'none';
        const nameDisplay = currentUser.split('@')[0];
        document.getElementById('user-welcome-title').textContent = `Welcome Back, ${nameDisplay}`;
        initSupabaseRealtime();
        loadAllSupabaseData();
      } else {
        currentUser = null;
        document.getElementById('auth-screen').style.display = 'flex';
        loadLocalFallbackData();
      }
    });
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
  darkModeMediaQuery.addEventListener('change', e => {
    if (appSettings.autoSystemTheme) {
      appSettings.lightMode = !e.matches;
      loadSavedSettings();
    }
  });
}

// Supabase Realtime Subscriptions Engine
function initSupabaseRealtime() {
  if (realtimeChannel) return;

  realtimeChannel = supabaseClient
    .channel('public-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campus_chat' }, () => fetchChat())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campus_feed' }, () => fetchFeed())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'study_groups' }, () => fetchGroups())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'instructor_reviews' }, () => fetchReviews())
    .subscribe();
}

async function loadAllSupabaseData() {
  await Promise.all([fetchFeed(), fetchChat(), fetchGroups(), fetchReviews()]);
  const savedGpa = localStorage.getItem(`gpa_${currentUser}`);
  gpaCourses = savedGpa ? JSON.parse(savedGpa) : [...defaultGpaCourses];
  campusEvents = [...defaultEvents];
  renderGpaRows();
  renderEvents();
}

async function fetchFeed() {
  const { data, error } = await supabaseClient.from('campus_feed').select('*').order('created_at', { ascending: false }).limit(30);
  if (!error && data) {
    campusFeed = data;
    renderFeed();
  }
}

async function fetchChat() {
  const { data, error } = await supabaseClient.from('campus_chat').select('*').order('created_at', { ascending: true }).limit(50);
  if (!error && data) {
    chatMessages = data;
    renderChat();
  }
}

async function fetchGroups() {
  const { data, error } = await supabaseClient.from('study_groups').select('*');
  if (!error && data) {
    studyGroups = data.length ? data : [...defaultGroups];
    renderGroups();
  }
}

async function fetchReviews() {
  const { data, error } = await supabaseClient.from('instructor_reviews').select('*').order('created_at', { ascending: false });
  if (!error && data) {
    userReviews = data;
    renderReviews();
    updateAnalytics();
  }
}

function loadLocalFallbackData() {
  userReviews = [...defaultReviews];
  campusFeed = [...defaultFeed];
  studyGroups = [...defaultGroups];
  gpaCourses = [...defaultGpaCourses];
  campusEvents = [...defaultEvents];
  chatMessages = [{ user: "Campus Bot", text: "Welcome to Live Campus Chat!", time: "12:00 PM" }];
  renderFeed();
  renderGroups();
  renderEvents();
  renderGpaRows();
  renderReviews();
  renderChat();
  updateAnalytics();
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
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) alert("Sign up failed: " + error.message);
        else alert("Account created! Check your email to confirm registration.");
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
    currentUser = document.getElementById('login-email').value || 'student@campus.edu';
    localStorage.setItem('knowledge_app_current_user', currentUser);
    document.getElementById('auth-screen').style.display = 'none';
    loadLocalFallbackData();
  }
}

async function logout() {
  if (isSupabaseConnected) {
    await supabaseClient.auth.signOut();
  } else {
    currentUser = null;
    localStorage.removeItem('knowledge_app_current_user');
    document.getElementById('auth-screen').style.display = 'flex';
  }
}

// Theme Engine
function setCyberTheme() { applyPresetConfig(THEME_PRESETS.cyber); }
function setSynthwaveTheme() { applyPresetConfig(THEME_PRESETS.synthwave); }
function setMatrixTheme() { applyPresetConfig(THEME_PRESETS.matrix); }
function setDraculaTheme() { applyPresetConfig(THEME_PRESETS.dracula); }
function setNordicTheme() { applyPresetConfig(THEME_PRESETS.nordic); }
function setOrangeTheme() { applyPresetConfig(THEME_PRESETS.orange); }
function setCrimsonTheme() { applyPresetConfig(THEME_PRESETS.crimson); }
function setGoldTheme() { applyPresetConfig(THEME_PRESETS.gold); }
function setEmeraldTheme() { applyPresetConfig(THEME_PRESETS.emerald); }
function setMonochromeTheme() { applyPresetConfig(THEME_PRESETS.monochrome); }

function applyPresetConfig(config) {
  const root = document.documentElement;
  root.style.setProperty('--accent-color', config.main);
  root.style.setProperty('--accent-light', config.light);
  root.style.setProperty('--text-on-accent', config.textOnAccent || '#ffffff');

  if (!appSettings.lightMode) {
    root.style.setProperty('--card-bg', config.card);
    root.style.setProperty('--nav-bg', config.nav);
    root.style.setProperty('--bg-color', config.bg);
  }
  appTheme = { ...config };
}

function updateTheme() {
  const main = document.getElementById('picker-main').value;
  const light = document.getElementById('picker-light').value;
  const card = document.getElementById('picker-card').value;
  const nav = document.getElementById('picker-nav').value;

  applyPresetConfig({ main, light, card, nav, bg: appTheme.bg, textOnAccent: '#ffffff' });
}

function toggleThemeStudio() {
  document.getElementById('theme-studio-box').classList.toggle('open');
}

function loadSavedSettings() {
  const lightToggle = document.getElementById('lightmode-toggle');
  if (appSettings.lightMode) {
    if (lightToggle) lightToggle.classList.add('active');
    document.body.classList.add('light-mode');
  } else {
    if (lightToggle) lightToggle.classList.remove('active');
    document.body.classList.remove('light-mode');
  }
}

function toggleLightMode(listItem) {
  const toggle = listItem.querySelector('.toggle-btn');
  toggle.classList.toggle('active');
  appSettings.lightMode = toggle.classList.contains('active');

  if (appSettings.lightMode) document.body.classList.add('light-mode');
  else document.body.classList.remove('light-mode');

  applyPresetConfig(appTheme);
}

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

  if (viewId === 'chat-view') renderChat();
}

function toggleNotifications() {
  document.getElementById('notif-drawer').classList.toggle('open');
}

// Chat Engine
function renderChat() {
  const box = document.getElementById('app-chat-messages');
  if (!box) return;

  box.innerHTML = '';
  const myHandle = appSettings.anonymous ? "You" : (currentUser ? currentUser.split('@')[0] : "You");

  chatMessages.forEach(msg => {
    const isMine = msg.user === myHandle || msg.user === currentUser || msg.user === 'You';
    const msgEl = document.createElement('div');
    msgEl.className = `chat-bubble ${isMine ? 'chat-bubble-mine' : 'chat-bubble-other'}`;
    msgEl.innerHTML = `
      <span class="chat-user">${isMine ? 'You' : msg.user}</span>
      <div class="chat-text">${msg.text}</div>
      <span class="chat-time">${msg.time || ''}</span>
    `;
    box.appendChild(msgEl);
  });

  box.scrollTop = box.scrollHeight;
}

async function sendAppChatMessage(event) {
  event.preventDefault();
  const input = document.getElementById('app-chat-input');
  if (!input || !input.value.trim()) return;

  const text = input.value.trim();
  const senderName = appSettings.anonymous ? "Anonymous Student" : (currentUser ? currentUser.split('@')[0] : "Student");
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const msgObj = { user: senderName, text, time: timeStr };

  if (isSupabaseConnected) {
    await supabaseClient.from('campus_chat').insert([msgObj]);
  } else {
    chatMessages.push(msgObj);
    renderChat();
  }

  input.value = '';
}

// Feed Engine
function renderFeed() {
  const container = document.getElementById('feed-container');
  if (!container) return;
  container.innerHTML = '';

  campusFeed.forEach(post => {
    const commentCount = post.comments ? post.comments.length : 0;
    const el = document.createElement('div');
    el.className = 'info-card';
    el.innerHTML = `
      <div class="post-meta">
        <span class="post-author">${post.author}</span>
        <span>${post.time}</span>
      </div>
      <div class="post-title">${post.title}</div>
      <p class="post-body">${post.text}</p>
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

async function toggleLikePost(id) {
  const post = campusFeed.find(p => p.id === id);
  if (!post) return;

  post.liked = !post.liked;
  const newLikes = Math.max(0, (post.likes || 0) + (post.liked ? 1 : -1));

  if (isSupabaseConnected) {
    await supabaseClient.from('campus_feed').update({ likes: newLikes }).eq('id', id);
  } else {
    post.likes = newLikes;
    renderFeed();
  }
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

    if (isSupabaseConnected) {
      await supabaseClient.from('campus_feed').update({ comments: updatedComments }).eq('id', currentPostCommentId);
    } else {
      renderFeed();
    }
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

  if (isSupabaseConnected) {
    await supabaseClient.from('campus_feed').insert([newPost]);
  } else {
    campusFeed.unshift({ id: String(Date.now()), ...newPost });
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

  if (isSupabaseConnected) {
    await supabaseClient.from('study_groups').update({ joined: isJoining, members: newMembers }).eq('id', id);
  } else {
    group.joined = isJoining;
    group.members = newMembers;
    renderGroups();
  }
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

  if (isSupabaseConnected) {
    await supabaseClient.from('instructor_reviews').insert([revObj]);
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