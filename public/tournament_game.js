// tournament_game.js
// Логіка "Турнірної" гри: ти vs умовний суперник у 3 іграх раунду

// ======================
//  Допоміжні змінні
// ======================
const STATUS_TIME = 6;           // секунд на хід
const MAX_GAMES = 3;            // 3 гри в раунді

let currentGameIndex = 0;       // 0,1,2
let roundScoreMe = 0;
let roundScoreOpp = 0;
let turnLocked = false;         // щоб не клікали по 10 разів
let timerId = null;
let timeLeft = STATUS_TIME;

// Елементи DOM
const statusEl = document.querySelector(".tourgame-status-line");
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
    statusEl.textContent = "Раунд завершено. Очікуємо наступну групу…";
    return;
  }
  statusEl.textContent = `Зроби вибір за ${timeLeft} секунд…`;
}

function startTurnTimer() {
  clearInterval(timerId);
  timeLeft = STATUS_TIME;
  updateStatusText();

  timerId = setInterval(() => {
    timeLeft -= 1;
    if (timeLeft <= 0) {
      clearInterval(timerId);
      if (!turnLocked) {
        // якщо гравець не вибрав — авто-вибір
        autoPickForPlayer();
      }
      return;
    }
    updateStatusText();
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

  // Вибір суперника (поки що рандомно)
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

  // Оновлюємо рахунок раунду
  if (result === 1) roundScoreMe += 1;
  if (result === -1) roundScoreOpp += 1;

  if (oppTotalCell) oppTotalCell.textContent = String(roundScoreOpp);
  if (meTotalCell) meTotalCell.textContent = String(roundScoreMe);

  // Наступна гра
  currentGameIndex += 1;

  if (currentGameIndex >= MAX_GAMES) {
    finishRound();
  } else {
    // невелика пауза і старт наступного таймера
    setTimeout(() => {
      turnLocked = false;
      startTurnTimer();
    }, 500);
  }
}

function setHistoryCells(gameIndex, opponentKey, meKey, result) {
  if (
    !oppCells[gameIndex] ||
    !meCells[gameIndex]
  ) {
    return;
  }

  const oppCell = oppCells[gameIndex];
  const meCell = meCells[gameIndex];

  // очищаємо попередні класи результатів
  [oppCell, meCell].forEach((cell) => {
    cell.classList.remove("result-draw", "result-win", "result-lose");
  });

  // ставимо іконки
  oppCell.textContent = CHOICES[opponentKey].icon;
  meCell.textContent = CHOICES[meKey].icon;

  // фарбуємо фон
  if (result === 0) {
    oppCell.classList.add("result-draw");
    meCell.classList.add("result-draw");
  } else if (result === 1) {
    // ти виграв
    meCell.classList.add("result-win");
    oppCell.classList.add("result-lose");
  } else if (result === -1) {
    // ти програв
    meCell.classList.add("result-lose");
    oppCell.classList.add("result-win");
  }
}

function finishRound() {
  updateStatusText();
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

function initTournamentGame() {
  if (!rockBtn || !scissorsBtn || !paperBtn) return;

  rockBtn.addEventListener("click", () => handlePlayerChoice("rock"));
  scissorsBtn.addEventListener("click", () => handlePlayerChoice("scissors"));
  paperBtn.addEventListener("click", () => handlePlayerChoice("paper"));

  turnLocked = false;
  currentGameIndex = 0;
  roundScoreMe = 0;
  roundScoreOpp = 0;

  if (oppTotalCell) oppTotalCell.textContent = "0";
  if (meTotalCell) meTotalCell.textContent = "0";

  // очищаємо клітинки (на випадок повторного входу)
  [...oppCells, ...meCells].forEach((cell) => {
    cell.textContent = "";
    cell.classList.remove("result-draw", "result-win", "result-lose");
  });

  startTurnTimer();
}

document.addEventListener("DOMContentLoaded", initTournamentGame);
