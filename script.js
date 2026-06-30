const gradePoints = {
  "A+": 4.00, "A": 3.75, "A-": 3.50,
  "B+": 3.25, "B": 3.00, "B-": 2.75,
  "C+": 2.50, "C": 2.25, "C-": 2.00,
  "D+": 1.50, "D": 1.00, "F": 0.00
};

const RING_CIRC = 2 * Math.PI * 85;

// ---- STATE (in-memory only) ----
let semesters = [];
let activeSemId = null;
let idCounter = 0;

function newId() { 
  return 'sem-' + (++idCounter); 
}

function createSemester(name) {
  const sem = {
    id: newId(),
    name: name || `Semester ${semesters.length + 1}`,
    mode: 'detail',
    quickCredit: '',
    quickGpa: '',
    courses: [
      { name: '', credit: '', grade: 'A' },
      { name: '', credit: '', grade: 'A' },
      { name: '', credit: '', grade: 'A' }
    ]
  };
  semesters.push(sem);
  return sem;
}

function getActiveSem() {
  return semesters.find(s => s.id === activeSemId);
}

// ---- SYNC current DOM inputs into active semester's state ----
function syncActiveFromDOM() {
  const sem = getActiveSem();
  if (!sem) return;
  sem.name = document.getElementById('semNameInput').value || sem.name;

  if (sem.mode === 'quick') {
    const qc = document.getElementById('quickCreditInput');
    const qg = document.getElementById('quickGpaInput');
    if (qc) sem.quickCredit = qc.value;
    if (qg) sem.quickGpa = qg.value;
  } else {
    const rows = document.querySelectorAll('#courseTableBody .course-row');
    if (rows.length) {
      sem.courses = Array.from(rows).map(row => ({
        name: row.querySelector('.course-name').value,
        credit: row.querySelector('.credit-hours').value,
        grade: row.querySelector('.grade-select').value
      }));
    }
  }
}

// ---- compute GPA for one semester's course list (detail mode) ----
function computeGpa(courses) {
  let totalCredits = 0, totalPoints = 0, count = 0;
  courses.forEach(c => {
    const credit = parseFloat(c.credit);
    if (!isNaN(credit) && credit > 0) {
      totalCredits += credit;
      totalPoints += credit * gradePoints[c.grade];
      count++;
    }
  });
  return {
    gpa: totalCredits > 0 ? totalPoints / totalCredits : 0,
    totalCredits, totalPoints, count
  };
}

// ---- get result for a semester, respecting its mode ----
function getSemResult(sem) {
  if (sem.mode === 'quick') {
    const credit = parseFloat(sem.quickCredit);
    const gpa = parseFloat(sem.quickGpa);
    const totalCredits = (!isNaN(credit) && credit > 0) ? credit : 0;
    const g = (!isNaN(gpa) && gpa >= 0) ? gpa : 0;
    return {
      gpa: totalCredits > 0 ? g : 0,
      totalCredits,
      totalPoints: totalCredits * g,
      count: totalCredits > 0 ? 1 : 0
    };
  }
  return computeGpa(sem.courses);
}

// ---- RENDER course rows / quick fields for active semester ----
function renderCourseRows() {
  const sem = getActiveSem();
  document.getElementById('semNameInput').value = sem.name;

  // mode toggle button states
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === sem.mode);
  });

  const detailView = document.getElementById('detailModeView');
  const quickView = document.getElementById('quickModeView');

  if (sem.mode === 'quick') {
    detailView.style.display = 'none';
    quickView.style.display = 'block';
    document.getElementById('quickCreditInput').value = sem.quickCredit || '';
    document.getElementById('quickGpaInput').value = sem.quickGpa || '';
  } else {
    detailView.style.display = 'block';
    quickView.style.display = 'none';
    const tbody = document.getElementById('courseTableBody');
    tbody.innerHTML = '';
    sem.courses.forEach(c => addRowEl(c.name, c.credit, c.grade));
  }

  updateSemGpaPill();
}

