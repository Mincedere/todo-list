const SUPABASE_URL = 'https://kueqgafpyflgugpxlccz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZXFnYWZweWZsZ3VncHhsY2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjEyNjQsImV4cCI6MjA5MjMzNzI2NH0.5rpDKYlhct6ckUFWbmQNFTYyFzoDNdadOXqEdCim3DI';
const API = `${SUPABASE_URL}/rest/v1/todos`;
const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');
const clearCompleted = document.getElementById('clearCompleted');
const filterBtns = document.querySelectorAll('.filter-btn');

let tasks = [];
let currentFilter = 'all';

async function fetchTasks() {
    const res = await fetch(`${API}?order=created_at.asc`, { headers });
    tasks = await res.json();
    renderTasks();
}

async function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    addBtn.disabled = true;
    const res = await fetch(API, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, completed: false })
    });
    const [newTask] = await res.json();
    tasks.push(newTask);
    taskInput.value = '';
    addBtn.disabled = false;
    renderTasks();
}

async function deleteTask(id) {
    await fetch(`${API}?id=eq.${id}`, { method: 'DELETE', headers });
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
}

async function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    await fetch(`${API}?id=eq.${id}`, {
        method: 'PATCH',
        headers,
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
                headers,
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
    await fetch(`${API}?id=in.(${completedIds.join(',')})`, { method: 'DELETE', headers });
    tasks = tasks.filter(t => !t.completed);
    renderTasks();
});

fetchTasks();
