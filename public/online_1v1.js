// online_1v1.js
// Реальна логіка екрана "Онлайн 1 vs 1"

const tg = window.Telegram && window.Telegram.WebApp;

// Базовий URL API (як у інших екранів)
const API_BASE =
  (window.DREAMX_API_BASE && window.DREAMX_API_BASE) ||
  "https://dreamx-api.onrender.com";

const USER_ID =
  (window.DreamX && window.DreamX.getUserId && window.DreamX.getUserId()) ||
  (tg && tg.initDataUnsafe && tg.initDataUnsafe.user
    ? tg.initDataUnsafe.user.id
    : null);

const USERNAME =
  (window.DreamX && window.DreamX.getUsername && window.DreamX.getUsername()) ||
  (tg && tg.initDataUnsafe && tg.initDataUnsafe.user
    ? tg.initDataUnsafe.user.username
    : null);

// Хелпер: красиво показати нік
function formatNick(raw) {
  if (!raw) return "Ти";
  const s = String(raw);
  return s.startsWith("@") ? s : "@" + s;
}

// =============================
//   ГЛОБАЛЬНИЙ СТАН КІМНАТИ
// =============================

let roomId = null;
let mySeat = null; // 1 або 2
let currentRoundIndex = 1; // поки що 1 раунд
let pollingTimer = null;
let matchFinished = false;
let lastState = null;
let isSendingMove = false;

// =============================
//   API ХЕЛПЕРИ
// =============================

async function apiJoinRoom() {
  const resp = await fetch(`${API_BASE}/api/one_vs_one/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: USER_ID,
      username: USERNAME,
    }),
  });

  if (!resp.ok) {
    throw new Error("join_http_" + resp.status);
  }
  const data = await resp.json();
  if (!data.ok) {
    throw new Error("join_error: " + (data.error || "unknown"));
  }
  return data.data; // {room_id, seat, status, players}
}

async function apiGetRoomState() {
  if (!roomId) return null;

  const url = new URL(`${API_BASE}/api/one_vs_one/state`);
  url.searchParams.set("room_id", String(roomId));
  if (USER_ID) {
    url.searchParams.set("user_id", String(USER_ID));
  }

  const resp = await fetch(url.toString(), {
    method: "GET",
  });

  if (!resp.ok) {
    throw new Error("state_http_" + resp.status);
  }
  const data = await resp.json();
  if (!data.ok) {
    throw new Error("state_error: " + (data.error || "unknown"));
  }
  return data.data; // {room, me_seat, players, turns}
}

async function apiSendMove(gameIndex, choice) {
  if (!roomId || !USER_ID) {
    throw new Error("no_room_or_user");
  }

  const resp = await fetch(`${API_BASE}/api/one_vs_one/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_id: roomId,
      user_id: USER_ID,
      round_index: currentRoundIndex,
      game_index: gameIndex,
      choice: choice,
    }),
  });

  if (!resp.ok) {
    throw new Error("move_http_" + resp.status);
  }
  const data = await resp.json();
  if (!data.ok) {
    throw new Error("move_error: " + (data.error || "unknown"));
  }
  return data.data; // структура, яку повертає make_move
}

// =============================
//   UI ХЕЛПЕРИ
// =============================

function showStatus(message) {
  const statusText = document.getElementById("online-status-text");
  if (statusText) {
    statusText.textContent = message;
  }
}

function updateRoomHeaderFromState(state) {
  const roomNameEl = document.getElementById("online-room-name");
  const roomHostEl = document.getElementById("online-room-host");
  const roomProgressEl = document.getElementById("online-room-progress");
  const roomSubtitleEl = document.getElementById("online-room-subtitle");

  const room = state.room;
  const players = state.players || [];
  const meSeat = state.me_seat;

  if (roomNameEl) {
    roomNameEl.textContent = `Кімната #${room.id}`;
  }

  if (roomHostEl) {
    const hostNick = formatNick(room.host_username || "host");
    roomHostEl.textContent = `Організатор: ${hostNick}`;
  }

  if (roomProgressEl) {
    const count = players.length;
    let text = `У кімнаті: ${count} гравець`;
    if (count !== 1) {
      text = `У кімнаті: ${count} гравців`;
    }
    if (count < 2) {
      text += " · чекаємо опонента";
    } else {
      text += " · матч триває";
    }
    roomProgressEl.textContent = text;
  }

  if (roomSubtitleEl) {
    if (players.length < 2) {
      roomSubtitleEl.textContent = "Чекаємо ще одного гравця…";
    } else {
      roomSubtitleEl.textContent = "Хто більше набере балів — той перемагає";
    }
  }

  // Оновлюємо список гравців
  const playersList = document.getElementById("online-room-players");
  if (playersList) {
    playersList.innerHTML = "";

    if (players.length === 0) {
      const li = document.createElement("li");
      li.className = "tourgame-group-player";
      li.textContent = "У кімнаті нікого немає";
      playersList.appendChild(li);
      return;
    }

    players
      .slice()
      .sort((a, b) => a.seat - b.seat)
      .forEach((p) => {
        const li = document.createElement("li");
        li.className = "tourgame-group-player";
        if (p.seat === meSeat) {
          li.classList.add("me");
        }

        const nameSpan = document.createElement("span");
        nameSpan.className = "tourgame-player-name";
        const nick = formatNick(p.username);
        nameSpan.textContent =
          p.seat === meSeat ? `${nick} (Ти)` : nick || "Гравець";

        const scoreSpan = document.createElement("span");
        scoreSpan.className = "tourgame-player-score";
        scoreSpan.textContent = `${p.total_points} балів`;

        li.appendChild(nameSpan);
        li.appendChild(scoreSpan);
        playersList.appendChild(li);
      });

    // Якщо гравців 1 — додаємо рядок "очікуємо суперника"
    if (players.length === 1) {
      const li = document.createElement("li");
      li.className = "tourgame-group-player";
      const nameSpan = document.createElement("span");
      nameSpan.className = "tourgame-player-name";
      nameSpan.textContent = "Очікуємо суперника…";
      const scoreSpan = document.createElement("span");
      scoreSpan.className = "tourgame-player-score";
      scoreSpan.textContent = "0 балів";
      li.appendChild(nameSpan);
      li.appendChild(scoreSpan);
      playersList.appendChild(li);
    }
  }
}

