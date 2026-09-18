/* مدرب حساب يوم الأسبوع — كود القرن + كود السنة لإيجاد الـ Doomsday،
   وتواريخ شهر ثابتة بدل حفظ 12 كود شهر. + محرك تدريب ذكي: يسجل كل
   جواب مع نوع السؤال ومدة تفكيرك، ويحيّز الأسئلة الجاية نحو نقاط
   ضعفك (غلط متكرر أو بطء)، ويعرضلك تحليل حي بيها. */

const DAY_NAMES = ["", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTH_NAMES = ["", "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
                      "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];

// التاريخ الثابت بكل شهر (يطابق نفس يوم الأسبوع طول السنة). قيم كانون الثاني
// وشباط هنا للسنة غير الكبيسة؛ anchorDayFor تعدلهم للسنة الكبيسة.
const ANCHOR_DAYS = [3, 28, 14, 4, 9, 6, 11, 8, 5, 10, 7, 12]; // index 0 = كانون الثاني

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

// يوم الـ Doomsday لهاي السنة (1=أحد ... 7=سبت). الجمع بثابت 3 ثابت رياضياً
// (نتيجة كل تواريخ ANCHOR_DAYS تطابق بعضها)، ما يحتاج حفظ.
function doomsdayOfYear(year) {
  const yc = yearCode(year);
  const cc = centuryCode(year);
  const total = yc + cc + 3;
  const mod = ((total % 7) + 7) % 7;
  return { result: mod === 0 ? 7 : mod, yc, cc, total, mod };
}

function anchorDayFor(month, year) {
  let a = ANCHOR_DAYS[month - 1];
  if (isLeap(year)) {
    if (month === 1) a = 4;
    if (month === 2) a = 29;
  }
  return a;
}

// يزيد/ينقص عدد أيام عن يوم أسبوع معروف (1=أحد ... 7=سبت)، بلف صحيح بأي اتجاه.
function addDaysToWeekday(weekday1to7, diffDays) {
  const base0 = weekday1to7 - 1;
  let m = (base0 + diffDays) % 7;
  if (m < 0) m += 7;
  return m + 1;
}

function computeWeekday(day, month, year) {
  const dd = doomsdayOfYear(year);
  const anchor = anchorDayFor(month, year);
  const diff = day - anchor;
  const result = addDaysToWeekday(dd.result, diff);
  return { result, yc: dd.yc, cc: dd.cc, doomsday: dd.result, anchor, diff };
}

function diffBucket(diff) {
  const a = Math.abs(diff);
  if (a <= 6) return "قصير";
  if (a <= 13) return "متوسط";
  return "طويل";
}
function diffDir(diff) { return diff >= 0 ? "لقدام" : "لخلف"; }

/* ---------------- تخزين التقدم ---------------- */

const STORAGE_KEY = "ddtrainer_progress_v2"; // v2: تغيرت طريقة الحساب من كودات الشهر إلى تواريخ ثابتة
const THRESHOLD = { 1: 6, 2: 8, 3: 10, 4: 8, 5: null };

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

/* ---------------- محرك التدريب الذكي (تحليل + اختيار وزين للأسئلة) ---------------- */

const INSIGHTS_KEY = "ddtrainer_insights_v1";

function loadInsights() {
  try {
    const raw = localStorage.getItem(INSIGHTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { tagStats: {}, stageTime: {}, history: [] };
}
let insights = loadInsights();
function saveInsights() {
  try { localStorage.setItem(INSIGHTS_KEY, JSON.stringify(insights)); } catch (e) {}
}

// وزن "ضعف" هالوسم: كلما أعلى، كلما نحتاج نكرره عليك أكثر.
// وسم ما جربته قبل ياخذ أولوية متوسطة (حتى يتوازن التعرض على كل الأنواع)،
// ووسم بأغلاط أو بطء متكرر ياخذ أولوية أعلى.
function tagWeight(tag) {
  const s = insights.tagStats[tag];
  if (!s || s.attempts === 0) return 0.55;
  const wrongRate = s.wrong / s.attempts;
  const slowRate = s.slow / s.attempts;
  let w = wrongRate * 2.3 + slowRate * 1.1;
  if (s.attempts < 3) w += 0.35;
  return w;
}

function scoreCandidate(tags) {
  return tags.reduce((sum, t) => sum + tagWeight(t), 0) + Math.random() * 0.4;
}

// يولد عدة مرشحين عشوائيين ويختار الأنسب لتدريبك (مع نسبة عشوائية بسيطة
// حتى ما يظل يكرر نفس الشي بس ويحافظ على التنوع).
function pickBestCandidate(genFn, k) {
  k = k || 5;
  const candidates = [];
  for (let i = 0; i < k; i++) candidates.push(genFn());
  if (Math.random() < 0.25) return candidates[Math.floor(Math.random() * candidates.length)];
  candidates.sort((a, b) => scoreCandidate(b.tags) - scoreCandidate(a.tags));
  return candidates[0];
}

// يسجل نتيجة سؤال وحد: صح/غلط، وقته، ووسومه (نوع السنة/الشهر/فرق الأيام...).
// يرجع true إذا الجواب كان بطيء نسبة لمتوسط وقتك بهالمرحلة.
function recordAttempt(stageNum, tags, correct, timeMs, label) {
  const st = insights.stageTime[stageNum] || (insights.stageTime[stageNum] = { avgMs: timeMs, count: 0 });
  const isSlow = st.count >= 3 && timeMs > st.avgMs * 1.6 && timeMs > 4000;
  st.avgMs = st.count === 0 ? timeMs : st.avgMs * 0.85 + timeMs * 0.15;
  st.count += 1;

  tags.forEach(tag => {
    if (!insights.tagStats[tag]) insights.tagStats[tag] = { attempts: 0, wrong: 0, slow: 0 };
    const s = insights.tagStats[tag];
    s.attempts += 1;
    if (!correct) s.wrong += 1;
    if (isSlow) s.slow += 1;
  });

  insights.history.unshift({ stage: stageNum, tags, correct, slow: isSlow, timeMs, label, ts: Date.now() });
  if (insights.history.length > 300) insights.history.length = 300;
  saveInsights();
  return isSlow;
}

function topWeakTags(limit) {
  return Object.entries(insights.tagStats)
    .map(([tag, s]) => ({
      tag, attempts: s.attempts,
      wrongRate: s.wrong / s.attempts,
      slowRate: s.slow / s.attempts,
      score: (s.wrong / s.attempts) * 2.3 + (s.slow / s.attempts) * 1.1,
    }))
    .filter(x => x.attempts >= 3 && x.score > 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit || 4);
}

function tagLabel(tag) {
  const idx = tag.indexOf(":");
  const kind = tag.slice(0, idx), val = tag.slice(idx + 1);
  if (kind === "century") return `قرن ${val}`;
  if (kind === "decade") return `عقد ${val}`;
  if (kind === "leap") return val;
  if (kind === "month") return `شهر ${val}`;
  if (kind === "diffMag") return `فرق أيام ${val}`;
  if (kind === "diffDir") return `عد ${val}`;
  return tag;
}

// وصف قصير لسبب اعتبار هالوسم نقطة ضعف: غلط، بطء، أو الاثنين.
function weakTagNote(w) {
  const wrongPct = Math.round(w.wrongRate * 100);
  const isSlow = w.slowRate > 0.34;
  if (wrongPct > 0 && isSlow) return `${wrongPct}% غلط، وبطيء`;
  if (wrongPct > 0) return `${wrongPct}% غلط`;
  if (isSlow) return "بطيء رغم إنه صح";
  return `${wrongPct}% غلط`;
}

// يحدث لوحة "تحليل الأداء" الظاهرة بكل المراحل. يتحدث حي بعد كل جواب.
function renderInsights() {
  const el = document.getElementById("insightsPanel");
  if (!el) return;
  const total = insights.history.length;
  if (total < 5) {
    el.innerHTML = `
      <details class="learn-box insights-box">
        <summary>📊 تحليل الأداء</summary>
        <p>جاوب على كم سؤال وراح يبدا يطلعلك وين تحتاج تركيز، ويكرر عليك نقاط ضعفك تلقائياً بالأسئلة الجاية.</p>
      </details>`;
    return;
  }
  const correctCount = insights.history.filter(h => h.correct).length;
  const pct = Math.round(100 * correctCount / total);
  const weak = topWeakTags(4);
  const recentWrong = insights.history.filter(h => !h.correct).slice(0, 4);
  const stageTimeLine = [1, 2, 3, 4, 5]
    .filter(n => insights.stageTime[n] && insights.stageTime[n].count >= 2)
    .map(n => `${STAGE_TITLES[n]}: ${(insights.stageTime[n].avgMs / 1000).toFixed(1)}ث`)
    .join(" · ");

  el.innerHTML = `
    <details class="learn-box insights-box" ${el.querySelector("details") && el.querySelector("details").open ? "open" : ""}>
      <summary>📊 تحليل الأداء — ${pct}% صح من آخر ${total} سؤال</summary>
      ${weak.length
        ? `<p><b>وين تحتاج تركيز:</b> ${weak.map(w => `${tagLabel(w.tag)} <span class="tag-pct">(${weakTagNote(w)})</span>`).join("، ")}. راح يكررهم عليك أكثر بالأسئلة الجاية.</p>`
        : `<p>ما اكو نقطة ضعف واضحة هسه، مستواك متوازن.</p>`}
      ${recentWrong.length ? `<p><b>آخر أغلاط:</b> ${recentWrong.map(h => h.label).join("، ")}</p>` : ""}
      ${stageTimeLine ? `<p><b>متوسط وقتك بكل مرحلة:</b> ${stageTimeLine}</p>` : ""}
    </details>`;
}

/* ---------------- واجهة عامة ---------------- */

const stageNav = document.getElementById("stageNav");
const stageContainer = document.getElementById("stageContainer");

const STAGE_TITLES = {
  1: "كودات القرن",
  2: "السنة والـ Doomsday",
  3: "تواريخ الشهر الثابتة",
  4: "العد للتاريخ المطلوب",
  5: "الاختبار الشامل",
};

function renderNav(scrollToActive) {
  stageNav.innerHTML = "";
  for (let n = 1; n <= 5; n++) {
    const tab = document.createElement("div");
    const unlocked = stageUnlocked(n);
    const passed = progress[n] && progress[n].passed;
    tab.className = "stage-tab" +
      (n === currentStage ? " active" : "") +
      (passed ? " passed" : "") +
      (!unlocked ? " locked" : "");
    const badge = !unlocked ? "🔒" : (passed ? "✓" : n);
    tab.innerHTML = `<span class="num">${badge}</span>${STAGE_TITLES[n]}`;
    if (unlocked) {
      tab.addEventListener("click", () => { currentStage = n; render(); });
    }
    stageNav.appendChild(tab);
    if (scrollToActive && n === currentStage) {
      // إذا الشريط يسكرول أفقي (شاشة متوسطة)، خلي التبويبة الفعالة بنص المجال المرئي.
      // ينحسب فقط لما نبدل مرحلة فعلياً، مو بكل سؤال، حتى ما تنقفز الصفحة لفوك.
      tab.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }
}

function render() {
  renderNav(true);
  renderInsights();
  stageContainer.innerHTML = "";
  if (!stageUnlocked(currentStage)) {
    stageContainer.innerHTML = `<div class="lock-msg">هاي المرحلة مقفلة. خلّص المرحلة الي قبلها أول.</div>`;
    return;
  }
  const builders = { 1: buildStage1, 2: buildStage2, 3: buildStage3, 4: buildStage4, 5: buildStage5 };
  builders[currentStage]();
}

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("تصفير التقدم وتحليل الأداء بكل المراحل؟")) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(INSIGHTS_KEY);
  progress = loadProgress();
  insights = loadInsights();
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

// وقت عرض السؤال الحالي، ووسومه/تسميته لأجل السجل الذكي. عنصر وحيد لأنه
// دايماً سؤال وحد ظاهر بنفس اللحظة.
let questionStartedAt = 0;
let currentMeta = { tags: [], label: "" };

function feedbackText(isCorrect, isSlow, wrongText) {
  if (!isCorrect) return `✕ ${wrongText}`;
  return isSlow ? "✓ صح! (بس جاوبت بطيء شوي — حاول تسرّع)" : "✓ صح!";
}
function feedbackClass(isCorrect, isSlow) {
  if (!isCorrect) return "bad";
  return isSlow ? "slow" : "good";
}

/* ---------------- المرحلة 1: كودات القرن ---------------- */

const CENTURIES = [1600, 1700, 1800, 1900, 2000, 2100];

function genStage1Candidate() {
  const century = CENTURIES[Math.floor(Math.random() * CENTURIES.length)];
  return { century, tags: [`century:${century}`], label: `قرن ${century}` };
}

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
  const c = pickBestCandidate(genStage1Candidate, 5);
  const correct = centuryCode(c.century);
  currentMeta = { tags: c.tags, label: c.label };
  document.getElementById("qArea").innerHTML = `
    <div class="question-prompt">قرن ${c.century}</div>
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
    btn.addEventListener("click", () => preserveScroll(() => handleStage1Answer(val, correct, btn, optsArea)));
    optsArea.appendChild(btn);
  });
  questionStartedAt = performance.now();
}

function handleStage1Answer(chosen, correct, btn, optsArea) {
  [...optsArea.children].forEach(b => b.disabled = true);
  const isCorrect = chosen === correct;
  btn.classList.add(isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    [...optsArea.children].forEach(b => { if (parseInt(b.textContent) === correct) b.classList.add("correct"); });
  }
  const timeMs = performance.now() - questionStartedAt;
  const isSlow = recordAttempt(1, currentMeta.tags, isCorrect, timeMs, currentMeta.label);
  const fb = document.getElementById("feedback");
  fb.className = "feedback " + feedbackClass(isCorrect, isSlow);
  fb.textContent = feedbackText(isCorrect, isSlow, `غلط، الجواب ${correct}`);
  const justPassed = registerAnswer(1, isCorrect);
  renderStageBar(1);
  showNext(() => { renderStageBar(1); askStage1Question(); }, justPassed);
}

/* ---------------- المرحلة 2: السنة والـ Doomsday ---------------- */

function genStage2Candidate() {
  const year = 1900 + Math.floor(Math.random() * 200);
  const century = Math.floor(year / 100) * 100;
  const decade = Math.floor(year / 10) * 10;
  return { year, tags: [`century:${century}`, `decade:${decade}s`], label: `سنة ${year}` };
}

function buildStage2() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="card">
      <h2>المرحلة 2 — السنة والـ Doomsday</h2>
      <details class="learn-box" ${progress[2].total ? "" : "open"}>
        <summary>الشرح</summary>
        <p class="formula-box">كود السنة = (آخر رقمين + آخر رقمين ÷ 4 بدون كسور) mod 7</p>
        <p>مثال: 1994 → آخر رقمين 94 → 94 ÷ 4 = 23 (بدون كسور) → 94 + 23 = 117 → 117 mod 7 = 5</p>
        <p class="formula-box">الـ Doomsday (يوم الأسبوع الي تطابقه كل التواريخ الثابتة بالمرحلة الجاية) = (كود السنة + كود القرن + 3) mod 7، وإذا طلعت صفر اقرها 7 (سبت).</p>
        <p>مثال: سنة 1994 → كود القرن 1 → 5 + 1 + 3 = 9 → mod 7 = 2 → الاثنين.</p>
      </details>
      ${progressBarHtml(2)}
      <div class="question-area" id="qArea"></div>
      <div class="feedback" id="feedback"></div>
      <div class="options-grid days" id="optsArea"></div>
      <div class="next-row" id="nextRow"></div>
    </div>`;
  stageContainer.appendChild(wrap);
  askStage2Question();
}

function askStage2Question() {
  const c = pickBestCandidate(genStage2Candidate, 5);
  const dd = doomsdayOfYear(c.year);
  currentMeta = { tags: c.tags, label: c.label };
  document.getElementById("qArea").innerHTML = `
    <div class="question-prompt">سنة ${c.year}</div>
    <div class="question-sub">شنو يوم الـ Doomsday لهاي السنة؟</div>`;
  document.getElementById("feedback").textContent = "";
  document.getElementById("nextRow").innerHTML = "";
  const options = shuffledOptions([1, 2, 3, 4, 5, 6, 7], dd.result, 4);
  const optsArea = document.getElementById("optsArea");
  optsArea.className = "options-grid days";
  optsArea.innerHTML = "";
  options.forEach(val => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.textContent = DAY_NAMES[val];
    btn.addEventListener("click", () => preserveScroll(() => handleStage2Answer(val, dd, c.year, btn, optsArea)));
    optsArea.appendChild(btn);
  });
  questionStartedAt = performance.now();
}

function handleStage2Answer(chosen, dd, year, btn, optsArea) {
  [...optsArea.children].forEach(b => b.disabled = true);
  const isCorrect = chosen === dd.result;
  btn.classList.add(isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    [...optsArea.children].forEach(b => { if (DAY_NAMES.indexOf(b.textContent) === dd.result) b.classList.add("correct"); });
  }
  const yy = year % 100;
  const timeMs = performance.now() - questionStartedAt;
  const isSlow = recordAttempt(2, currentMeta.tags, isCorrect, timeMs, currentMeta.label);
  const fb = document.getElementById("feedback");
  fb.className = "feedback " + feedbackClass(isCorrect, isSlow);
  fb.innerHTML = feedbackText(isCorrect, isSlow,
    `غلط. كود السنة ${yy}+${Math.floor(yy/4)}=${dd.yc} (mod7)، كود القرن ${dd.cc}، ${dd.yc}+${dd.cc}+3=${dd.total} → mod 7 = ${dd.mod === 0 ? "7" : dd.mod} → ${DAY_NAMES[dd.result]}`);
  const justPassed = registerAnswer(2, isCorrect);
  renderStageBar(2);
  showNext(() => { renderStageBar(2); askStage2Question(); }, justPassed);
}

/* ---------------- المرحلة 3: تواريخ الشهر الثابتة ---------------- */

function genStage3Candidate() {
  const m = 1 + Math.floor(Math.random() * 12);
  return { month: m, tags: [`month:${MONTH_NAMES[m]}`], label: MONTH_NAMES[m] };
}

function buildStage3() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="card">
      <h2>المرحلة 3 — تواريخ الشهر الثابتة</h2>
      <details class="learn-box" ${progress[3].total ? "" : "open"}>
        <summary>الشرح</summary>
        <p>كل شهر إله تاريخ وحد يطابق نفس يوم الـ Doomsday طول السنة:</p>
        <p class="formula-box">
          الأزواج المتطابقة: <b>4/4، 6/6، 8/8، 10/10، 12/12</b><br>
          "I work 9 to 5 at 7-Eleven": <b>9/5، 5/9، 11/7، 7/11</b><br>
          آذار: <b>14/3</b> (يوم الباي) &middot; شباط: <b>آخر يوم بيه</b> (28، أو 29 بالكبيسة) &middot; كانون الثاني: <b>3</b> (أو 4 بالكبيسة)
        </p>
        <table class="code-table">
          <tr><th>ك2</th><th>شباط</th><th>آذار</th><th>نيسان</th><th>أيار</th><th>حزيران</th></tr>
          <tr><td>3</td><td>28</td><td>14</td><td>4</td><td>9</td><td>6</td></tr>
        </table>
        <table class="code-table">
          <tr><th>تموز</th><th>آب</th><th>أيلول</th><th>ت1</th><th>ت2</th><th>ك1</th></tr>
          <tr><td>11</td><td>8</td><td>5</td><td>10</td><td>7</td><td>12</td></tr>
        </table>
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
  const c = pickBestCandidate(genStage3Candidate, 5);
  const correct = ANCHOR_DAYS[c.month - 1];
  currentMeta = { tags: c.tags, label: c.label };
  document.getElementById("qArea").innerHTML = `
    <div class="question-prompt">${MONTH_NAMES[c.month]}</div>
    <div class="question-sub">شنو تاريخه الثابت؟ (بدون احتساب استثناء الكبيسة)</div>`;
  document.getElementById("feedback").textContent = "";
  document.getElementById("nextRow").innerHTML = "";
  const pool = [...new Set(ANCHOR_DAYS)];
  const options = shuffledOptions(pool, correct, 4);
  const optsArea = document.getElementById("optsArea");
  optsArea.className = "options-grid";
  optsArea.innerHTML = "";
  options.forEach(val => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.textContent = val;
    btn.addEventListener("click", () => preserveScroll(() => handleStage3Answer(val, correct, btn, optsArea)));
    optsArea.appendChild(btn);
  });
  questionStartedAt = performance.now();
}

