// tournaments_screen.js
// Логіка списку турнірів + кнопка з живим таймером до старту

// 🔗 Базовий URL API.
// Якщо в dreamx_core.js вже є глобальна змінна – використовуємо її.
const API_BASE =
    window.DREAMX_API_BASE ||
    "https://dreamx-api.onrender.com"; // 🔁 підстав свій домен бота, якщо треба

// =====================
//  Хелпери для часу
// =====================

// Формат різниці в мс у вигляді:
// - якщо > 24 год: "1 д. 15:25:30"
// - якщо <= 24 год: "15:25:30"
function formatDiff(diffMs) {
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

// Оновлюємо одну конкретну карточку турніру (лише таймер/статус)
function updateTournamentCardTimer(card) {
    const startIso = card.dataset.startAt;
    if (!startIso) return;

    const label = card.querySelector(".tour-start-label");
    if (!label) return;

    const now = Date.now();
    const startMs = Date.parse(startIso);
    if (Number.isNaN(startMs)) {
        label.textContent = "Помилка часу";
        return;
    }

    const fiveMinutesMs = 5 * 60 * 1000;
    const endWindow = startMs + fiveMinutesMs;

    // Якщо вікно "старту" вже більше 5 хв як закінчилось – картку можна ховати/видаляти
    if (now > endWindow) {
        card.remove();
        return;
    }

    // Якщо вже настав час старту і ми ще в межах 5 хвилин після нього
    if (now >= startMs && now <= endWindow) {
        label.textContent = "СТАРТУЄМО!";
        return;
    }

    // Інакше ще не стартувало — рахуємо, скільки лишилось
    const diff = startMs - now; // > 0
    label.textContent = formatDiff(diff);
}

// Оновлюємо тільки текст таймерів на вже намальованих картках
function refreshCountdowns() {
    const cards = document.querySelectorAll(".tournament-card");
    cards.forEach((card) => {
        updateTournamentCardTimer(card);
    });
}

// =====================
//  Рендер картки турніру
// =====================

function renderTournamentCard(t) {
    // Очікуємо, що бекенд повертає хоча б:
    // id, title, start_at (ISO-строка), players_total, players_pass
    const wrapper = document.createElement("div");
    wrapper.className = "mode-card tournament-card";
    wrapper.dataset.tournamentId = t.id;
    wrapper.dataset.startAt = t.start_at; // ISO-час старту

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
    startLabel.textContent = "..."; // одразу після рендеру перерахунок зробить refreshCountdowns()

    const btn = document.createElement("button");
    btn.className = "tour-join-btn";
    btn.textContent = "ВІДКРИТИ ТУРНІР";
    btn.addEventListener("click", () => {
        // відкриваємо екран бою з id турніру
        const params = new URLSearchParams(window.location.search);
        params.set("tournament_id", t.id);
        const qs = params.toString();
        window.location.href = qs
            ? `tournament_game.html?${qs}`
            : `tournament_game.html?t.id=${t.id}`;
    });

    bottomRow.appendChild(startLabel);
    bottomRow.appendChild(btn);

    wrapper.appendChild(title);
    wrapper.appendChild(sub);
    wrapper.appendChild(bottomRow);

    // Одразу після створення — порахуємо таймер для поточного моменту
    updateTournamentCardTimer(wrapper);

    return wrapper;
}

// =====================
//  Завантаження турнірів з бекенда
// =====================

async function loadTournaments() {
    const listEl = document.getElementById("tournaments-list");
    if (!listEl) return;

    listEl.innerHTML = "Завантаження турнірів…";

    try:
        const res = await fetch(`${API_BASE}/api/get_tournaments`);
        if (!res.ok) throw new Error("http " + res.status);

        const data = await res.json();
        const tournaments = data.tournaments || [];

        const now = Date.now();
        const fiveMinutesMs = 5 * 60 * 1000;

        // Фільтруємо: якщо start_at + 5 хв < зараз — не показуємо турнір
        const freshTournaments = tournaments.filter((t) => {
            if (!t.start_at) return false;
            const startMs = Date.parse(t.start_at);
            if (Number.isNaN(startMs)) return false;
            const endWindow = startMs + fiveMinutesMs;
            return endWindow >= now; // тільки ті, що ще не "протухли"
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

// =====================
//  Ініціалізація
// =====================

document.addEventListener("DOMContentLoaded", () => {
    // Кнопка "Ти vs Компʼютер"
    const modeBtn = document.getElementById("mode-vs-computer");
    if (modeBtn) {
        modeBtn.addEventListener("click", () => {
            const params = new URLSearchParams(window.location.search);
            params.delete("points");
            const qs = params.toString();
            window.location.href = qs ? `game.html?${qs}` : "game.html";
        });
    }

    // Якщо лишився тест-кнопка для турнірної гри
    const tourTestBtn = document.getElementById("mode-tournament-test");
    if (tourTestBtn) {
        tourTestBtn.addEventListener("click", () => {
            const params = new URLSearchParams(window.location.search);
            params.delete("points");
            const qs = params.toString();
            window.location.href = qs ? `tournament_game.html?${qs}` : "tournament_game.html";
        });
    }

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
