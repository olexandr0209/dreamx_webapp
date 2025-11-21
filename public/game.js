// ========================
//   DOM-елементи
// ========================
const resultEl = document.getElementById("result");
const choices = document.querySelectorAll(".choice");
const body = document.querySelector(".game-body");
const coinValue = document.getElementById("coin-value");
const flashOverlay = document.getElementById("flash-overlay");

choices.forEach(c => c.classList.add("disabled"));

const gameArea = document.querySelector(".game-area");
const playerPickCircle = document.getElementById("player-pick-circle");
const playerPickSymbol = document.getElementById("player-pick-symbol");
const computerPickCircle = document.getElementById("computer-pick-circle");
const computerPickSymbol = document.getElementById("computer-pick-symbol");

// --- TOUR (розіграш на $10) ---
const params = new URLSearchParams(window.location.search);
const isTourMode = params.get("mode") === "tour";

const tourStatus = document.getElementById("tour-status");
const tourStatusText = document.getElementById("tour-status-text");
const tourFinishedOverlay = document.getElementById("tour-finished-overlay");
const tourFinishedBack = document.getElementById("tour-finished-back");

let tourPoints = 0;
let tourPending = 0;
const TOUR_TARGET = 5;

// Якщо НЕ тур-режим — ховаємо весь тур-UI про всяк випадок
if (!isTourMode) {
    if (tourStatus) tourStatus.classList.add("hidden");
    if (tourFinishedOverlay) tourFinishedOverlay.classList.add("hidden");
}

// Кнопка Back з оверлею
if (tourFinishedBack) {
    tourFinishedBack.addEventListener("click", () => {
        exitGame();  // вихід на головну з автозбереженням
    });
}

let canPlay = false; // гра недоступна поки не прийшли монети з бази

// Адреса бекенду
const API_BASE = "https://dreamx-bot.onrender.com";

// ========================
//   Завантаження монет
// ========================

// Звичайні монети (таблиця players.points)
// Звичайні монети (points) — тільки для НЕ tour режиму
async function loadPoints() {
    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : null;

    if (!userId) {
        console.log("Немає user_id");
        return;
    }

    try {
        const url = `${API_BASE}/api/get_points?user_id=${userId}`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        coins = data.points ?? 0;

        // На звичайній грі показуємо загальні монети
        if (!isTourMode && coinValue) {
            coinValue.textContent = coins;
        }

        // Грати дозволяємо тільки в звичайному режимі через цю функцію
        if (!isTourMode) {
            canPlay = true;
            choices.forEach(c => c.classList.remove("disabled"));
        }

        try {
            localStorage.setItem("dreamx_points", String(coins));
        } catch {}

        console.log("Монети (points) завантажені:", coins);

    } catch (e) {
        console.log("Помилка loadPoints:", e);
    }
}

// Турнірні монети (points_tour) — тільки для tour режиму
async function loadTourPoints() {
    if (!isTourMode) return;

    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : null;

    if (!userId) {
        console.log("Немає user_id для loadTourPoints");
        return;
    }

    try {
        const url = `${API_BASE}/api/get_tour_points?user_id=${userId}`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        tourPoints = data.points_tour ?? 0;

        // У тур-режимі в топ-барі завжди показуємо саме tour монети
        if (coinValue) {
            coinValue.textContent = tourPoints;
        }

        // Можна грати тільки якщо ще не набрали 5
        canPlay = tourPoints < TOUR_TARGET;
        choices.forEach(c => {
            c.classList.toggle("disabled", !canPlay);
        });

        updateTourUI();

        console.log("Турнірні монети (points_tour) завантажені:", tourPoints);

    } catch (e) {
        console.log("Помилка loadTourPoints:", e);
    }
}


// ========================
//   Giveaway-картка (головний екран)
// ========================

const giveaways = [
    {
        typeTag: "РОЗІГРАШ",
        prize: "$10",
        title: "ПЕРШИЙ DreamX РОЗІГРАШ",
        description: "ЗАРОБИ 5 МОНЕТ І ПРИЄДНАЙСЯ ДО РОЗІГРАШУ.",
        buttonText: "ПРИЄДНАТИСЬ",
        actionType: "open_tour_game",
        actionPayload: ""
    }
];

function createGiveawayCard(data) {
    const card = document.createElement("div");
    card.className = "giveaway-card";

    card.innerHTML = `
        <div class="giveaway-header">
            <div class="giveaway-left">
                <div class="giveaway-avatar"></div>
                <span class="giveaway-tag">${data.typeTag}</span>
            </div>
            <div class="giveaway-prize">
                <span class="prize-amount">${data.prize}</span>
            </div>
        </div>

        <div class="giveaway-body">
            <h2 class="giveaway-title">${data.title}</h2>
            <p class="giveaway-description">${data.description}</p>
        </div>

        <div class="giveaway-footer">
            <button class="giveaway-btn">${data.buttonText}</button>
        </div>
    `;

    const btn = card.querySelector(".giveaway-btn");

    btn.onclick = async () => {
        console.log("Clicked:", data);

        await ensureUserInDB();

        if (data.actionType === "open_channel") {
            window.open(data.actionPayload, "_blank");
        }

        if (data.actionType === "open_link") {
            window.open(data.actionPayload, "_blank");
        }

        if (data.actionType === "open_tournament") {
            console.log("Open tournament:", data.actionPayload);
        }

        if (data.actionType === "open_tour_game") {
            // Для тур-режиму нам достатньо mode=tour
            window.location.href = "game.html?mode=tour";
        }

    };

    return card;
}

