/* ===== Spelling Fun: game logic ===== */

// ---------- 1. WORD LIST (edit me! add words here) ----------
const words = [
  // Easy (2-3 letters)
  { word: "cat", category: "Animals", image: "🐱", difficulty: "easy" },
  { word: "dog", category: "Animals", image: "🐶", difficulty: "easy" },
  { word: "cow", category: "Animals", image: "🐮", difficulty: "easy" },
  { word: "pig", category: "Animals", image: "🐷", difficulty: "easy" },
  { word: "egg", category: "Food", image: "🥚", difficulty: "easy" },
  { word: "bed", category: "Things at Home", image: "🛏️", difficulty: "easy" },
  { word: "cup", category: "Things at Home", image: "☕", difficulty: "easy" },
  { word: "key", category: "Things at Home", image: "🔑", difficulty: "easy" },
  { word: "sun", category: "Nature", image: "☀️", difficulty: "easy" },
  { word: "pen", category: "School", image: "🖊️", difficulty: "easy" },
  { word: "bag", category: "School", image: "🎒", difficulty: "easy" },
  { word: "bus", category: "School", image: "🚌", difficulty: "easy" },
  { word: "hat", category: "Things to Wear", image: "🎩", difficulty: "easy" },
  { word: "map", category: "School", image: "🗺️", difficulty: "easy" },
  // Medium (4-5 letters)
  { word: "fish", category: "Animals", image: "🐟", difficulty: "medium" },
  { word: "bird", category: "Animals", image: "🐦", difficulty: "medium" },
  { word: "cake", category: "Food", image: "🍰", difficulty: "medium" },
  { word: "milk", category: "Food", image: "🥛", difficulty: "medium" },
  { word: "rice", category: "Food", image: "🍚", difficulty: "medium" },
  { word: "apple", category: "Food", image: "🍎", difficulty: "medium" },
  { word: "door", category: "Things at Home", image: "🚪", difficulty: "medium" },
  { word: "chair", category: "Things at Home", image: "🪑", difficulty: "medium" },
  { word: "book", category: "School", image: "📖", difficulty: "medium" },
  { word: "desk", category: "School", image: "🪧", difficulty: "medium" },
  { word: "tree", category: "Nature", image: "🌳", difficulty: "medium" },
  { word: "rain", category: "Nature", image: "🌧️", difficulty: "medium" },
  { word: "moon", category: "Nature", image: "🌙", difficulty: "medium" },
  { word: "star", category: "Nature", image: "⭐", difficulty: "medium" },
  { word: "table", category: "Things at Home", image: "🍽️", difficulty: "medium" },
  // Challenge (5-7 letters)
  { word: "school", category: "School", image: "🏫", difficulty: "challenge" },
  { word: "flower", category: "Nature", image: "🌸", difficulty: "challenge" },
  { word: "pencil", category: "School", image: "✏️", difficulty: "challenge" },
  { word: "rabbit", category: "Animals", image: "🐰", difficulty: "challenge" },
  { word: "orange", category: "Food", image: "🍊", difficulty: "challenge" },
  { word: "banana", category: "Food", image: "🍌", difficulty: "challenge" },
  { word: "cheese", category: "Food", image: "🧀", difficulty: "challenge" },
  { word: "window", category: "Things at Home", image: "🪟", difficulty: "challenge" },
  { word: "garden", category: "Nature", image: "🌷", difficulty: "challenge" },
  { word: "rocket", category: "Fun", image: "🚀", difficulty: "challenge" },
  { word: "turtle", category: "Animals", image: "🐢", difficulty: "challenge" },
  { word: "monkey", category: "Animals", image: "🐵", difficulty: "challenge" }
];

const QUESTIONS_PER_GAME = 10;
const POINTS_CORRECT = 10, POINTS_HINT = 2;

// ---------- 2. GAME STATE ----------
let level = "easy";
let questions = [];      // the 10 words for this game
let current = 0;         // question index
let score = 0, correctCount = 0, streak = 0, bestStreak = 0, hintsUsed = 0;
let letters = [];        // tile letters for this question
let answer = [];         // tile indexes the child has picked
let locked = 0;          // how many boxes are locked by a hint
let hintUsed = false, busy = false;

