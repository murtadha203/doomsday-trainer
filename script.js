/* مدرب حساب يوم الأسبوع — طريقة الأكواد (Key Value Method) */

const DAY_NAMES = ["", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTH_NAMES = ["", "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
                      "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
const MONTH_CODES = [0, 3, 3, 6, 1, 4, 6, 2, 5, 0, 3, 5]; // index 0 = يناير/كانون الثاني

function isLeap(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function daysInMonth(month, year) {
  const d = [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d[month - 1];
}

function centuryCode(year) {
  const C = Math.floor(year / 100);
  const table = [7, 5, 3, 1];
  return table[((C % 4) + 4) % 4];
}

function yearCode(year) {
  const yy = ((year % 100) + 100) % 100;
  return (yy + Math.floor(yy / 4)) % 7;
}

function monthCodeFor(month, year) {
  let mc = MONTH_CODES[month - 1];
  if (isLeap(year) && (month === 1 || month === 2)) mc -= 1;
  return mc;
}

function computeWeekday(day, month, year) {
  const mc = monthCodeFor(month, year);
  const yc = yearCode(year);
  const cc = centuryCode(year);
  const total = day + mc + yc + cc;
  const mod = ((total % 7) + 7) % 7;
  const result = mod === 0 ? 7 : mod;
  return { result, mc, yc, cc, total, mod };
}

/* ---------------- تخزين التقدم ---------------- */

const STORAGE_KEY = "ddtrainer_progress_v1";
const THRESHOLD = { 1: 6, 2: 10, 3: 8, 4: 8, 5: null };

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    1: { streak: 0, best: 0, correct: 0, total: 0, passed: false },
    2: { streak: 0, best: 0, correct: 0, total: 0, passed: false },
    3: { streak: 0, best: 0, correct: 0, total: 0, passed: false },
    4: { streak: 0, best: 0, correct: 0, total: 0, passed: false },
    5: { streak: 0, best: 0, correct: 0, total: 0 },
  };
}

let progress = loadProgress();

function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (e) {}
}

function stageUnlocked(n) {
  if (n === 1) return true;
  return !!progress[n - 1].passed;
}

let currentStage = 1;
{
  const first = loadProgress();
  for (let n = 1; n <= 5; n++) {
    const p = n === 1 ? true : first[n - 1].passed;
    if (p && !(first[n] && first[n].passed) ) { currentStage = n; break; }
    currentStage = n;
  }
}

/* ---------------- واجهة عامة ---------------- */

const stageNav = document.getElementById("stageNav");
const stageContainer = document.getElementById("stageContainer");

const STAGE_TITLES = {
  1: "كودات القرن",
  2: "كودات الشهر",
  3: "كود السنة",
  4: "التجميع والقراءة",
  5: "الاختبار الشامل",
};

function renderNav() {
  stageNav.innerHTML = "";
  for (let n = 1; n <= 5; n++) {
    const tab = document.createElement("div");
    const unlocked = stageUnlocked(n);
    tab.className = "stage-tab" +
      (n === currentStage ? " active" : "") +
      (progress[n] && progress[n].passed ? " passed" : "") +
      (!unlocked ? " locked" : "");
    tab.innerHTML = `<span class="num">${n}</span>${STAGE_TITLES[n]}`;
    if (unlocked) {
      tab.addEventListener("click", () => { currentStage = n; render(); });
    }
    stageNav.appendChild(tab);
  }
}

function render() {
  renderNav();
  stageContainer.innerHTML = "";
  if (!stageUnlocked(currentStage)) {
    stageContainer.innerHTML = `<div class="lock-msg">هاي المرحلة مقفلة. خلّص المرحلة الي قبلها أول.</div>`;
    return;
  }
  const builders = { 1: buildStage1, 2: buildStage2, 3: buildStage3, 4: buildStage4, 5: buildStage5 };
  builders[currentStage]();
}

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("تصفير كل التقدم بكل المراحل؟")) return;
  localStorage.removeItem(STORAGE_KEY);
  progress = loadProgress();
  currentStage = 1;
  render();
});

/* ---------------- أدوات مشتركة لبناء مرحلة سؤال/جواب ---------------- */