function handleStage3Answer(chosen, correct, btn, optsArea) {
  [...optsArea.children].forEach(b => b.disabled = true);
  const isCorrect = chosen === correct;
  btn.classList.add(isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    [...optsArea.children].forEach(b => { if (parseInt(b.textContent) === correct) b.classList.add("correct"); });
  }
  const timeMs = performance.now() - questionStartedAt;
  const isSlow = recordAttempt(3, currentMeta.tags, isCorrect, timeMs, currentMeta.label);
  const fb = document.getElementById("feedback");
  fb.className = "feedback " + feedbackClass(isCorrect, isSlow);
  fb.textContent = feedbackText(isCorrect, isSlow, `غلط، الجواب ${correct}`);
  const justPassed = registerAnswer(3, isCorrect);
  renderStageBar(3);
  showNext(() => { renderStageBar(3); askStage3Question(); }, justPassed);
}

/* ---------------- المرحلة 4: العد للتاريخ المطلوب ---------------- */

function genStage4Candidate() {
  // نتجنب كانون الثاني وشباط هالمرحلة (استثناء الكبيسة) ونركز بس على ميكانيكية العد.
  const month = 3 + Math.floor(Math.random() * 10);
  const anchor = ANCHOR_DAYS[month - 1];
  const doomsday = 1 + Math.floor(Math.random() * 7);
  const day = 1 + Math.floor(Math.random() * daysInMonth(month, 2023));
  const diff = day - anchor;
  return {
    month, anchor, doomsday, day, diff,
    tags: [`month:${MONTH_NAMES[month]}`, `diffMag:${diffBucket(diff)}`, `diffDir:${diffDir(diff)}`],
    label: `${day} ${MONTH_NAMES[month]} (Doomsday ${DAY_NAMES[doomsday]})`,
  };
}

