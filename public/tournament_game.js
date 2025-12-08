// tournament_game.js
// Логіка "турнірної" гри: ти vs суперник у 3 іграх раунду

// ======================
//  Налаштування
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
const oppRoundScoreEl = document.getElementById("tourgame-opponent-round-score");
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
//  Логіка ходу
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

  // Вибір суперника (поки рандом)
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

  // ===========================
  //   CИСТЕМА БАЛІВ: win=2, draw=1, lose=0
  // ===========================
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
//  Ініціалізація
// ======================

function resetButtons() {
  [rockBtn, scissorsBtn, paperBtn].forEach((btn) => {
    if (!btn) return;
    btn.disabled = false;
    btn.style.opacity = "1";
  });
}

function initTournamentGame() {
  if (!rockBtn || !scissorsBtn || !paperBtn) return;

  rockBtn.addEventListener("click", () => handlePlayerChoice("rock"));
  scissorsBtn.addEventListener("click", () => handlePlayerChoice("scissors"));
  paperBtn.addEventListener("click", () => handlePlayerChoice("paper"));

  // Початковий стан
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

document.addEventListener("DOMContentLoaded", initTournamentGame);