const $ = (id) => document.getElementById(id);

// ---------- 3. HELPERS ----------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function showScreen(id) {
  ["startScreen", "gameScreen", "endScreen"].forEach((s) => $(s).classList.toggle("hidden", s !== id));
}
function getBest() { try { return Number(localStorage.getItem("spellingBest")) || 0; } catch (e) { return 0; } }
function setBest(n) { try { localStorage.setItem("spellingBest", n); } catch (e) {} }

// ---------- 4. SOUND (Web Audio + Speech) ----------
let audioCtx;
function beep(freq, start, dur, type) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    const t = audioCtx.currentTime + start;
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + dur);
  } catch (e) { /* sound is optional */ }
}
const soundCorrect = () => [523, 659, 784, 1047].forEach((f, i) => beep(f, i * 0.1, 0.25));
const soundWrong = () => { beep(300, 0, 0.2, "triangle"); beep(220, 0.2, 0.3, "triangle"); };
const soundDone = () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => beep(f, i * 0.15, 0.3));

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = 0.8; u.pitch = 1.1;
  window.speechSynthesis.speak(u);
}

// ---------- 5. CONFETTI ----------
function confetti() {
  const colors = ["#ff5d8f", "#ffc933", "#3ec96b", "#3b9cff", "#8e7dff"];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 1.5 + Math.random() * 1.5 + "s";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3200);
  }
}

// ---------- 6. GAME FLOW ----------
function startGame() {
  const pool = words.filter((w) => w.difficulty === level);
  questions = shuffle(pool).slice(0, QUESTIONS_PER_GAME);
  current = 0; score = 0; correctCount = 0; streak = 0; bestStreak = 0; hintsUsed = 0;
  $("qTotal").textContent = questions.length;
  showScreen("gameScreen");
  loadQuestion();
}

function loadQuestion() {
  const q = questions[current];
  answer = []; locked = 0; hintUsed = false; busy = false;

  // Tiles = the word's letters + a few random extra letters, all shuffled
  const extra = Math.max(3, 6 - q.word.length);
  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("").filter((l) => !q.word.includes(l));
  letters = shuffle([...q.word.split(""), ...shuffle(alphabet).slice(0, extra)]);

  $("picture").textContent = q.image;
  $("category").textContent = q.category;
  $("message").textContent = ""; $("message").className = "message";
  $("hintBtn").disabled = false; $("checkBtn").disabled = false; $("clearBtn").disabled = false;
  updateHeader();
  render();
  setTimeout(() => speak(q.word), 400);
}

function updateHeader() {
  $("score").textContent = score;
  $("streak").textContent = streak;
  $("qNum").textContent = current + 1;
  $("progressBar").style.width = (current / questions.length) * 100 + "%";
}

// Draw the answer boxes and the letter tiles
function render() {
  const word = questions[current].word;
  const boxes = $("boxes"), tiles = $("tiles");
  boxes.innerHTML = ""; tiles.innerHTML = "";

  for (let i = 0; i < word.length; i++) {
    const b = document.createElement("button");
    b.className = "box";
    b.setAttribute("aria-label", "Letter box " + (i + 1));
    if (i < answer.length) {
      b.textContent = letters[answer[i]];
      b.classList.add("filled");
      if (i < locked) b.classList.add("locked");
      else b.onclick = () => removeLetter(i);   // tap a letter to take it back
    }
    boxes.appendChild(b);
  }
  letters.forEach((l, idx) => {
    const t = document.createElement("button");
    t.className = "tile"; t.textContent = l;
    t.disabled = answer.includes(idx);
    t.onclick = () => addLetter(idx);
    tiles.appendChild(t);
  });
}

function addLetter(idx) {
  if (busy || answer.length >= questions[current].word.length) return;
  answer.push(idx);
  beep(600 + answer.length * 60, 0, 0.1);
  render();
}
function removeLetter(pos) {
  if (busy) return;
  answer.splice(pos, 1);
  render();
}
function clearAnswer() {
  if (busy) return;
  answer = answer.slice(0, locked);
  setMessage("", "");
  render();
}

function setMessage(html, cls) {
  $("message").innerHTML = html;
  $("message").className = "message " + cls;
}

