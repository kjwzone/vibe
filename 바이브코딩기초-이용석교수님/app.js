// 할 일의 추가·수정·삭제·완료 체크와 localStorage 저장을 처리하는 앱 로직
'use strict';

const STORAGE_KEY = 'todos';
const CATEGORIES = ['업무', '개인', '공부'];
const CATEGORY_CLASS = { 업무: 'work', 개인: 'life', 공부: 'study' };

const FILTER_ALL = '전체';

let todos = [];
let editingId = null;
let activeFilter = FILTER_ALL;

const form = document.querySelector('.add');
const titleInput = document.getElementById('new-title');
const categorySelect = document.getElementById('new-category');
const listEl = document.querySelector('.todo-list');
const tabsEl = document.querySelector('.tabs');
const progressDone = document.getElementById('progress-done');
const progressDetail = document.getElementById('progress-detail');
const meterEl = document.querySelector('.meter');

// 저장소

function isValidTodo(item) {
  return item !== null
    && typeof item === 'object'
    && typeof item.id === 'string'
    && typeof item.title === 'string'
    && CATEGORIES.includes(item.category)
    && typeof item.done === 'boolean';
}

function loadTodos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed.filter(isValidTodo) : [];
  } catch (error) {
    console.warn('저장된 할 일을 읽지 못해 빈 목록으로 시작합니다.', error);
    return [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (error) {
    console.warn('할 일을 저장하지 못했습니다.', error);
  }
}

// 데이터 변경 (변경 직후 저장하고 다시 그린다)

function commit() {
  saveTodos();
  render();
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function findTodo(id) {
  return todos.find((todo) => todo.id === id);
}

function addTodo(title, category) {
  const trimmed = title.trim();
  if (!trimmed) return false;
  todos.push({
    id: newId(),
    title: trimmed,
    category,
    done: false,
    createdAt: new Date().toISOString(),
  });
  editingId = null;
  commit();
  return true;
}

function toggleTodo(id) {
  const todo = findTodo(id);
  if (!todo) return;
  todo.done = !todo.done;
  commit();
}

function updateTodo(id, title, category) {
  const todo = findTodo(id);
  const trimmed = title.trim();
  if (!todo || !trimmed) return false;
  todo.title = trimmed;
  todo.category = category;
  editingId = null;
  commit();
  return true;
}

function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  commit();
}

// 화면 그리기 (데이터를 바꾸지 않는다)

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function actionButton(label, action, disabled) {
  const button = el('button', '', label);
  button.type = 'button';
  button.dataset.action = action;
  button.disabled = disabled;
  return button;
}

function createViewRow(todo) {
  const locked = editingId !== null;
  const row = el('li', todo.done ? 'todo is-done' : 'todo');
  row.dataset.id = todo.id;

  const check = el('input', 'todo-check');
  check.type = 'checkbox';
  check.checked = todo.done;
  check.disabled = locked;
  check.dataset.action = 'toggle';
  check.setAttribute('aria-label', todo.title + ' 완료');

  const title = el('span', 'todo-title', todo.title);
  const badge = el('span', 'badge badge-' + CATEGORY_CLASS[todo.category], todo.category);
  const actions = el('span', 'todo-actions');
  actions.append(actionButton('수정', 'edit', locked), actionButton('삭제', 'delete', locked));

  row.append(check, title, badge, actions);
  return row;
}

function createEditRow(todo) {
  const row = el('li', 'todo is-editing');
  row.dataset.id = todo.id;

  const input = el('input', 'todo-edit-title');
  input.type = 'text';
  input.value = todo.title;
  input.setAttribute('aria-label', '할 일 제목 수정');

  const select = el('select', 'todo-edit-category');
  select.setAttribute('aria-label', '카테고리 수정');
  CATEGORIES.forEach((category) => {
    const option = el('option', '', category);
    option.selected = category === todo.category;
    select.append(option);
  });

  const actions = el('span', 'todo-actions');
  actions.append(actionButton('저장', 'save', false), actionButton('취소', 'cancel', false));

  row.append(input, select, actions);
  return row;
}

function visibleTodos() {
  return activeFilter === FILTER_ALL
    ? todos
    : todos.filter((todo) => todo.category === activeFilter);
}

function emptyMessage() {
  if (todos.length === 0) return '할 일이 없습니다. 위에서 첫 할 일을 추가해 보세요.';
  return activeFilter + ' 할 일이 없습니다.';
}

function renderList() {
  const visible = visibleTodos();
  if (visible.length === 0) {
    listEl.replaceChildren(el('li', 'empty', emptyMessage()));
    return;
  }
  listEl.replaceChildren(
    ...visible.map((todo) => (todo.id === editingId ? createEditRow(todo) : createViewRow(todo)))
  );
  const editInput = listEl.querySelector('.todo-edit-title');
  if (editInput) {
    editInput.focus();
    editInput.select();
  }
}

function renderTabs() {
  tabsEl.querySelectorAll('button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter));
  });
}