function renderGiveawayList() {
    const list = document.getElementById("giveaway-list");
    if (!list) return;

    list.innerHTML = "";
    giveaways.forEach(g => list.appendChild(createGiveawayCard(g)));
}

// ========================
//   Логіка гри
// ========================

const options = ["stone", "scissors", "paper"];
let locked = false;
let coins = 0;
let pendingPoints = 0;

if (coinValue) {
    coinValue.textContent = "...";
}

// Забороняємо грати до завантаження монет
choices.forEach(c => c.classList.add("disabled"));

// Скидання флеша
function resetFlash() {
    if (!flashOverlay) return;
    flashOverlay.className = "";
}

// Оновлення UI розіграшу
function updateTourUI() {
    if (!isTourMode) return;

    if (tourStatus && tourStatusText) {
        tourStatus.classList.remove("hidden");
        tourStatusText.textContent =
            `Зароби 5 монет щоб взяти участь: ${tourPoints} / ${TOUR_TARGET}`;
    }

    const finished = tourPoints >= TOUR_TARGET;

    if (finished) {
        if (tourFinishedOverlay) {
            tourFinishedOverlay.classList.remove("hidden");
        }

        canPlay = false;
        choices.forEach(c => c.classList.add("disabled"));

        if (gameArea) gameArea.classList.add("hidden");
        if (resultEl) resultEl.classList.add("hidden");
    } else {
        if (tourFinishedOverlay) {
            tourFinishedOverlay.classList.add("hidden");
        }
        // тут більше нічого не робимо
    }
}



function getBotChoice() {
    return options[Math.floor(Math.random() * options.length)];
}

function getResult(player, bot) {
    if (player === bot) return "DRAW";
    if (
        (player === "stone" && bot === "scissors") ||
        (player === "scissors" && bot === "paper") ||
        (player === "paper" && bot === "stone")
    ) return "YOU WIN";
    return "YOU LOSE";
}

function showComputerPick(choice) {
    const circle = document.getElementById("computer-pick-circle");
    const symbol = document.getElementById("computer-pick-symbol");

    const icons = { stone: "✊", paper: "✋", scissors: "✌️" };
    symbol.textContent = icons[choice];

    circle.style.opacity = "1";
    circle.style.transform = "scale(1)";
}

function showPlayerPick(choice) {
    if (!playerPickCircle || !playerPickSymbol) return;

    const icons = { stone: "✊", paper: "✋", scissors: "✌️" };
    playerPickSymbol.textContent = icons[choice];
    playerPickCircle.style.opacity = "1";
    playerPickCircle.style.transform = "scale(1)";
}

function resetState() {
    choices.forEach(c => {
        c.classList.remove("active");
        c.classList.remove("small");
    });

    if (resultEl) {
        resultEl.classList.remove("result-win", "result-lose", "result-draw");
        resultEl.textContent = "Обери";
        resultEl.classList.remove("hidden");
    }

    if (body) {
        body.classList.remove("glow-win", "glow-lose", "glow-draw");
    }

    resetFlash();

    if (computerPickCircle) {
        computerPickCircle.style.opacity = "0";
        computerPickCircle.style.transform = "scale(0.7)";
    }

    if (playerPickCircle) {
        playerPickCircle.style.opacity = "0";
        playerPickCircle.style.transform = "scale(0.7)";
    }

    if (gameArea) {
        gameArea.classList.remove("hidden");
    }

    locked = false;
}