function buildStage4() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="card">
      <h2>المرحلة 4 — العد للتاريخ المطلوب</h2>
      <details class="learn-box" ${progress[4].total ? "" : "open"}>
        <summary>الشرح</summary>
        <p class="formula-box">يوم التاريخ المطلوب = يوم الـ Doomsday + (رقم اليوم − التاريخ الثابت لنفس الشهر)، وتعد لقدام أو لخلف على عجلة الأيام.</p>
        <p>مثال: Doomsday = الجمعة، أيلول ثابته 5، والمطلوب 18 أيلول. 18 − 5 = 13 يوم = أسبوع و6 أيام. الجمعة + 6 = الخميس.</p>
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
  const c = pickBestCandidate(genStage4Candidate, 5);
  const correct = addDaysToWeekday(c.doomsday, c.diff);
  currentMeta = { tags: c.tags, label: c.label };
  document.getElementById("qArea").innerHTML = `
    <div class="question-prompt">Doomsday = ${DAY_NAMES[c.doomsday]}، ثابت ${MONTH_NAMES[c.month]} = ${c.anchor}</div>
    <div class="question-sub">شنو يوم ${c.day} ${MONTH_NAMES[c.month]}؟</div>`;
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
    btn.addEventListener("click", () => preserveScroll(() => handleStage4Answer(val, correct, c.day, c.anchor, c.diff, btn, optsArea)));
    optsArea.appendChild(btn);
  });
  questionStartedAt = performance.now();
}