function choiceToEmoji(choice) {
  if (!choice) return "";
  switch (choice) {
    case "rock":
      return "🪨";
    case "scissors":
      return "✂️";
    case "paper":
      return "📄";
    default:
      return choice;
  }
}

// рахуємо локальні бали раунду по turns
function computeRoundScoresFromTurns(turns, meSeat) {
  let me = 0;
  let opp = 0;

  if (!Array.isArray(turns)) return { me, opp };

  for (const t of turns) {
    if (!t.p1_choice || !t.p2_choice) continue;

    // нічия (обидва ходи є, а winner_seat = null)
    if (!t.winner_seat) {
      me += 1;
      opp += 1;
      continue;
    }

    if (t.winner_seat === meSeat) {
      me += 2;
    } else {
      opp += 2;
    }
  }

  return { me, opp };
}

function updateArenaFromState(state) {
  const room = state.room;
  const players = state.players || [];
  const turns = state.turns || [];
  const meSeat = state.me_seat;

  currentRoundIndex = room.current_round || 1;

  const roundLabel = document.getElementById("online-round-label");
  const roundSub = document.getElementById("online-round-sub");

  if (roundLabel) {
    roundLabel.textContent = `РАУНД ${currentRoundIndex} / ${room.total_rounds || 1}`;
  }
  if (roundSub) {
    roundSub.textContent = `Цей раунд: ${room.games_per_round || 3} гри`;
  }

  // Знайдемо мене і опонента
  const mePlayer = players.find((p) => p.seat === meSeat) || null;
  const oppPlayer = players.find((p) => p.seat !== meSeat) || null;

  const meNick = formatNick(mePlayer ? mePlayer.username : USERNAME);
  const oppNick = formatNick(oppPlayer ? oppPlayer.username : "Суперник");

  const meNameEl = document.getElementById("online-me-name");
  const oppNameEl = document.getElementById("online-opponent-name");
  const meHistNickEl = document.getElementById("online-history-me");
  const oppHistNickEl = document.getElementById("online-history-opponent");

  if (meNameEl) meNameEl.textContent = meNick;
  if (meHistNickEl) meHistNickEl.textContent = meNick;
  if (oppNameEl)
    oppNameEl.textContent = oppPlayer
      ? oppNick
      : "Очікуємо суперника";
  if (oppHistNickEl) oppHistNickEl.textContent = oppNick;

  // Історія ходів (3 гри)
  const meTotalCell = document.getElementById("online-me-total");
  const oppTotalCell = document.getElementById("online-opponent-total");
  const meRoundScoreEl = document.getElementById("online-me-round-score");
  const oppRoundScoreEl = document.getElementById(
    "online-opponent-round-score"
  );

  // очищаємо всі клітинки 3 ігор
  for (let gi = 1; gi <= 3; gi++) {
    const oppCell = document.querySelector(
      `.tourgame-history-row.opponent .history-cell[data-player="opponent"][data-round="${gi}"]`
    );
    const meCell = document.querySelector(
      `.tourgame-history-row.me .history-cell[data-player="me"][data-round="${gi}"]`
    );
    if (oppCell) oppCell.textContent = "";
    if (meCell) meCell.textContent = "";
  }

  // Розкласти choices по іграх
  turns.forEach((t) => {
    const gi = t.game_index;
    if (gi < 1 || gi > 3) return;

    const oppCell = document.querySelector(
      `.tourgame-history-row.opponent .history-cell[data-player="opponent"][data-round="${gi}"]`
    );
    const meCell = document.querySelector(
      `.tourgame-history-row.me .history-cell[data-player="me"][data-round="${gi}"]`
    );

    if (meSeat === 1) {
      if (meCell) meCell.textContent = choiceToEmoji(t.p1_choice);
      if (oppCell) oppCell.textContent = choiceToEmoji(t.p2_choice);
    } else if (meSeat === 2) {
      if (meCell) meCell.textContent = choiceToEmoji(t.p2_choice);
      if (oppCell) oppCell.textContent = choiceToEmoji(t.p1_choice);
    }
  });

  const { me: meScore, opp: oppScore } = computeRoundScoresFromTurns(
    turns,
    meSeat
  );

  if (meTotalCell) meTotalCell.textContent = String(meScore);
  if (oppTotalCell) oppTotalCell.textContent = String(oppScore);
  if (meRoundScoreEl) meRoundScoreEl.textContent = String(meScore);
  if (oppRoundScoreEl) oppRoundScoreEl.textContent = String(oppScore);

  // Визначаємо, чи матч завершено (якщо всі 3 гри завершені)
  const finishedGames = turns.filter((t) => t.status === "finished").length;
  const gamesPerRound = room.games_per_round || 3;

  if (finishedGames >= gamesPerRound && players.length >= 2) {
    matchFinished = true;
    if (meScore > oppScore) {
      showStatus("Раунд завершено! Ти переміг 🎉");
    } else if (meScore < oppScore) {
      showStatus("Раунд завершено! Переміг суперник 😅");
    } else {
      showStatus("Раунд завершено! Нічия 🤝");
    }
  } else if (players.length < 2) {
    matchFinished = false;
    showStatus("Очікуємо, поки в кімнату зайде ще один гравець…");
  } else {
    matchFinished = false;
    showStatus("Зроби хід, а потім чекай на хід суперника 👇");
  }
}