// 진행률은 저장하지 않고 매번 전체 목록에서 계산한다 (현재 탭과 무관)

function countProgress(items) {
  return { done: items.filter((todo) => todo.done).length, total: items.length };
}

function progressRatio(progress) {
  return progress.total === 0 ? 0 : (progress.done / progress.total) * 100;
}

function renderProgress() {
  const overall = countProgress(todos);
  progressDone.textContent = overall.done;
  progressDetail.textContent = '/' + overall.total + ' 완료 · ' + Math.round(progressRatio(overall)) + '%';

  const byCategory = CATEGORIES.map((category) => countProgress(todos.filter((todo) => todo.category === category)));
  CATEGORIES.forEach((category, index) => {
    const key = CATEGORY_CLASS[category];
    const progress = byCategory[index];
    const segment = meterEl.querySelector('.seg-' + key);
    segment.style.setProperty('--total', overall.total === 0 ? 1 : progress.total);
    segment.style.setProperty('--done', progressRatio(progress) + '%');
    document.querySelector('.legend-' + key + ' .count').textContent = progress.done + '/' + progress.total;
  });
  meterEl.setAttribute(
    'aria-label',
    CATEGORIES.map((category, index) => category + ' ' + byCategory[index].done + '/' + byCategory[index].total).join(', ') + ' 완료'
  );
}

function render() {
  renderProgress();
  renderTabs();
  renderList();
}

// 사용자 입력 처리

function saveEdit(row) {
  const input = row.querySelector('.todo-edit-title');
  const select = row.querySelector('.todo-edit-category');
  if (!updateTodo(row.dataset.id, input.value, select.value)) {
    input.focus();
  }
}

function cancelEdit() {
  editingId = null;
  render();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (addTodo(titleInput.value, categorySelect.value)) {
    titleInput.value = '';
  }
  titleInput.focus();
});

tabsEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  editingId = null;
  render();
});

listEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const row = button.closest('.todo');
  const id = row.dataset.id;

  if (button.dataset.action === 'edit') {
    editingId = id;
    render();
  } else if (button.dataset.action === 'delete') {
    deleteTodo(id);
  } else if (button.dataset.action === 'save') {
    saveEdit(row);
  } else if (button.dataset.action === 'cancel') {
    cancelEdit();
  }
});

listEl.addEventListener('change', (event) => {
  if (event.target.dataset.action === 'toggle') {
    toggleTodo(event.target.closest('.todo').dataset.id);
  }
});

listEl.addEventListener('keydown', (event) => {
  if (!event.target.classList.contains('todo-edit-title') || event.isComposing) return;
  if (event.key === 'Enter') {
    saveEdit(event.target.closest('.todo'));
  } else if (event.key === 'Escape') {
    cancelEdit();
  }
});

todos = loadTodos();
render();
