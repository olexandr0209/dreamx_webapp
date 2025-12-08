// tournaments_screen.js
// Логіка списку турнірів + кнопка з таймером

// 🔗 Базовий URL API.
// Якщо в dreamx_core.js вже є глобальна змінна – використовуємо її.
const API_BASE =
    window.DREAMX_API_BASE ||
    "https://dreamx-api.onrender.com";
 // 🔁 підстав свій домен бота

// Допоміжна функція: формат "HH:MM" із різниці в мс
function formatDiffToHHMM(diffMs) {
    if (diffMs <= 0) return "00:00";

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    return `${hh}:${mm}`;
}

// Малюємо одну карточку турніру
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

    const now = Date.now();
    const startMs = Date.parse(t.start_at);
    const diff = startMs - now;

    if (diff <= 0) {
        startLabel.textContent = "Можна заходити";
    } else {
        const hhmm = formatDiffToHHMM(diff);
        startLabel.textContent = `Старт через ${hhmm}`;
    }

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
            : `tournament_game.html?tournament_id=${t.id}`;
    });

    bottomRow.appendChild(startLabel);
    bottomRow.appendChild(btn);

    wrapper.appendChild(title);
    wrapper.appendChild(sub);
    wrapper.appendChild(bottomRow);

    return wrapper;
}

// Оновлюємо тільки текст таймерів на вже намальованих картках
function refreshCountdowns() {
    const cards = document.querySelectorAll(".tournament-card");
    const now = Date.now();

    cards.forEach((card) => {
        const startIso = card.dataset.startAt;
        if (!startIso) return;

        const startMs = Date.parse(startIso);
        const diff = startMs - now;

        const label = card.querySelector(".tour-start-label");
        if (!label) return;

        if (diff <= 0) {
            label.textContent = "Можна заходити";
        } else {
            const hhmm = formatDiffToHHMM(diff);
            label.textContent = `Старт через ${hhmm}`;
        }
    });
}

// Завантаження турнірів з бекенда
async function loadTournaments() {
    const listEl = document.getElementById("tournaments-list");
    if (!listEl) return;

    listEl.innerHTML = "Завантаження турнірів…";

    try {
        const res = await fetch(`${API_BASE}/api/get_tournaments`);
        if (!res.ok) throw new Error("http " + res.status);

        const data = await res.json();
        const tournaments = data.tournaments || [];

        if (!tournaments.length) {
            listEl.textContent = "Поки немає запланованих турнірів.";
            return;
        }

        listEl.innerHTML = "";
        tournaments.forEach((t) => {
            const card = renderTournamentCard(t);
            listEl.appendChild(card);
        });

        // Після першого рендеру — оновлюємо таймери раз у хвилину
        refreshCountdowns();
        setInterval(refreshCountdowns, 60 * 1000);
    } catch (err) {
        console.error("loadTournaments error:", err);
        listEl.textContent = "Не вдалося завантажити турніри.";
    }
}

// Ініціалізація
document.addEventListener("DOMContentLoaded", () => {
    // Твої старі кнопки:
    const modeBtn = document.getElementById("mode-vs-computer");
    if (modeBtn) {
        modeBtn.addEventListener("click", () => {
            const params = new URLSearchParams(window.location.search);
            params.delete("points");
            const qs = params.toString();
            window.location.href = qs ? `game.html?${qs}` : "game.html";
        });
    }

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