function handleStage4Answer(chosen, correct, day, anchor, diff, btn, optsArea) {
  [...optsArea.children].forEach(b => b.disabled = true);
  const isCorrect = chosen === correct;
  btn.classList.add(isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    [...optsArea.children].forEach(b => { if (DAY_NAMES.indexOf(b.textContent) === correct) b.classList.add("correct"); });
  }
  const timeMs = performance.now() - questionStartedAt;
  const isSlow = recordAttempt(4, currentMeta.tags, isCorrect, timeMs, currentMeta.label);
  const fb = document.getElementById("feedback");
  fb.className = "feedback " + feedbackClass(isCorrect, isSlow);
  fb.innerHTML = feedbackText(isCorrect, isSlow, `غلط. ${day} − ${anchor} = ${diff} يوم عن الـ Doomsday → ${DAY_NAMES[correct]}`);
  const justPassed = registerAnswer(4, isCorrect);
  renderStageBar(4);
  showNext(() => { renderStageBar(4); askStage4Question(); }, justPassed);
}

/* ---------------- المرحلة 5: الاختبار الشامل ---------------- */

function genStage5Candidate() {
  const year = 1950 + Math.floor(Math.random() * 150);
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * daysInMonth(month, year));
  const calc = computeWeekday(day, month, year);
  const century = Math.floor(year / 100) * 100;
  const decade = Math.floor(year / 10) * 10;
  return {
    day, month, year, calc,
    tags: [
      `century:${century}`, `decade:${decade}s`, `leap:${isLeap(year) ? "كبيسة" : "عادية"}`,
      `month:${MONTH_NAMES[month]}`, `diffMag:${diffBucket(calc.diff)}`, `diffDir:${diffDir(calc.diff)}`,
    ],
    label: `${day} ${MONTH_NAMES[month]} ${year}`,
  };
}

