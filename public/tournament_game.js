// tournament_game.js
// Логіка "турнірної" гри: ти vs суперник у 3 іграх раунду
// Зараз: гра проти бота + приєднання до турніру через API
// ДОДАНО: завантаження даних турніру з БД + перевірка кількості гравців

// ======================
//  Налаштування API
// ======================

// Базовий URL API (можеш замінити на свій домен Render)
const API_BASE =
  window.DREAMX_API_BASE || "https://dreamx-api.onrender.com";

// ID турніру з URL (?tournament_id=...)
const urlParams = new URLSearchParams(window.location.search);
const TOURNAMENT_ID = urlParams.get("tournament_id")
  ? parseInt(urlParams.get("tournament_id"), 10)
  : null;

// user_id беремо через загальний core
const USER_ID = window.DreamX ? window.DreamX.getUserId() : null;

// ======================
//  Налаштування раунду
// ======================

const STATUS_TIME = 6;          // сек на хід
const MAX_GAMES = 3;            // 3 гри в раунді

let currentGameIndex = 0;       // 0,1,2
let roundScoreMe = 0;
let roundScoreOpp = 0;
let turnLocked = false;
let timerId = null;
let timeLeft = STATUS_TIME;

// ======================
//  DOM-елементи
// ======================

// верхня шапка турніру
const tNameEl = document.getElementById("tourgame-tournament-name");
const tHostEl = document.getElementById("tourgame-tournament-host");
const tProgressEl = document.getElementById("tourgame-tournament-progress");

const statusEl = document.getElementById("tourgame-status-text");
const timerBarEl = document.getElementById("tourgame-timer-progress");

const rockBtn = document.querySelector(".tourgame-rps-btn.rps-rock");
const scissorsBtn = document.querySelector(".tourgame-rps-btn.rps-scissors");
const paperBtn = document.querySelector(".tourgame-rps-btn.rps-paper");

const opponentRow = document.querySelector(".tourgame-history-row.opponent");
const meRow = document.querySelector(".tourgame-history-row.me");

const oppCells = opponentRow
  ? Array.from(opponentRow.querySelectorAll(".history-cell")).filter(
      (c) => !c.classList.contains("history-total")
    )
  : [];

const oppTotalCell = opponentRow
  ? opponentRow.querySelector(".history-total")
  : null;

const meCells = meRow
  ? Array.from(meRow.querySelectorAll(".history-cell")).filter(
      (c) => !c.classList.contains("history-total")
    )
  : [];

const meTotalCell = meRow ? meRow.querySelector(".history-total") : null;

// центральні рахунки "Цей раунд"
const oppRoundScoreEl = document.getElementById(
  "tourgame-opponent-round-score"
);
const meRoundScoreEl = document.getElementById("tourgame-me-round-score");

// Мапа фігур
const CHOICES = {
  rock: { icon: "🪨", beats: "scissors" },
  scissors: { icon: "✂️", beats: "paper" },
  paper: { icon: "📄", beats: "rock" },
};

// ======================
//  Таймер
// ======================

function updateStatusText() {
  if (!statusEl) return;

  if (currentGameIndex >= MAX_GAMES) {
    statusEl.textContent = "Раунд завершено. Очікуємо наступний етап…";
    return;
  }

  statusEl.textContent = `Зроби вибір за ${timeLeft} секунди…`;
}

function updateTimerBar() {
  if (!timerBarEl) return;
  const ratio = Math.max(0, Math.min(1, timeLeft / STATUS_TIME));
  timerBarEl.style.width = ratio * 100 + "%";
}

function startTurnTimer() {
  clearInterval(timerId);
  timeLeft = STATUS_TIME;
  updateStatusText();
  updateTimerBar();

  timerId = setInterval(() => {
    timeLeft -= 1;
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateStatusText();
      updateTimerBar();
      clearInterval(timerId);

      if (!turnLocked) {
        autoPickForPlayer(); // авто-вибір, якщо не встиг
      }
      return;
    }
    updateStatusText();
    updateTimerBar();
  }, 1000);
}

function stopTurnTimer() {
  clearInterval(timerId);
  timerId = null;
}

// ======================
//  Логіка ходу (поки офлайн vs бот)
// ======================

function randomChoiceKey() {
  const keys = Object.keys(CHOICES);
  return keys[Math.floor(Math.random() * keys.length)];
}