// HINT: reveals the first letter, costs 2 points (once per question)
function useHint() {
  if (busy || hintUsed) return;
  const first = questions[current].word[0];
  const idx = letters.findIndex((l) => l === first);
  answer = [idx]; locked = 1; hintUsed = true; hintsUsed++;
  score = Math.max(0, score - POINTS_HINT);
  $("hintBtn").disabled = true;
  updateHeader();
  setMessage("💡 The first letter is <b>" + first.toUpperCase() + "</b>!", "");
  render();
}

function checkAnswer() {
  if (busy) return;
  const word = questions[current].word;
  if (answer.length < word.length) { setMessage("Fill all the boxes first! 📦", "bad"); return; }

  const guess = answer.map((i) => letters[i]).join("");
  const boxEls = document.querySelectorAll(".box");

  if (guess === word) {
    busy = true;
    score += POINTS_CORRECT; correctCount++; streak++;
    bestStreak = Math.max(bestStreak, streak);
    boxEls.forEach((b) => b.classList.add("good"));
    setMessage("<big>🎉 Great Job!</big>You spelled it correctly!", "good");
    $("score").textContent = score; $("streak").textContent = streak;
    soundCorrect(); confetti();
    $("mascotSmall").classList.add("bounce");
    setTimeout(() => $("mascotSmall").classList.remove("bounce"), 700);
    setTimeout(nextQuestion, 2000);
  } else {
    streak = 0; $("streak").textContent = 0;   // no point penalty
    boxEls.forEach((b) => { b.classList.remove("wrong"); void b.offsetWidth; b.classList.add("wrong"); });
    setMessage("<big>😊 Try Again!</big>Almost! Check the letters and try again.", "bad");
    soundWrong();
  }
}

function nextQuestion() {
  current++;
  if (current >= questions.length) endGame();
  else loadQuestion();
}

// ---------- 7. END SCREEN ----------
function endGame() {
  $("progressBar").style.width = "100%";
  showScreen("endScreen");
  soundDone(); confetti();
  $("finalScore").textContent = score;
  $("correctCount").textContent = correctCount;
  $("totalCount").textContent = questions.length;

  const stars = correctCount >= 9 ? 3 : correctCount >= 7 ? 2 : correctCount >= 5 ? 1 : 0;
  $("stars").innerHTML = [0, 1, 2].map((i) => "<span>" + (i < stars ? "⭐" : "☆") + "</span>").join("");

  let msg = "Keep trying! Practice makes you better! 💪";
  if (correctCount >= 9) msg = "Amazing! You are a spelling superstar! 🌟";
  else if (correctCount >= 7) msg = "Great work! Keep practicing! ⭐";
  else if (correctCount >= 5) msg = "Good effort! You are learning! 😊";
  $("feedback").textContent = msg;

  // Badges
  const badges = [];
  if (correctCount === questions.length) badges.push("🏅 Perfect Speller");
  if (bestStreak >= 5) badges.push("🔥 Hot Streak (" + bestStreak + ")");
  if (hintsUsed === 0) badges.push("🧠 No Hints Needed");
  if (level === "challenge" && correctCount >= 7) badges.push("🚀 Challenge Champion");
  $("badges").innerHTML = badges.map((b) => '<div class="badge">' + b + "</div>").join("");

  // High score
  if (score > getBest()) { setBest(score); $("newBest").textContent = "🏆 New high score!"; }
  else $("newBest").textContent = "🏆 Best score: " + getBest();
  speak(msg.replace(/[^\w\s!.,?']/g, ""));
}

// ---------- 8. BUTTONS ----------
document.querySelectorAll(".level").forEach((btn) => {
  btn.onclick = () => {
    level = btn.dataset.level;
    document.querySelectorAll(".level").forEach((b) => b.classList.toggle("selected", b === btn));
  };
});
$("startBtn").onclick = startGame;
$("listenBtn").onclick = () => speak(questions[current].word);
$("hintBtn").onclick = useHint;
$("clearBtn").onclick = clearAnswer;
$("checkBtn").onclick = checkAnswer;
$("againBtn").onclick = startGame;
$("levelBtn").onclick = () => { $("bestScore").textContent = getBest(); showScreen("startScreen"); };

$("bestScore").textContent = getBest();