function progressBarHtml(stageNum) {
  const p = progress[stageNum];
  const threshold = THRESHOLD[stageNum];
  if (!threshold) {
    return `<div class="progress-row">
      <span>صحيح: ${p.correct} / ${p.total}</span>
      <div class="progress-bar"><div style="width:${p.total ? Math.round(100*p.correct/p.total) : 0}%"></div></div>
      <span>أفضل تسلسل: ${p.best}</span>
    </div>`;
  }
  const pct = Math.min(100, Math.round(100 * p.streak / threshold));
  return `<div class="progress-row">
    <span>التسلسل الحالي: ${p.streak} / ${threshold}</span>
    <div class="progress-bar"><div style="width:${pct}%"></div></div>
    <span>صحيح: ${p.correct} / ${p.total}</span>
  </div>`;
}

function registerAnswer(stageNum, isCorrect) {
  const p = progress[stageNum];
  p.total += 1;
  if (isCorrect) {
    p.correct += 1;
    p.streak += 1;
    if (p.streak > p.best) p.best = p.streak;
  } else {
    p.streak = 0;
  }
  const threshold = THRESHOLD[stageNum];
  let justPassed = false;
  if (threshold && p.streak >= threshold && !p.passed) {
    p.passed = true;
    justPassed = true;
  }
  saveProgress();
  return justPassed;
}

/* ---------------- المرحلة 1: كودات القرن ---------------- */

const CENTURIES = [1600, 1700, 1800, 1900, 2000, 2100];

function buildStage1() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="card">
      <h2>المرحلة 1 — كودات القرن</h2>
      <details class="learn-box" ${progress[1].total ? "" : "open"}>
        <summary>الشرح</summary>
        <p>كل قرن إله كود ثابت، ويتكرر كل 400 سنة. القاعدة: كل ما تنتقل قرن، الكود ينزل 2 (وإذا وصل تحت 1 يرجع 7).</p>
        <table class="code-table">
          <tr><th>القرن</th><th>1600</th><th>1700</th><th>1800</th><th>1900</th><th>2000</th><th>2100</th></tr>
          <tr><th>الكود</th><td>7</td><td>5</td><td>3</td><td>1</td><td>7</td><td>5</td></tr>
        </table>
        <p class="formula-box">احفظها كسلسلة: <b>7 - 5 - 3 - 1</b>، وتتكرر.</p>
      </details>
      ${progressBarHtml(1)}
      <div class="question-area" id="qArea"></div>
      <div class="feedback" id="feedback"></div>
      <div class="options-grid" id="optsArea"></div>
      <div class="next-row" id="nextRow"></div>
    </div>`;
  stageContainer.appendChild(wrap);
  askStage1Question();
}

function askStage1Question() {
  const century = CENTURIES[Math.floor(Math.random() * CENTURIES.length)];
  const correct = centuryCode(century);
  document.getElementById("qArea").innerHTML = `
    <div class="question-prompt">قرن ${century}</div>
    <div class="question-sub">شنو كوده؟</div>`;
  document.getElementById("feedback").textContent = "";
  document.getElementById("nextRow").innerHTML = "";
  const options = shuffledOptions([1, 3, 5, 7], correct);
  const optsArea = document.getElementById("optsArea");
  optsArea.className = "options-grid";
  optsArea.innerHTML = "";
  options.forEach(val => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.textContent = val;
    btn.addEventListener("click", () => handleStage1Answer(val, correct, btn, optsArea));
    optsArea.appendChild(btn);
  });
}

function handleStage1Answer(chosen, correct, btn, optsArea) {
  [...optsArea.children].forEach(b => b.disabled = true);
  const isCorrect = chosen === correct;
  btn.classList.add(isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    [...optsArea.children].forEach(b => { if (parseInt(b.textContent) === correct) b.classList.add("correct"); });
  }
  const fb = document.getElementById("feedback");
  fb.className = "feedback " + (isCorrect ? "good" : "bad");
  fb.textContent = isCorrect ? "صح!" : `غلط، الجواب ${correct}`;
  const justPassed = registerAnswer(1, isCorrect);
  renderStageBar(1);
  showNext(() => { renderStageBar(1); askStage1Question(); }, justPassed);
}

/* ---------------- المرحلة 2: كودات الشهر ---------------- */

function buildStage2() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="card">
      <h2>المرحلة 2 — كودات الشهر</h2>
      <details class="learn-box" ${progress[2].total ? "" : "open"}>
        <summary>الشرح</summary>
        <p>احفظ الأكواد الاثناعشر كرقم تلفون: <b>033 614 625 035</b></p>
        <table class="code-table">
          <tr><th>ك2</th><th>شباط</th><th>آذار</th><th>نيسان</th><th>أيار</th><th>حزيران</th></tr>
          <tr><td>0</td><td>3</td><td>3</td><td>6</td><td>1</td><td>4</td></tr>
        </table>
        <table class="code-table">
          <tr><th>تموز</th><th>آب</th><th>أيلول</th><th>ت1</th><th>ت2</th><th>ك1</th></tr>
          <tr><td>6</td><td>2</td><td>5</td><td>0</td><td>3</td><td>5</td></tr>
        </table>
        <p class="formula-box">استثناء: بالسنة الكبيسة، كانون الثاني وشباط ينزل كودهم 1 (يعني كانون الثاني يصير 6-، وشباط يصير 2).</p>
      </details>
      ${progressBarHtml(2)}
      <div class="question-area" id="qArea"></div>
      <div class="feedback" id="feedback"></div>
      <div class="options-grid" id="optsArea"></div>
      <div class="next-row" id="nextRow"></div>
    </div>`;
  stageContainer.appendChild(wrap);
  askStage2Question();
}