function addRowEl(courseName = '', credit = '', grade = 'A') {
  const tbody = document.getElementById('courseTableBody');
  const row = document.createElement('div');
  row.className = 'course-row';

  const gradeOptions = Object.keys(gradePoints)
    .map(g => `<option value="${g}" ${g === grade ? 'selected' : ''}>${g} (${gradePoints[g].toFixed(2)})</option>`)
    .join('');

  row.innerHTML = `
    <input type="text" class="course-name" placeholder="e.g. Calculus I" value="${courseName}">
    <input type="number" class="credit-hours" placeholder="Cr" min="0" step="0.5" value="${credit}">
    <select class="grade-select">${gradeOptions}</select>
    <button class="remove-btn" title="Remove course">&times;</button>
  `;

  row.querySelector('.remove-btn').addEventListener('click', () => {
    row.classList.add('removing');
    row.addEventListener('animationend', () => {
      row.remove();
      if (tbody.children.length === 0) addRowEl();
      syncActiveFromDOM();
      updateSemGpaPill();
    }, { once: true });
  });

  row.querySelector('.credit-hours').addEventListener('input', () => { syncActiveFromDOM(); updateSemGpaPill(); });
  row.querySelector('.grade-select').addEventListener('change', () => { syncActiveFromDOM(); updateSemGpaPill(); });
  row.querySelector('.course-name').addEventListener('input', () => { syncActiveFromDOM(); });

  tbody.appendChild(row);
}

function updateSemGpaPill() {
  syncActiveFromDOM();
  const sem = getActiveSem();
  const { gpa } = getSemResult(sem);
  document.getElementById('semGpaPill').textContent = `GPA — ${gpa.toFixed(2)}`;
}

// ---- MODE TOGGLE ----
document.getElementById('modeToggle').addEventListener('click', (e) => {
  const btn = e.target.closest('.mode-btn');
  if (!btn) return;
  syncActiveFromDOM();
  const sem = getActiveSem();
  sem.mode = btn.dataset.mode;
  renderTabs();
  renderCourseRows();
});

document.getElementById('quickCreditInput').addEventListener('input', () => { syncActiveFromDOM(); updateSemGpaPill(); renderTabs(); });
document.getElementById('quickGpaInput').addEventListener('input', () => { syncActiveFromDOM(); updateSemGpaPill(); renderTabs(); });

// ---- TABS ----
function renderTabs() {
  const bar = document.getElementById('tabsBar');
  bar.innerHTML = '';
  semesters.forEach(sem => {
    const { gpa } = getSemResult(sem);
    const tab = document.createElement('div');
    tab.className = 'sem-tab' + (sem.id === activeSemId ? ' active' : '');
    tab.innerHTML = `<span class="sem-tab-name">${sem.name}</span><span class="sem-gpa-chip">${gpa.toFixed(2)}</span>${semesters.length > 1 ? '<span class="sem-del" title="Delete semester">&times;</span>' : ''}`;

    tab.addEventListener('click', (e) => {
      if (e.target.classList.contains('sem-del')) return;
      switchToSemester(sem.id);
    });

    const delBtn = tab.querySelector('.sem-del');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSemester(sem.id);
      });
    }

    bar.appendChild(tab);
  });

  const addTab = document.createElement('div');
  addTab.className = 'add-sem-tab';
  addTab.textContent = '+ Add Semester';
  addTab.addEventListener('click', () => {
    syncActiveFromDOM();
    const sem = createSemester();
    activeSemId = sem.id;
    renderTabs();
    renderCourseRows();
  });
  bar.appendChild(addTab);
}

function switchToSemester(id) {
  syncActiveFromDOM();
  activeSemId = id;
  renderTabs();
  renderCourseRows();
}

function deleteSemester(id) {
  if (semesters.length <= 1) return;
  semesters = semesters.filter(s => s.id !== id);
  if (activeSemId === id) {
    activeSemId = semesters[0].id;
  }
  renderTabs();
  renderCourseRows();
}

