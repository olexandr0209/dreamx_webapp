// tournaments_screen.js
// Логіка списку турнірів + кнопка з таймером (тільки турніри, без гри)

// 🔗 Базовий URL API для турнірів
// Можеш визначити window.DREAMX_API_BASE в dreamx_core.js
const API_BASE =
  window.DREAMX_API_BASE || "https://dreamx-api.onrender.com";

// ======================
//  Хелпери для часу
// ======================

// Парсимо час з бекенду як UTC, незалежно від країни користувача
// Підтримує формати:
//   - "2025-12-10T10:00:00Z"
//   - "2025-12-10T10:00:00+02:00"
//   - "2025-12-10 10:00:00"
//   - "2025-12-10T10:00:00"
function parseBackendTimeToMs(raw) {
  if (!raw) return NaN;

  let s = String(raw).trim();

  // Якщо вже ISO з таймзоною — просто парсимо
  if (s.endsWith("Z") || /[+-]\d\d:\d\d$/.test(s)) {
    return Date.parse(s);
  }

  // Варіант "2025-12-10 10:00:00" або "2025-12-10T10:00:00"
  // Вважаємо, що це UTC і додаємо 'Z'
  s = s.replace(" ", "T");
  return Date.parse(s + "Z");
}

// Формат різниці в мс:
// - якщо > 24 год: "1 д. 15:25:30"
// - якщо <= 24 год: "15:25:30"
function formatDiffToText(diffMs) {
  if (diffMs <= 0) return "00:00:00";

  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / 86400); // 24*60*60
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (days > 0) {
    return `${days} д. ${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}:${ss}`;
}

// ======================
//  ТАЙМЕР ДЛЯ КАРТОК
// ======================

// Оновлення таймера для однієї карточки турніру
function updateCardTimer(card) {
  const startIso = card.dataset.startAt;
  if (!startIso) return;

  const label = card.querySelector(".tour-start-label");
  if (!label) return;

  const btn = card.querySelector(".tour-join-btn");

  const now = Date.now();
  const startMs = parseBackendTimeToMs(startIso); // ✅ час як UTC

  if (Number.isNaN(startMs)) {
    label.textContent = "Помилка часу";
    if (btn) {
      btn.disabled = true;
      btn.classList.add("tour-join-btn-disabled");
    }
    return;
  }

  const fiveMinutesMs = 5 * 60 * 1000;
  const twoMinutesMs = 2 * 60 * 1000;
  const endWindow = startMs + fiveMinutesMs;

  // Якщо минуло більше 5 хв після старту – прибираємо турнір
  if (now > endWindow) {
    card.remove();
    return;
  }

  // Якщо ще далеко до старту (більше 2 хвилин) — показуємо таймер, але кнопка заблокована
  if (now < startMs - twoMinutesMs) {
    const diff = startMs - now;
    label.textContent = formatDiffToText(diff);

    if (btn) {
      btn.disabled = true;
      btn.classList.add("tour-join-btn-disabled");
      btn.textContent = "СКОРО СТАРТ";
    }
    return;
  }

  // Вікно за 2 хв до старту — таймер іде, кнопку дозволяємо
  if (now >= startMs - twoMinutesMs && now < startMs) {
    const diff = startMs - now;
    label.textContent = formatDiffToText(diff);

    if (btn) {
      btn.disabled = false;
      btn.classList.remove("tour-join-btn-disabled");
      btn.textContent = "ВІДКРИТИ ТУРНІР";
    }
    return;
  }

  // Вікно: від старту до +5 хв – показуємо "СТАРТУЄМО!", кнопка активна
  if (now >= startMs && now <= endWindow) {
    label.textContent = "СТАРТУЄМО!";
    if (btn) {
      btn.disabled = false;
      btn.classList.remove("tour-join-btn-disabled");
      btn.textContent = "ВІДКРИТИ ТУРНІР";
    }
    return;
  }
}

// Оновлюємо тільки текст таймерів на вже намальованих картках
function refreshCountdowns() {
  const cards = document.querySelectorAll(".tournament-card");
  cards.forEach((card) => {
    updateCardTimer(card);
  });
}

// ======================
//  РЕНДЕР ОДНІЄЇ КАРТКИ
// ======================