function buildStage5() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="card">
      <h2>المرحلة 5 — الاختبار الشامل</h2>
      <p>هسه احسب اليوم كامل من الصفر: كود السنة والقرن، الـ Doomsday، التاريخ الثابت للشهر، والعد للتاريخ المطلوب.</p>
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
  const c = pickBestCandidate(genStage5Candidate, 6);
  currentMeta = { tags: c.tags, label: c.label };
  document.getElementById("qArea").innerHTML = `
    <div class="question-prompt">${c.day} ${MONTH_NAMES[c.month]} ${c.year}</div>
    <div class="question-sub">شنو يوم الأسبوع؟</div>`;
  document.getElementById("feedback").textContent = "";
  document.getElementById("nextRow").innerHTML = "";
  document.getElementById("breakdown").className = "breakdown";
  document.getElementById("breakdown").innerHTML = "";
  const options = shuffledOptions([1, 2, 3, 4, 5, 6, 7], c.calc.result, 4);
  const optsArea = document.getElementById("optsArea");
  optsArea.className = "options-grid days";
  optsArea.innerHTML = "";
  options.forEach(val => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.textContent = DAY_NAMES[val];
    btn.addEventListener("click", () => preserveScroll(() => handleStage5Answer(val, c.calc, c.day, c.month, c.year, btn, optsArea)));
    optsArea.appendChild(btn);
  });
  questionStartedAt = performance.now();
}