// ---- RESET ----
function resetAll() {
  semesters = [];
  idCounter = 0;
  const sem = createSemester('Semester 1');
  activeSemId = sem.id;
  renderTabs();
  renderCourseRows();

  const resultCard = document.getElementById('resultCard');
  resultCard.style.display = 'none';
  resultCard.classList.remove('show');
  document.getElementById('ringFill').style.strokeDashoffset = RING_CIRC;
}

// ---- NEW CALCULATION (confirm + clear) ----
function startNewCalculation() {
  const ok = confirm('This will clear all your semester and course data. Start a new calculation?');
  if (!ok) return;
  resetAll();
}

// ---- ANIMATE NUMBER ----
function animateNumber(el, target, decimals = 2, duration = 800) {
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = (target * eased).toFixed(decimals);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target.toFixed(decimals);
  }
  requestAnimationFrame(tick);
}

function gradeRemark(cgpa) {
  if (cgpa >= 3.85) return "Outstanding ✦";
  if (cgpa >= 3.5) return "Excellent";
  if (cgpa >= 3.0) return "Very Good";
  if (cgpa >= 2.5) return "Good";
  if (cgpa >= 2.0) return "Satisfactory";
  return "Needs Improvement";
}

// ---- CALCULATE OVERALL CGPA ACROSS ALL SEMESTERS ----
function calculateCGPA() {
  syncActiveFromDOM();

  let totalCredits = 0, totalPoints = 0, totalCourses = 0;
  const breakdown = [];

  semesters.forEach(sem => {
    const r = getSemResult(sem);
    totalCredits += r.totalCredits;
    totalPoints += r.totalPoints;
    totalCourses += r.count;
    breakdown.push({ name: sem.name, gpa: r.gpa, credits: r.totalCredits, courses: r.count, mode: sem.mode });
  });

  const cgpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;

  const resultCard = document.getElementById('resultCard');
  resultCard.style.display = 'block';
  resultCard.classList.remove('show');
  void resultCard.offsetWidth;
  resultCard.classList.add('show');

  animateNumber(document.getElementById('cgpaValue'), cgpa, 2);
  document.getElementById('totalCredits').textContent = totalCredits;
  document.getElementById('totalCourses').textContent = totalCourses;
  document.getElementById('totalPoints').textContent = totalPoints.toFixed(2);
  document.getElementById('gradeTag').textContent = gradeRemark(cgpa);

  const offset = RING_CIRC - (Math.min(cgpa, 4) / 4) * RING_CIRC;
  requestAnimationFrame(() => {
    document.getElementById('ringFill').style.strokeDashoffset = offset;
  });

  // semester breakdown
  const bdWrap = document.getElementById('semBreakdown');
  const bdList = document.getElementById('semBreakdownList');
  bdList.innerHTML = '';
  if (breakdown.length > 1) {
    bdWrap.style.display = 'flex';
    breakdown.forEach(b => {
      const row = document.createElement('div');
      row.className = 'sem-bd-row';
      const detail = b.mode === 'quick' ? `${b.credits} cr (quick)` : `${b.courses} courses · ${b.credits} cr`;
      row.innerHTML = `
        <span class="sname">${b.name}</span>
        <span class="sdetail">${detail}</span>
        <span class="sgpa">${b.gpa.toFixed(2)}</span>
      `;
      bdList.appendChild(row);
    });
  } else {
    bdWrap.style.display = 'none';
  }

  renderTabs();
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---- INIT ----
document.getElementById('addRowBtn').addEventListener('click', () => { addRowEl(); syncActiveFromDOM(); updateSemGpaPill(); });
document.getElementById('calcBtn').addEventListener('click', calculateCGPA);
document.getElementById('resetBtn').addEventListener('click', startNewCalculation);
document.getElementById('semNameInput').addEventListener('input', () => {
  syncActiveFromDOM();
  renderTabs();
});

function init() {
  semesters = [];
  idCounter = 0;
  const sem = createSemester('Semester 1');
  activeSemId = sem.id;
  renderTabs();
  renderCourseRows();
}

init();