function renderTournamentCard(t) {
  // Очікуємо, що бекенд повертає хоча б:
  // id, title, start_at (ISO-строка), players_total, players_pass
  const wrapper = document.createElement("div");
  wrapper.className = "mode-card tournament-card";
  wrapper.dataset.tournamentId = t.id;
  wrapper.dataset.startAt = t.start_at; // ISO-час старту (UTC)

  const title = document.createElement("div");
  title.className = "mode-title";
  title.textContent = t.title || `Турнір #${t.id}`;

  const sub = document.createElement("div");
  sub.className = "mode-sub";
  const playersInfo =
    t.players_total && t.players_pass
      ? `${t.players_total} учасників • ${t.players_pass} проходять`
      : "Турнір DreamX";

  sub.textContent = playersInfo;

  const bottomRow = document.createElement("div");
  bottomRow.className = "tour-card-bottom";

  const startLabel = document.createElement("div");
  startLabel.className = "tour-start-label";
  startLabel.textContent = ""; // заповнимо в updateCardTimer

  const btn = document.createElement("button");
  btn.className = "tour-join-btn";
  btn.textContent = "ВІДКРИТИ ТУРНІР";
  btn.addEventListener("click", () => {
    if (btn.disabled) return;

    // відкриваємо екран бою з id турніру
    const params = new URLSearchParams(window.location.search);
    params.set("tournament_id", t.id);
    const qs = params.toString();
    window.location.href = qs
      ? `tournament_game.html?${qs}`
      : `tournament_game.html?tournament_id=${t.id}`;
  });

  bottomRow.appendChild(startLabel);
  bottomRow.appendChild(btn);

  wrapper.appendChild(title);
  wrapper.appendChild(sub);
  wrapper.appendChild(bottomRow);

  // Одразу виставимо початковий стан таймера
  updateCardTimer(wrapper);

  return wrapper;
}

// ======================
//  ЗАВАНТАЖЕННЯ ТУРНІРІВ
// ======================

async function loadTournaments() {
  const listEl = document.getElementById("tournaments-list");
  if (!listEl) return;

  listEl.innerHTML = "Завантаження турнірів…";

  try {
    const res = await fetch(`${API_BASE}/api/get_tournaments`);
    if (!res.ok) throw new Error("http " + res.status);

    const data = await res.json();
    const tournaments = data.tournaments || [];

    const now = Date.now();
    const fiveMinutesMs = 5 * 60 * 1000;

    // ⚠️ Фільтр:
    // турніри, у яких start_at + 5 хв < зараз — НЕ показуємо
    const freshTournaments = tournaments.filter((t) => {
      if (!t.start_at) return false;
      const startMs = parseBackendTimeToMs(t.start_at); // ✅ UTC
      if (Number.isNaN(startMs)) return false;
      const endWindow = startMs + fiveMinutesMs;
      return endWindow >= now;
    });

    if (!freshTournaments.length) {
      listEl.textContent = "Поки немає запланованих турнірів.";
      return;
    }

    listEl.innerHTML = "";
    freshTournaments.forEach((t) => {
      const card = renderTournamentCard(t);
      listEl.appendChild(card);
    });

    // Після першого рендеру — оновлюємо таймери щосекунди
    refreshCountdowns();
    setInterval(refreshCountdowns, 1000);
  } catch (err) {
    console.error("loadTournaments error:", err);
    listEl.textContent = "Не вдалося завантажити турніри.";
  }
}

// ======================
//  ІНІЦІАЛІЗАЦІЯ
// ======================

document.addEventListener("DOMContentLoaded", () => {
  // Кнопка "Швидка гра" vs комп (якщо є на сторінці)
  const modeBtn = document.getElementById("mode-vs-computer");
  if (modeBtn) {
    modeBtn.addEventListener("click", () => {
      const params = new URLSearchParams(window.location.search);
      params.delete("points");
      const qs = params.toString();
      window.location.href = qs ? `game.html?${qs}` : "game.html";
    });
  }

  // Кнопка "Тестовий турнір" (локальний, без реального id)
  const tourTestBtn = document.getElementById("mode-tournament-test");
  if (tourTestBtn) {
    tourTestBtn.addEventListener("click", () => {
      const params = new URLSearchParams(window.location.search);
      params.delete("points");
      const qs = params.toString();
      window.location.href = qs
        ? `tournament_game.html?${qs}`
        : "tournament_game.html";
    });
  }

  // Кнопка "Назад" на головний екран
  const backBtn = document.getElementById("back-home");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const params = new URLSearchParams(window.location.search);
      params.delete("points");
      const qs = params.toString();
      window.location.href = qs ? `index.html?${qs}` : "index.html";
    });
  }

  // Стартуємо завантаження турнірів
  loadTournaments();
});