// Рахуємо наступний game_index для ходу
function determineCurrentGameIndex(turns, room) {
  const gamesPerRound = room.games_per_round || 3;
  if (!Array.isArray(turns) || turns.length === 0) {
    return 1;
  }

  const finished = turns
    .filter((t) => t.status === "finished")
    .map((t) => t.game_index);
  const notFinished = turns.filter((t) => t.status !== "finished");

  // Якщо є не завершена гра — продовжуємо її
  if (notFinished.length > 0) {
    // беремо з найменшим game_index
    const gi = notFinished
      .map((t) => t.game_index)
      .sort((a, b) => a - b)[0];
    return gi;
  }

  // Всі існуючі — finished
  const maxGameIndex = Math.max(...finished);
  if (maxGameIndex < gamesPerRound) {
    return maxGameIndex + 1;
  }

  // Всі 3 гри зіграні
  return null;
}

// =============================
//   ПОЛЛІНГ СТАНУ
// =============================

async function refreshState() {
  if (!roomId) return;

  try {
    const state = await apiGetRoomState();
    lastState = state;
    updateRoomHeaderFromState(state);
    updateArenaFromState(state);
  } catch (err) {
    console.error("refreshState error", err);
    // не ломимо користувача, просто не оновився один раз
  }
}

function startPolling() {
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(() => {
    refreshState();
  }, 1500);
}

// =============================
//   ОБРОБНИКИ КНОПОК
// =============================

function setupRpsButtons() {
  const buttons = document.querySelectorAll(".tourgame-rps-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!lastState || !roomId || !USER_ID) return;
      if (matchFinished) {
        showStatus("Раунд вже завершено 🙂");
        return;
      }
      if (isSendingMove) return;

      const choice = btn.getAttribute("data-choice");
      if (!choice) return;

      const room = lastState.room;
      const turns = lastState.turns || [];
      const gameIndex = determineCurrentGameIndex(turns, room);

      if (!gameIndex) {
        // всі 3 гри вже зіграні
        showStatus("Раунд вже завершено 🙂");
        return;
      }

      try {
        isSendingMove = true;
        showStatus("Відправляємо твій хід…");

        await apiSendMove(gameIndex, choice);

        // Після ходу — одразу оновлюємо стан
        await refreshState();
      } catch (err) {
        console.error("sendMove error", err);
        showStatus("Помилка відправки ходу. Спробуй ще раз.");
      } finally {
        isSendingMove = false;
      }
    });
  });
}

// =============================
//   INIT
// =============================

document.addEventListener("DOMContentLoaded", async () => {
  if (!USER_ID) {
    showStatus("Помилка: не вдалося визначити твій Telegram ID.");
    return;
  }

  const meNick = formatNick(USERNAME);
  const meNameEl = document.getElementById("online-me-name");
  const meHistoryNickEl = document.getElementById("online-history-me");

  if (meNameEl) meNameEl.textContent = meNick;
  if (meHistoryNickEl) meHistoryNickEl.textContent = meNick;

  setupRpsButtons();

  showStatus("Створюємо кімнату або підключаємось до вже існуючої…");

  try {
    const joinData = await apiJoinRoom();
    roomId = joinData.room_id;
    mySeat = joinData.seat;
    // початковий стан з join можна не малювати — одразу робимо refreshState
    await refreshState();
    startPolling();
  } catch (err) {
    console.error("join_room error", err);
    showStatus("Помилка підключення до кімнати. Спробуй перезавантажити.");
  }
});