function askStage2Question() {
  const m = 1 + Math.floor(Math.random() * 12);
  const correct = MONTH_CODES[m - 1];
  document.getElementById("qArea").innerHTML = `
    <div class="question-prompt">${MONTH_NAMES[m]}</div>
    <div class="question-sub">شنو كوده؟ (بدون احتساب استثناء الكبيسة)</div>`;
  document.getElementById("feedback").textContent = "";
  document.getElementById("nextRow").innerHTML = "";
  const options = shuffledOptions([0, 1, 2, 3, 4, 5, 6], correct, 4);
  const optsArea = document.getElementById("optsArea");
  optsArea.className = "options-grid";
  optsArea.innerHTML = "";
  options.forEach(val => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.textContent = val;
    btn.addEventListener("click", () => handleStage2Answer(val, correct, btn, optsArea));
    optsArea.appendChild(btn);
  });
}

function handleStage2Answer(chosen, correct, btn, optsArea) {
  [...optsArea.children].forEach(b => b.disabled = true);
  const isCorrect = chosen === correct;
  btn.classList.add(isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    [...optsArea.children].forEach(b => { if (parseInt(b.textContent) === correct) b.classList.add("correct"); });
  }
  const fb = document.getElementById("feedback");
  fb.className = "feedback " + (isCorrect ? "good" : "bad");
  fb.textContent = isCorrect ? "صح!" : `غلط، الجواب ${correct}`;
  const justPassed = registerAnswer(2, isCorrect);
  renderStageBar(2);
  showNext(() => { renderStageBar(2); askStage2Question(); }, justPassed);
}

/* ---------------- المرحلة 3: كود السنة ---------------- */

