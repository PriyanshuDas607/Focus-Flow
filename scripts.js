const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

const state = {
  tasks: [],
  filters: { status:'all', priority:'all', category:'all', search:'' },
  editingId: null,
};

const storageKey = 'monochrome_todo_v1';
const themeKey = 'monochrome_theme';

// --- Persistence ---
function load(){
  try{
    const raw = localStorage.getItem(storageKey);
    if(raw) state.tasks = JSON.parse(raw);
    const savedTheme = localStorage.getItem(themeKey);
    if(savedTheme === 'light') document.documentElement.classList.add('light');
    $('#themeToggle').checked = document.documentElement.classList.contains('light');
  }catch(e){ console.warn('load', e); }
}
function save(){
  localStorage.setItem(storageKey, JSON.stringify(state.tasks));
}

// --- Helpers ---
const uid = () => Math.random().toString(36).slice(2,9);
function fmtDate(iso){ if(!iso) return 'No due date';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month:'short', day:'numeric' }); }

function progress(){
  const total = state.tasks.length || 1; const done = state.tasks.filter(t=>t.completed).length;
  const pct = Math.round(done/total*100);
  $('#progressText').textContent = pct + '%';
  const len = 100;
  $('#donutArc').setAttribute('stroke-dasharray', `${pct} ${len-pct}`);
}

// --- Rendering ---
function render(){
  const board = $('#board');
  board.innerHTML = '';
  const q = state.filters.search.trim().toLowerCase();
  const filtered = state.tasks.filter(t=>{
    if(state.filters.status==='active' && t.completed) return false;
    if(state.filters.status==='completed' && !t.completed) return false;
    if(state.filters.priority!=='all' && t.priority!==state.filters.priority) return false;
    if(state.filters.category!=='all' && t.category!==state.filters.category) return false;
    if(q){
      const hay = (t.title + ' ' + (t.tags||[]).join(' ')).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });

  $('#emptyState').classList.toggle('hidden', filtered.length!==0);

  filtered.forEach(t => board.appendChild(taskCard(t)));

  progress();
  save();
}

function taskCard(t){
  const el = document.createElement('article');
  el.className = 'card enter';
  el.dataset.id = t.id;

  const row = document.createElement('div'); row.className = 'row';
  const left = document.createElement('div'); left.className = 'left';

  const cb = document.createElement('input'); cb.type='checkbox'; cb.className='checkbox'; cb.checked = !!t.completed;
  cb.addEventListener('change', () => { t.completed = cb.checked; render(); });

  const titleline = document.createElement('div'); titleline.className='titleline';
  const h = document.createElement('div'); h.className='task-title'; h.textContent = t.title; if(t.completed) h.classList.add('completed');
  const meta = document.createElement('div'); meta.className='meta';

  const cat = chip(t.category);
  const due = chip('Due ' + fmtDate(t.dueDate)); due.classList.add('badge');
  const pr = chip(t.priority + ' priority'); pr.classList.add('badge');
  meta.append(cat, due, pr);

  if(t.tags && t.tags.length){
    const tags = document.createElement('div'); tags.className='tags';
    t.tags.forEach(tag=> tags.appendChild(chip('#'+tag)) );
    meta.appendChild(tags);
  }

  titleline.append(h, meta);
  left.append(cb, titleline);

  const controls = document.createElement('div'); controls.className='controls';
  const editBtn = iconButton('✎','Edit');
  editBtn.addEventListener('click', ()=> openEdit(t.id));
  const delBtn = iconButton('🗑','Delete');
  delBtn.addEventListener('click', ()=> remove(t.id));
  controls.append(editBtn, delBtn);

  row.append(left, controls);
  el.append(row);

  return el;
}

function chip(text){ const s = document.createElement('span'); s.className='chip'; s.textContent=text; return s }
function iconButton(symbol, label){ const b = document.createElement('button'); b.className='icon-btn'; b.textContent=symbol; b.title=label; return b }

// --- CRUD ---
function add(){
  const title = $('#taskTitle').value.trim();
  if(!title){ $('#taskTitle').focus(); return }
  const t = {
    id: uid(),
    title,
    category: $('#taskCategory').value,
    dueDate: $('#taskDate').value || null,
    priority: $('#taskPriority').value,
    tags: parseTags($('#taskTags').value),
    completed: false,
    createdAt: Date.now(),
  };
  state.tasks.unshift(t);
  clearComposer();
  render();
}

function remove(id){ state.tasks = state.tasks.filter(t=>t.id!==id); render(); }

function openEdit(id){
  state.editingId = id; const t = state.tasks.find(x=>x.id===id); if(!t) return;
  $('#editTitle').value = t.title;
  $('#editCategory').value = t.category;
  $('#editPriority').value = t.priority;
  $('#editDate').value = t.dueDate || '';
  $('#editTags').value = (t.tags||[]).join(', ');
  $('#editDialog').showModal();
}

function saveEdit(){
  const t = state.tasks.find(x=>x.id===state.editingId); if(!t) return;
  t.title = $('#editTitle').value.trim() || t.title;
  t.category = $('#editCategory').value;
  t.priority = $('#editPriority').value;
  t.dueDate = $('#editDate').value || null;
  t.tags = parseTags($('#editTags').value);
  $('#editDialog').close();
  render();
}

function clearCompleted(){ state.tasks = state.tasks.filter(t=>!t.completed); render(); }

function clearComposer(){
  $('#taskTitle').value='';
  $('#taskDate').value='';
  $('#taskPriority').value='Medium';
  $('#taskTags').value='';
}

const parseTags = (str) => str.split(',').map(s=>s.trim()).filter(Boolean).map(s=>s.replace(/^#/,'').toLowerCase());

// --- Filters ---
function updateFilters(){
  state.filters = {
    status: $('#filterStatus').value,
    priority: $('#filterPriority').value,
    category: $('#filterCategory').value,
    search: $('#search').value
  };
  render();
}

// --- Theme ---
function toggleTheme(){
  document.documentElement.classList.toggle('light');
  localStorage.setItem(themeKey, document.documentElement.classList.contains('light') ? 'light' : 'dark');
}

// --- Bindings ---
function bind(){
  $('#addBtn').addEventListener('click', add);
  $('#taskTitle').addEventListener('keydown', e=>{ if(e.key==='Enter') add(); });
  $('#search').addEventListener('input', updateFilters);
  $('#filterStatus').addEventListener('change', updateFilters);
  $('#filterPriority').addEventListener('change', updateFilters);
  $('#filterCategory').addEventListener('change', updateFilters);
  $('#clearAll').addEventListener('click', clearCompleted);
  $('#themeToggle').addEventListener('change', toggleTheme);
  $('#saveEdit').addEventListener('click', saveEdit);
  $('#closeDialog').addEventListener('click', ()=> $('#editDialog').close());

  $('#editDialog').addEventListener('cancel', e=> e.preventDefault());
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Escape' && $('#editDialog').open){ $('#editDialog').close(); }
  });
}

// --- Init ---
load(); bind(); render();