function autoPickForPlayer() {
  const choiceKey = randomChoiceKey();
  handlePlayerChoice(choiceKey);
}

function handlePlayerChoice(choiceKey) {
  if (turnLocked || currentGameIndex >= MAX_GAMES) return;

  const choice = CHOICES[choiceKey];
  if (!choice) return;

  turnLocked = true;
  stopTurnTimer();

  // Вибір суперника (поки рандом — “бот”)
  const opponentKey = randomChoiceKey();

  // Визначаємо результат
  let result = 0; // 0 - нічия, 1 - ти виграв, -1 - ти програв
  if (choiceKey === opponentKey) {
    result = 0;
  } else if (CHOICES[choiceKey].beats === opponentKey) {
    result = 1;
  } else {
    result = -1;
  }

  // Оновлюємо квадратики історії
  setHistoryCells(currentGameIndex, opponentKey, choiceKey, result);

  // CИСТЕМА БАЛІВ: win=2, draw=1, lose=0
  if (result === 1) {
    roundScoreMe += 2;
  } else if (result === 0) {
    roundScoreMe += 1;
    roundScoreOpp += 1;
  } else if (result === -1) {
    roundScoreOpp += 2;
  }

  // оновлюємо суму в Σ
  if (oppTotalCell) oppTotalCell.textContent = String(roundScoreOpp);
  if (meTotalCell) meTotalCell.textContent = String(roundScoreMe);

  // оновлюємо центральний рахунок "Цей раунд"
  if (oppRoundScoreEl) oppRoundScoreEl.textContent = String(roundScoreOpp);
  if (meRoundScoreEl) meRoundScoreEl.textContent = String(roundScoreMe);

  // Наступна гра
  currentGameIndex += 1;

  if (currentGameIndex >= MAX_GAMES) {
    finishRound();
  } else {
    setTimeout(() => {
      turnLocked = false;
      startTurnTimer();
    }, 400);
  }
}

function setHistoryCells(gameIndex, opponentKey, meKey, result) {
  // gameIndex 0..2 -> відповідно перші 3 клітинки
  if (!oppCells[gameIndex] || !meCells[gameIndex]) return;

  const oppCell = oppCells[gameIndex];
  const meCell = meCells[gameIndex];

  [oppCell, meCell].forEach((cell) => {
    cell.classList.remove("result-draw", "result-win", "result-lose");
  });

  oppCell.textContent = CHOICES[opponentKey].icon;
  meCell.textContent = CHOICES[meKey].icon;

  if (result === 0) {
    oppCell.classList.add("result-draw");
    meCell.classList.add("result-draw");
  } else if (result === 1) {
    meCell.classList.add("result-win");
    oppCell.classList.add("result-lose");
  } else if (result === -1) {
    meCell.classList.add("result-lose");
    oppCell.classList.add("result-win");
  }
}

function finishRound() {
  updateStatusText();
  updateTimerBar();
  disableButtons();
}

function disableButtons() {
  [rockBtn, scissorsBtn, paperBtn].forEach((btn) => {
    if (!btn) return;
    btn.disabled = true;
    btn.style.opacity = "0.6";
  });
}

// ======================
//  Дані турніру з API
// ======================

async function loadTournamentInfo() {
  if (!TOURNAMENT_ID) return null;

  try {
    const res = await fetch(
      `${API_BASE}/api/get_tournament?id=${encodeURIComponent(TOURNAMENT_ID)}`
    );
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    const data = await res.json();
    const t = data.tournament || null;
    if (!t) return null;

    // Назва турніру
    if (tNameEl && t.title) {
      tNameEl.textContent = t.title;
    }

    // Організатор (пробуємо кілька можливих полів)
    if (tHostEl) {
      const rawHost =
        t.host_username ||
        t.host_nick ||
        t.owner_username ||
        t.owner_nick ||
        null;

      if (rawHost) {
        const clean = rawHost.toString().startsWith("@")
          ? rawHost.toString().slice(1)
          : rawHost.toString();
        tHostEl.textContent = `Організатор: @${clean}`;
      } else {
        tHostEl.textContent = "Організатор: невідомо";
      }
    }

    // Прогрес: було → залишилось / або просто кількість
    if (tProgressEl) {
      const total =
        t.players_total ||
        t.players_count ||
        t.total_players ||
        0;
      const pass =
        t.players_pass ||
        t.pass_count ||
        null;

      if (total && pass !== null && pass !== undefined) {
        tProgressEl.textContent = `Було ${total} → Залишилось ${pass}`;
      } else if (total) {
        tProgressEl.textContent = `Учасників: ${total}`;
      } else {
        tProgressEl.textContent = "Учасників поки немає";
      }
    }

    return t;
  } catch (err) {
    console.error("loadTournamentInfo error:", err);
    if (statusEl) {
      statusEl.textContent = "Не вдалося завантажити дані турніру.";
    }
    return null;
  }
}

