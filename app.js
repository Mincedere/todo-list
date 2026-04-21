const SUPABASE_URL = 'https://kueqgafpyflgugpxlccz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZXFnYWZweWZsZ3VncHhsY2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjEyNjQsImV4cCI6MjA5MjMzNzI2NH0.5rpDKYlhct6ckUFWbmQNFTYyFzoDNdadOXqEdCim3DI';
const API = `${SUPABASE_URL}/rest/v1/todos`;
const AUTH = `${SUPABASE_URL}/auth/v1`;

let accessToken = null;
let currentUser = null;
let tasks = [];
let currentFilter = 'all';

function authHeaders() {
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
}

// ==================== AUTH ====================

const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const authMessage = document.getElementById('authMessage');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

function showMessage(text, type) {
    authMessage.textContent = text;
    authMessage.className = 'auth-message ' + type;
}

function clearMessage() {
    authMessage.className = 'auth-message';
    authMessage.textContent = '';
}

document.getElementById('showSignup').addEventListener('click', e => {
    e.preventDefault();
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    clearMessage();
});

document.getElementById('showLogin').addEventListener('click', e => {
    e.preventDefault();
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
    clearMessage();
});

// Kayit Ol
document.getElementById('signupBtn').addEventListener('click', async () => {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    if (!email || !password) {
        showMessage('E-posta ve sifre gerekli.', 'error');
        return;
    }
    if (password.length < 6) {
        showMessage('Sifre en az 6 karakter olmali.', 'error');
        return;
    }

    const btn = document.getElementById('signupBtn');
    btn.disabled = true;
    btn.textContent = 'Kaydediliyor...';

    const res = await fetch(`${AUTH}/signup`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password,
            data: {},
            gotrue_meta_security: {}
        })
    });

    const data = await res.json();
    btn.disabled = false;
    btn.textContent = 'Kayit Ol';

    if (res.ok) {
        showMessage('Kayit basarili! E-postanizi kontrol edin ve onay linkine tiklayin.', 'success');
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    } else {
        showMessage(data.error_description || data.msg || 'Kayit basarisiz.', 'error');
    }
});

// Giris Yap
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    if (!email || !password) {
        showMessage('E-posta ve sifre gerekli.', 'error');
        return;
    }

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Giris yapiliyor...';

    const res = await fetch(`${AUTH}/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    btn.disabled = false;
    btn.textContent = 'Giris Yap';

    if (res.ok) {
        saveSession(data);
        showApp();
    } else {
        showMessage(data.error_description || data.msg || 'Giris basarisiz.', 'error');
    }
});

// Cikis
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('sb_session');
    accessToken = null;
    currentUser = null;
    appContainer.style.display = 'none';
    authContainer.style.display = 'block';
    clearMessage();
});

function saveSession(data) {
    accessToken = data.access_token;
    currentUser = data.user;
    localStorage.setItem('sb_session', JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user
    }));
}

async function refreshSession(refreshToken) {
    const res = await fetch(`${AUTH}/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
    });
    if (res.ok) {
        const data = await res.json();
        saveSession(data);
        return true;
    }
    return false;
}

function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';
    document.getElementById('userEmail').textContent = currentUser.email;
    fetchTasks();
}

// ==================== Onay linki (hash fragment) ====================

async function handleAuthCallback() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) return false;

    const params = new URLSearchParams(hash.substring(1));
    const accessTokenParam = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessTokenParam) {
        // Token ile kullanici bilgisini al
        const res = await fetch(`${AUTH}/user`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${accessTokenParam}`
            }
        });
        if (res.ok) {
            const user = await res.json();
            saveSession({
                access_token: accessTokenParam,
                refresh_token: refreshToken,
                user
            });
            // Hash'i temizle
            history.replaceState(null, '', window.location.pathname);
            return true;
        }
    }
    return false;
}

// ==================== TODO CRUD ====================

const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');
const clearCompleted = document.getElementById('clearCompleted');
const filterBtns = document.querySelectorAll('.filter-btn');

async function fetchTasks() {
    const res = await fetch(`${API}?user_id=eq.${currentUser.id}&order=created_at.asc`, {
        headers: authHeaders()
    });
    if (res.ok) {
        tasks = await res.json();
    } else {
        tasks = [];
    }
    renderTasks();
}

async function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    addBtn.disabled = true;
    const res = await fetch(API, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text, completed: false, user_id: currentUser.id })
    });
    if (res.ok) {
        const [newTask] = await res.json();
        tasks.push(newTask);
    }
    taskInput.value = '';
    addBtn.disabled = false;
    renderTasks();
}

async function deleteTask(id) {
    await fetch(`${API}?id=eq.${id}`, { method: 'DELETE', headers: authHeaders() });
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
}

async function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    await fetch(`${API}?id=eq.${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ completed: task.completed })
    });
    renderTasks();
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const li = document.querySelector(`[data-id="${id}"]`);
    const span = li.querySelector('span');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = task.text;
    input.style.cssText = 'flex:1;padding:4px 8px;font-size:16px;border:2px solid #667eea;border-radius:6px;outline:none;';

    span.replaceWith(input);
    input.focus();

    async function save() {
        const newText = input.value.trim();
        if (newText && newText !== task.text) {
            task.text = newText;
            await fetch(`${API}?id=eq.${id}`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ text: newText })
            });
        }
        renderTasks();
    }

    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') renderTasks();
    });
}

function getFilteredTasks() {
    if (currentFilter === 'active') return tasks.filter(t => !t.completed);
    if (currentFilter === 'completed') return tasks.filter(t => t.completed);
    return tasks;
}

function renderTasks() {
    const filtered = getFilteredTasks();
    taskList.innerHTML = '';

    filtered.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item' + (task.completed ? ' completed' : '');
        li.dataset.id = task.id;

        li.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''}>
            <span>${escapeHtml(task.text)}</span>
            <button class="edit-btn" title="Duzenle">&#9998;</button>
            <button class="delete-btn" title="Sil">&#10005;</button>
        `;

        li.querySelector('input[type="checkbox"]').addEventListener('change', () => toggleTask(task.id));
        li.querySelector('.edit-btn').addEventListener('click', () => editTask(task.id));
        li.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

        taskList.appendChild(li);
    });

    const remaining = tasks.filter(t => !t.completed).length;
    taskCount.textContent = `${remaining} gorev kaldi`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

addBtn.addEventListener('click', addTask);

taskInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

clearCompleted.addEventListener('click', async () => {
    const completedIds = tasks.filter(t => t.completed).map(t => t.id);
    if (completedIds.length === 0) return;
    await fetch(`${API}?id=in.(${completedIds.join(',')})`, { method: 'DELETE', headers: authHeaders() });
    tasks = tasks.filter(t => !t.completed);
    renderTasks();
});

// ==================== INIT ====================

(async function init() {
    // 1. Onay linkinden mi geldi?
    const fromCallback = await handleAuthCallback();
    if (fromCallback) {
        showApp();
        return;
    }

    // 2. Mevcut oturum var mi?
    const stored = localStorage.getItem('sb_session');
    if (stored) {
        const session = JSON.parse(stored);
        // Token'i refresh et
        const ok = await refreshSession(session.refresh_token);
        if (ok) {
            showApp();
            return;
        }
        localStorage.removeItem('sb_session');
    }

    // 3. Giris ekranini goster
    authContainer.style.display = 'block';
})();