function buildStage3() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="card">
      <h2>المرحلة 3 — كود السنة</h2>
      <details class="learn-box" ${progress[3].total ? "" : "open"}>
        <summary>الشرح</summary>
        <p class="formula-box">كود السنة = (آخر رقمين + آخر رقمين ÷ 4 بدون كسور) mod 7</p>
        <p>مثال: 1994 → آخر رقمين 94 → 94 ÷ 4 = 23 (بدون كسور) → 94 + 23 = 117 → 117 mod 7 = 5</p>
      </details>
      ${progressBarHtml(3)}
      <div class="question-area" id="qArea"></div>
      <div class="feedback" id="feedback"></div>
      <div class="options-grid" id="optsArea"></div>
      <div class="next-row" id="nextRow"></div>
    </div>`;
  stageContainer.appendChild(wrap);
  askStage3Question();
}

function askStage3Question() {
  const year = 1900 + Math.floor(Math.random() * 200);
  const correct = yearCode(year);
  document.getElementById("qArea").innerHTML = `
    <div class="question-prompt">سنة ${year}</div>
    <div class="question-sub">شنو كودها؟</div>`;
  document.getElementById("feedback").textContent = "";
  document.getElementById("nextRow").innerHTML = "";
  const options = shuffledOptions([0, 1, 2, 3, 4, 5, 6], correct, 4);
  const optsArea = document.getElementById("optsArea");
  optsArea.className = "options-grid";
  optsArea.innerHTML = "";
  options.forEach(val => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.textContent = val;
    btn.addEventListener("click", () => handleStage3Answer(val, correct, year, btn, optsArea));
    optsArea.appendChild(btn);
  });
}

function handleStage3Answer(chosen, correct, year, btn, optsArea) {
  [...optsArea.children].forEach(b => b.disabled = true);
  const isCorrect = chosen === correct;
  btn.classList.add(isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    [...optsArea.children].forEach(b => { if (parseInt(b.textContent) === correct) b.classList.add("correct"); });
  }
  const yy = year % 100;
  const fb = document.getElementById("feedback");
  fb.className = "feedback " + (isCorrect ? "good" : "bad");
  fb.innerHTML = isCorrect
    ? "صح!"
    : `غلط. ${yy} + ${Math.floor(yy/4)} = ${yy + Math.floor(yy/4)} → mod 7 = ${correct}`;
  const justPassed = registerAnswer(3, isCorrect);
  renderStageBar(3);
  showNext(() => { renderStageBar(3); askStage3Question(); }, justPassed);
}

/* ---------------- المرحلة 4: التجميع والقراءة ---------------- */

function buildStage4() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="card">
      <h2>المرحلة 4 — التجميع والقراءة</h2>
      <details class="learn-box" ${progress[4].total ? "" : "open"}>
        <summary>الشرح</summary>
        <p class="formula-box">اليوم = (رقم اليوم + كود الشهر + كود السنة + كود القرن) mod 7. إذا طلعت النتيجة صفر، اقرها 7 (سبت). غير هيچي الرقم نفسه هو رقم اليوم: 1=أحد ... 7=سبت.</p>
      </details>
      ${progressBarHtml(4)}
      <div class="question-area" id="qArea"></div>
      <div class="feedback" id="feedback"></div>
      <div class="options-grid days" id="optsArea"></div>
      <div class="next-row" id="nextRow"></div>
    </div>`;
  stageContainer.appendChild(wrap);
  askStage4Question();
}

function askStage4Question() {
  const day = 1 + Math.floor(Math.random() * 28);
  const mc = MONTH_CODES[Math.floor(Math.random() * 12)];
  const yc = Math.floor(Math.random() * 7);
  const cc = [1, 3, 5, 7][Math.floor(Math.random() * 4)];
  const total = day + mc + yc + cc;
  const mod = ((total % 7) + 7) % 7;
  const correct = mod === 0 ? 7 : mod;
  document.getElementById("qArea").innerHTML = `
    <div class="question-prompt">${day} + ${mc} + ${yc} + ${cc}</div>
    <div class="question-sub">شنو يوم الأسبوع؟</div>`;
  document.getElementById("feedback").textContent = "";
  document.getElementById("nextRow").innerHTML = "";
  const options = shuffledOptions([1, 2, 3, 4, 5, 6, 7], correct, 4);
  const optsArea = document.getElementById("optsArea");
  optsArea.className = "options-grid days";
  optsArea.innerHTML = "";
  options.forEach(val => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.textContent = DAY_NAMES[val];
    btn.addEventListener("click", () => handleStage4Answer(val, correct, total, btn, optsArea));
    optsArea.appendChild(btn);
  });
}

function handleStage4Answer(chosen, correct, total, btn, optsArea) {
  [...optsArea.children].forEach(b => b.disabled = true);
  const isCorrect = chosen === correct;
  btn.classList.add(isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    [...optsArea.children].forEach(b => { if (DAY_NAMES.indexOf(b.textContent) === correct) b.classList.add("correct"); });
  }
  const fb = document.getElementById("feedback");
  fb.className = "feedback " + (isCorrect ? "good" : "bad");
  fb.innerHTML = isCorrect ? "صح!" : `غلط. المجموع ${total}، mod 7 = ${((total%7)+7)%7} → ${DAY_NAMES[correct]}`;
  const justPassed = registerAnswer(4, isCorrect);
  renderStageBar(4);
  showNext(() => { renderStageBar(4); askStage4Question(); }, justPassed);
}

/* ---------------- المرحلة 5: الاختبار الشامل ---------------- */