function handleStage5Answer(chosen, calc, day, month, year, btn, optsArea) {
  [...optsArea.children].forEach(b => b.disabled = true);
  const isCorrect = chosen === calc.result;
  btn.classList.add(isCorrect ? "correct" : "wrong");
  if (!isCorrect) {
    [...optsArea.children].forEach(b => { if (DAY_NAMES.indexOf(b.textContent) === calc.result) b.classList.add("correct"); });
  }
  const timeMs = performance.now() - questionStartedAt;
  const isSlow = recordAttempt(5, currentMeta.tags, isCorrect, timeMs, currentMeta.label);
  const fb = document.getElementById("feedback");
  fb.className = "feedback " + feedbackClass(isCorrect, isSlow);
  fb.textContent = feedbackText(isCorrect, isSlow, "غلط، شوف التفصيل تحت");
  const bd = document.getElementById("breakdown");
  bd.className = "breakdown show";
  bd.innerHTML = `
    <div>كود السنة: ${calc.yc} &middot; كود القرن: ${calc.cc} &middot; ${isLeap(year) ? "سنة كبيسة" : "سنة عادية"}</div>
    <div>الـ Doomsday: ${calc.yc} + ${calc.cc} + 3 → mod 7 = ${DAY_NAMES[calc.doomsday]}</div>
    <div>التاريخ الثابت بـ${MONTH_NAMES[month]}: ${calc.anchor}</div>
    <div>الفرق: ${day} − ${calc.anchor} = ${calc.diff}</div>
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
    if (!opts.includes(correct)) opts.push(correct);
  }
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

// بعض المتصفحات ترجع السكرول لفوك تلقائياً لما عنصر متركز عليه يصير disabled
// أو ينحذف من الصفحة (مثل زر الجواب أو زر "السؤال الجاي"). هاي تحفظ مكان
// السكرول قبل التغيير وترجعه بعد ما المتصفح يخلص أي تصحيح تلقائي إله.
function preserveScroll(fn) {
  const y = window.scrollY;
  fn();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
    });
  });
}

function showNext(callback, justPassed) {
  const row = document.getElementById("nextRow");
  if (justPassed) {
    row.innerHTML = `<div class="pass-banner">نجحت بالمرحلة! فتحت المرحلة الجاية.</div>`;
  }
  const btn = document.createElement("button");
  btn.className = "primary-btn";
  btn.textContent = "السؤال الجاي";
  btn.addEventListener("click", () => preserveScroll(callback));
  row.appendChild(btn);
}

function renderStageBar(n) {
  // يحدث فقط شريط التقدم ولوحة التحليل بدون إعادة رسم كامل الصفحة، ويحدث التبويبات إذا صار نجاح
  renderNav();
  renderInsights();
  const cardBar = document.querySelector(".card .progress-row");
  if (cardBar) cardBar.outerHTML = progressBarHtml(n);
}

/* ---------------- بداية التشغيل ---------------- */

render();
