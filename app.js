const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const taskCount = document.getElementById('taskCount');
const clearCompleted = document.getElementById('clearCompleted');
const filterBtns = document.querySelectorAll('.filter-btn');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    tasks.push({ id: Date.now(), text, completed: false });
    taskInput.value = '';
    saveTasks();
    renderTasks();
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) task.completed = !task.completed;
    saveTasks();
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

    function save() {
        const newText = input.value.trim();
        if (newText) {
            task.text = newText;
            saveTasks();
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

clearCompleted.addEventListener('click', () => {
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    renderTasks();
});

renderTasks();