function buildStage5() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="card">
      <h2>المرحلة 5 — الاختبار الشامل</h2>
      <p>هسه احسب اليوم كامل من الصفر: كود الشهر، كود السنة، كود القرن، الجمع، والقراءة.</p>
      ${progressBarHtml(5)}
      <div class="question-area" id="qArea"></div>
      <div class="feedback" id="feedback"></div>
      <div class="options-grid days" id="optsArea"></div>
      <div class="breakdown" id="breakdown"></div>
      <div class="next-row" id="nextRow"></div>
    </div>`;
  stageContainer.appendChild(wrap);
  askStage5Question();
}

function askStage5Question() {
  const year = 1950 + Math.floor(Math.random() * 150);
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * daysInMonth(month, year));
  const calc = computeWeekday(day, month, year);
  document.getElementById("qArea").innerHTML = `
    <div class="question-prompt">${day} ${MONTH_NAMES[month]} ${year}</div>
    <div class="question-sub">شنو يوم الأسبوع؟</div>`;
  document.getElementById("feedback").textContent = "";
  document.getElementById("nextRow").innerHTML = "";
  document.getElementById("breakdown").className = "breakdown";
  document.getElementById("breakdown").innerHTML = "";
  const options = shuffledOptions([1, 2, 3, 4, 5, 6, 7], calc.result, 4);
  const optsArea = document.getElementById("optsArea");
  optsArea.className = "options-grid days";
  optsArea.innerHTML = "";
  options.forEach(val => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.textContent = DAY_NAMES[val];
    btn.addEventListener("click", () => handleStage5Answer(val, calc, day, month, year, btn, optsArea));
    optsArea.appendChild(btn);
  });
}

function handleStage5Answer(chosen, calc, day, month, year, btn, optsArea) {
  [...optsArea.children].forEach(b => b.disabled = true);
  const isCorrect = chosen === calc.result;
  btn.classList.add(isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    [...optsArea.children].forEach(b => { if (DAY_NAMES.indexOf(b.textContent) === calc.result) b.classList.add("correct"); });
  }
  const fb = document.getElementById("feedback");
  fb.className = "feedback " + (isCorrect ? "good" : "bad");
  fb.textContent = isCorrect ? "صح!" : "غلط، شوف التفصيل تحت";
  const bd = document.getElementById("breakdown");
  bd.className = "breakdown show";
  bd.innerHTML = `
    <div>كود الشهر (مع تعديل الكبيسة إذا يلزم): ${calc.mc}</div>
    <div>كود السنة: ${calc.yc}</div>
    <div>كود القرن: ${calc.cc}</div>
    <div>المجموع: ${day} + ${calc.mc} + ${calc.yc} + ${calc.cc} = ${calc.total}</div>
    <div>mod 7 = ${calc.mod}${calc.mod === 0 ? " → يقرا 7" : ""}</div>
    <div class="final">${day} ${MONTH_NAMES[month]} ${year} = ${DAY_NAMES[calc.result]}</div>
  `;
  registerAnswer(5, isCorrect);
  renderStageBar(5);
  showNext(() => { renderStageBar(5); askStage5Question(); }, false);
}

/* ---------------- أدوات مساعدة ---------------- */

function shuffledOptions(pool, correct, limitCount) {
  let opts;
  if (limitCount && pool.length > limitCount) {
    const others = pool.filter(v => v !== correct);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    opts = [correct, ...others.slice(0, limitCount - 1)];
  } else {
    opts = [...pool];
  }
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

function showNext(callback, justPassed) {
  const row = document.getElementById("nextRow");
  if (justPassed) {
    row.innerHTML = `<div class="pass-banner">نجحت بالمرحلة! فتحت المرحلة الجاية.</div>`;
  }
  const btn = document.createElement("button");
  btn.className = "primary-btn";
  btn.textContent = "السؤال الجاي";
  btn.addEventListener("click", callback);
  row.appendChild(btn);
}

function renderStageBar(n) {
  // يحدث فقط شريط التقدم بدون إعادة رسم كامل الصفحة، ويحدث التبويبات إذا صار نجاح
  renderNav();
  const cardBar = document.querySelector(".card .progress-row");
  if (cardBar) cardBar.outerHTML = progressBarHtml(n);
}

/* ---------------- بداية التشغيل ---------------- */

render();