// Кліки по вибору
choices.forEach(choice => {
    choice.addEventListener("click", () => {
        // Якщо це тур-режим і вже 5+ монет — гра заблокована
        if (isTourMode && tourPoints >= TOUR_TARGET) {
            console.log("Вже в розіграші – гра вимкнена.");
            return;
        }

        if (!canPlay) {
            console.log("Гра ще не готова. Очікуємо завантаження монет.");
            return;
        }
        if (locked) return;
        locked = true;

        const playerChoice = choice.dataset.choice;

        // спочатку плавно ховаємо трикутник
        if (gameArea) gameArea.classList.add("hidden");

        // гарантуємо, що старі кружки сховані
        if (computerPickCircle) {
            computerPickCircle.style.opacity = "0";
            computerPickCircle.style.transform = "scale(0.7)";
        }
        if (playerPickCircle) {
            playerPickCircle.style.opacity = "0";
            playerPickCircle.style.transform = "scale(0.7)";
        }

        // даємо 150 мс, щоб трикутник згас → потім показуємо вибір гравця
        setTimeout(() => {
            showPlayerPick(playerChoice);

            // ще через 200 мс показуємо вибір компʼютера
            setTimeout(() => {
                const botChoice = getBotChoice();
                showComputerPick(botChoice);

                const final = getResult(playerChoice, botChoice);

                if (resultEl) {
                    resultEl.classList.remove("result-win", "result-lose", "result-draw");
                }
                if (body) {
                    body.classList.remove("glow-win", "glow-lose", "glow-draw");
                }
                resetFlash();

                let delay = 1000;

                if (final === "YOU WIN") {
                    if (resultEl) {
                        resultEl.innerHTML =
                            'ВИГРАШ! 🔥<br><span class="plus-one-inline">+1</span>';
                        resultEl.classList.add("result-win");
                    }
                    if (body) body.classList.add("glow-win");
                    if (flashOverlay) {
                        flashOverlay.classList.add("flash-win", "flash-active");
                    }

                    if (isTourMode) {
                        if (tourPoints < TOUR_TARGET) {
                            tourPoints += 1;
                            tourPending += 1;
                            updateTourUI();
                        }
                    } else {
                        coins += 1;
                        pendingPoints += 1;
                    }

                    if (coinValue) {
                        coinValue.textContent = isTourMode ? tourPoints : coins;
                    }

                    delay = 1000;
                } else if (final === "YOU LOSE") {
                    if (resultEl) {
                        resultEl.textContent = "ПРОГРАШ ❌";
                        resultEl.classList.add("result-lose");
                    }
                    if (body) body.classList.add("glow-lose");
                    if (flashOverlay) {
                        flashOverlay.classList.add("flash-lose", "flash-active");
                    }
                } else {
                    if (resultEl) {
                        resultEl.textContent = "НІЧИЯ 🤝";
                        resultEl.classList.add("result-draw");
                    }
                    if (body) body.classList.add("glow-draw");
                    if (flashOverlay) {
                        flashOverlay.classList.add("flash-draw", "flash-active");
                    }
                }

                setTimeout(() => {
                    resetState();
                }, delay);

            }, 50); // між гравцем і компʼютером
        }, 150); // даємо трикутнику сховатись
    });
});

// ========================
//   API: ensure_user, save
// ========================

async function ensureUserInDB() {
    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : null;

    if (!userId) {
        console.log("ensureUserInDB: немає user_id");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/ensure_user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId })
        });

        console.log("ensure_user status:", res.status);
    } catch (e) {
        console.log("Помилка ensureUserInDB:", e);
    }
}

let isSaving = false;

async function savePointsToServer() {
    if (pendingPoints <= 0) return;
    if (isSaving) return;

    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : null;

    if (!userId) {
        console.log("Немає user_id для збереження");
        return;
    }

    const delta = pendingPoints;
    isSaving = true;

    try {
        const url = `${API_BASE}/api/add_points`;

        console.log("POST points to:", url, "delta:", delta);

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, delta })
        });

        console.log("Status add_points:", res.status);
        if (!res.ok) return;

        const data = await res.json();
        console.log("Response add_points:", data);

        pendingPoints -= delta;
        if (pendingPoints < 0) pendingPoints = 0;

        if (data && typeof data.points === "number") {
            try {
                localStorage.setItem("dreamx_points", String(data.points));
            } catch (e) {
                console.log("Не вдалося зберегти dreamx_points після POST:", e);
            }
        }
    } catch (e) {
        console.log("Помилка savePointsToServer:", e);
    } finally {
        isSaving = false;
    }
}

let isSavingTour = false;

async function saveTourPointsToServer() {
    if (!isTourMode) return;
    if (tourPending <= 0) return;
    if (isSavingTour) return;

    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : null;

    if (!userId) {
        console.log("Немає user_id для збереження tour");
        return;
    }

    const delta = tourPending;
    isSavingTour = true;

    try {
        const url = `${API_BASE}/api/add_tour_points`;

        console.log("POST tour points to:", url, "delta:", delta);

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, delta })
        });

        console.log("Status add_tour_points:", res.status);
        if (!res.ok) return;

        const data = await res.json();
        console.log("Response add_tour_points:", data);

        tourPending -= delta;
        if (tourPending < 0) tourPending = 0;
    } catch (e) {
        console.log("Помилка saveTourPointsToServer:", e);
    } finally {
        isSavingTour = false;
    }
}

// Викликається з HTML-кнопки Back
async function exitGame() {
    await savePointsToServer();
    await saveTourPointsToServer();
    window.location.href = "index.html";
}

// ========================
//   Ініціалізація
// ========================

document.addEventListener("DOMContentLoaded", () => {
    renderGiveawayList(); // на game.html просто нічого не знайде і вийде
});

resetState();   // стартовий стан

(async () => {
    await ensureUserInDB();

    // Спочатку завжди тягнемо звичайні монети (для /start, статистики і т.д.)
    await loadPoints();

    // Якщо це тур-режим — поверх цього підтягуємо points_tour
    await loadTourPoints();
})();

// Автозбереження кожні 5 секунд
setInterval(() => {
    savePointsToServer();
    saveTourPointsToServer();
}, 5000);