// ======================
//  Приєднання до турніру через API
// ======================

async function joinTournamentIfPossible() {
  if (!TOURNAMENT_ID || !USER_ID) {
    // Якщо немає даних — просто тренувальний режим
    console.log(
      "Tournament or user_id not found — тренувальна гра проти бота."
    );
    if (statusEl && !TOURNAMENT_ID) {
      statusEl.textContent = "Тренувальний режим: турнір не вибрано.";
    }
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/api/join_tournament`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tournament_id: TOURNAMENT_ID,
        user_id: USER_ID,
      }),
    });

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    const data = await res.json();
    console.log("join_tournament result:", data);

    return data;
  } catch (err) {
    console.error("join_tournament error:", err);
    if (statusEl) {
      statusEl.textContent =
        "Не вдалося приєднатись до турніру. Але ти все одно можеш потренуватись проти бота 😉";
    }
    return null;
  }
}

// ======================
//  Ініціалізація
// ======================

function resetButtons() {
  [rockBtn, scissorsBtn, paperBtn].forEach((btn) => {
    if (!btn) return;
    btn.disabled = false;
    btn.style.opacity = "1";
  });
}

async function initTournamentGame() {
  if (!rockBtn || !scissorsBtn || !paperBtn) return;

  // 1) Спочатку намагаємось приєднатися до турніру в бекенді
  await joinTournamentIfPossible();

  // 2) Завантажуємо інформацію про турнір (назва, організатор, кількість учасників)
  const t = await loadTournamentInfo();

  // Скільки учасників зареєстровано в турнірі
  const playersCount =
    (t &&
      (t.players_total ||
        t.players_count ||
        t.total_players)) ||
    0;

  if (!TOURNAMENT_ID || !USER_ID) {
    // Якщо немає турніру або user_id — залишаємо просто тренувальний режим,
    // але без чеків на кількість.
    if (statusEl) {
      statusEl.textContent =
        "Тренувальний режим: турнір не вибрано або користувач не визначений.";
    }
    setupRoundLocal();
    return;
  }

  if (playersCount < 2) {
    // ТИ ПЕРШИЙ УЧАСНИК → ЧЕКАЄМО ІНШОГО, НІЧОГО НЕ ВІДБУВАЄТЬСЯ
    if (statusEl) {
      statusEl.textContent =
        "Ти перший учасник цього турніру. Зачекай, поки приєднається ще один гравець…";
    }
    disableButtons();
    stopTurnTimer();
    return;
  }

  // Якщо учасників уже 2+ → дозволяємо локальну гру (поки ще vs бот)
  if (statusEl) {
    statusEl.textContent =
      "Гравців достатньо. Можеш зіграти тренувальний раунд перед офіційним боєм.";
  }
  setupRoundLocal();
}

// окремо винесено старт локального раунду
function setupRoundLocal() {
  // Навішуємо обробники кнопок (один раз)
  rockBtn.addEventListener("click", () => handlePlayerChoice("rock"));
  scissorsBtn.addEventListener("click", () => handlePlayerChoice("scissors"));
  paperBtn.addEventListener("click", () => handlePlayerChoice("paper"));

  // Початковий стан раунду
  turnLocked = false;
  currentGameIndex = 0;
  roundScoreMe = 0;
  roundScoreOpp = 0;

  if (oppTotalCell) oppTotalCell.textContent = "0";
  if (meTotalCell) meTotalCell.textContent = "0";

  if (oppRoundScoreEl) oppRoundScoreEl.textContent = "0";
  if (meRoundScoreEl) meRoundScoreEl.textContent = "0";

  [...oppCells, ...meCells].forEach((cell) => {
    cell.textContent = "";
    cell.classList.remove("result-draw", "result-win", "result-lose");
  });

  resetButtons();
  startTurnTimer();
}

document.addEventListener("DOMContentLoaded", () => {
  initTournamentGame();
});
