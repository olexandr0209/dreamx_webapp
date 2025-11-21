const resultEl = document.getElementById("result");
const choices = document.querySelectorAll(".choice");
const body = document.querySelector(".game-body"); // вся сторінка гри
const coinValue = document.getElementById("coin-value");
const flashOverlay = document.getElementById("flash-overlay"); // ✅ нове

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

if (tourFinishedBack) {
    tourFinishedBack.addEventListener("click", () => {
        exitGame();  // вихід на головну з автозбереженням
    });
}



let canPlay = false; // 👈 гра недоступна поки не прийшли монети з бази


// Адреса сервісу, де працює main.py (бот + PointsAPI)
const API_BASE = "https://dreamx-bot.onrender.com";

async function loadPoints() {
    const userId = window.DreamX.getUserId();

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
        // На звичайній грі показуємо загальні монети,
        // у режимі розіграшу — НЕ чіпаємо (там покажемо points_tour)
        if (coinValue && !isTourMode) {
            coinValue.textContent = coins;
        }
        canPlay = true;
        choices.forEach(c => c.classList.remove("disabled"));

        // Зберігаємо в кеш (не обовʼязково)
        try {
            localStorage.setItem("dreamx_points", String(coins));
        } catch {}

        // 🔥 І ТУТ МИ ВКЛЮЧАЄМО ГРУ 
        locked = false;  // раптом щось залишилось заблоковане

        console.log("Монети завантажені. Гра активована.");

    } catch (e) {
        console.log("Помилка loadPoints:", e);
    }
}

async function loadTourPoints() {
    if (!isTourMode) return;

    const userId = window.DreamX.getUserId();
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

        if (coinValue && isTourMode) {
            coinValue.textContent = tourPoints;
        }

        updateTourUI();
    } catch (e) {
        console.log("Помилка loadTourPoints:", e);
    }
}



const giveaways = [
    {
        typeTag: "GIVEAWAY",
        prize: "$10",
        title: "First DreamX Giveaway",
        description: "Earn 5 Coins in the game to join the $10 draw.",
        buttonText: "JOIN",
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

        // 🔥 Гарантуємо, що користувач є в базі
        await ensureUserInDB();

        if (data.actionType === "open_channel") {
            window.open(data.actionPayload, "_blank");
        }

        if (data.actionType === "open_link") {
            window.open(data.actionPayload, "_blank");
        }

        if (data.actionType === "open_tournament") {
            console.log("Open tournament:", data.actionPayload);
            // window.location.href = "tournaments.html";
        }

        // 🎁 Режим розіграшу на $10
        if (data.actionType === "open_tour_game") {
            const qs = window.location.search;  // збережемо ?tgWebAppStartParam=...
            window.location.href = "game.html?mode=tour" + qs;
        }
    };


    return card;
}



function renderGiveawayList() {
    const list = document.getElementById("giveaway-list");
    if (!list) {
        console.warn("giveaway-list container not found");
        return;
    }

    list.innerHTML = "";
    
    giveaways.forEach(g => {
        const cardEl = createGiveawayCard(g);
        list.appendChild(cardEl);
    });
}



const options = ["stone", "scissors", "paper"];
let locked = false;
let coins = 0;
let pendingPoints = 0;

if (coinValue) {
    // можемо або нічого не показувати, або поставити "..."
    coinValue.textContent = "...";
}

// ❌ Забороняємо грати до завантаження монет
choices.forEach(c => c.classList.add("disabled"));


// ✅ окрема функція для скидання флеша
function resetFlash() {
    if (!flashOverlay) return;
    flashOverlay.className = ""; // прибираємо всі класи
}

function updateTourUI() {
    if (!isTourMode) return;

    if (tourStatus && tourStatusText) {
        tourStatus.classList.remove("hidden");
        tourStatusText.textContent =
            `Earn 5 Coins to join the $10 giveaway: ${tourPoints} / ${TOUR_TARGET}`;
    }

    if (tourFinishedOverlay) {
        if (tourPoints >= TOUR_TARGET) {
            tourFinishedOverlay.classList.remove("hidden");
        } else {
            tourFinishedOverlay.classList.add("hidden");
        }
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

    const icons = {
        stone: "✊",
        paper: "✋",
        scissors: "✌️"
    };

    symbol.textContent = icons[choice];

    // Анімація
    circle.style.opacity = "1";
    circle.style.transform = "scale(1)";
}

function showPlayerPick(choice) {
    if (!playerPickCircle || !playerPickSymbol) return;

    const icons = {
        stone: "✊",
        paper: "✋",
        scissors: "✌️"
    };

    playerPickSymbol.textContent = icons[choice];
    playerPickCircle.style.opacity = "1";
    playerPickCircle.style.transform = "scale(1)";
}


function resetState() {
    // скидаємо розміри кружечків
    choices.forEach(c => {
        c.classList.remove("active");
        c.classList.remove("small");
    });

    // прибираємо анімації результату
    if (resultEl) {
        resultEl.classList.remove("result-win", "result-lose", "result-draw");
        resultEl.textContent = "Choose";
    }

    // прибираємо glow з фону
    if (body) {
        body.classList.remove("glow-win", "glow-lose", "glow-draw");
    }

    // ✅ прибираємо флеш-підсвітку
    resetFlash();
    
    // Сховати вибір комп'ютера
    if (computerPickCircle) {
        computerPickCircle.style.opacity = "0";
        computerPickCircle.style.transform = "scale(0.7)";
    }

    // Сховати вибір гравця
    if (playerPickCircle) {
        playerPickCircle.style.opacity = "0";
        playerPickCircle.style.transform = "scale(0.7)";
    }

    // Повернути трикутник
    if (gameArea) {
        gameArea.classList.remove("hidden");
    }

    locked = false;
}


// Основна логіка гри — режим "дуелі"
choices.forEach(choice => {
    choice.addEventListener("click", () => {
        if (!canPlay) {
            console.log("Гра ще не готова. Очікуємо завантаження монет.");
            return;
        }
        if (locked) return;
        locked = true;

        const playerChoice = choice.dataset.choice;

        // При кліку ховаємо трикутник і показуємо жест гравця внизу
        if (gameArea) {
            gameArea.classList.add("hidden");
        }
        showPlayerPick(playerChoice);

        // Невелика пауза, потім показуємо комп'ютера і результат
        setTimeout(() => {
            const botChoice = getBotChoice();

            // показати вибір комп’ютера зверху
            showComputerPick(botChoice);
            
            const final = getResult(playerChoice, botChoice);

            // очищаємо попередні анімації + glow
            if (resultEl) {
                resultEl.classList.remove("result-win", "result-lose", "result-draw");
            }
            if (body) {
                body.classList.remove("glow-win", "glow-lose", "glow-draw");
            }
            resetFlash(); // ✅ скидаємо флеш перед новим результатом

            // --- ЛОГІКА РЕЗУЛЬТУ + МОНЕТИ ---
            let delay = 600; // DRAW / LOSE = 0.6 cек

            if (final === "YOU WIN") {
                if (resultEl) {
                    resultEl.innerHTML = 'You WIN! 🔥<br><span class="plus-one-inline">+1</span>';
                    resultEl.classList.add("result-win");
                }
                if (body) body.classList.add("glow-win");

                if (flashOverlay) {
                    flashOverlay.classList.add("flash-win", "flash-active");
                }

                coins += 1;
                pendingPoints += 1;
                if (coinValue) {
                    coinValue.textContent = coins;
                }

                // Якщо ми в режимі розіграшу — рахуємо спеціальні монети
                if (isTourMode && tourPoints < TOUR_TARGET) {
                    tourPoints += 1;
                    tourPending += 1;
                    updateTourUI();
                }
                if (coinValue) {
                    coinValue.textContent = isTourMode ? tourPoints : coins;
                }


                
                // перемога показується довше — 1 секунда
                delay = 1000;

            } else if (final === "YOU LOSE") {
                if (resultEl) {
                    resultEl.textContent = "You lose ❌";
                    resultEl.classList.add("result-lose");
                }
                if (body) body.classList.add("glow-lose");

                if (flashOverlay) {
                    flashOverlay.classList.add("flash-lose", "flash-active");
                }

            } else {
                if (resultEl) {
                    resultEl.textContent = "Draw 🤝";
                    resultEl.classList.add("result-draw");
                }
                if (body) body.classList.add("glow-draw");

                if (flashOverlay) {
                    flashOverlay.classList.add("flash-draw", "flash-active");
                }
            }

            // через delay повертаємо все назад (0.6 / 1.0 сек)
            setTimeout(() => {
                resetState();
            }, delay);

        }, 200); // пауза перед появою вибору комп'ютера
    });
});




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




let isSaving = false; // щоб не робити кілька запитів паралельно

async function savePointsToServer() {
    // Якщо нічого зберігати — виходимо
    if (pendingPoints <= 0) {
        return;
    }

    // Якщо попереднє збереження ще триває — не стартуємо нове
    if (isSaving) {
        return;
    }

    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : null;

    if (!userId) {
        console.log("Немає user_id для збереження");
        return;
    }

    const delta = pendingPoints;  // ЩО ХОЧЕМО ВІДПРАВИТИ
    isSaving = true;

    try {
        const url = `${API_BASE}/api/add_points`;

        console.log("POST points to:", url, "delta:", delta);

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId,
                delta: delta,
            }),
        });

        console.log("Status add_points:", res.status);

        if (!res.ok) {
            // ❌ НЕ обнуляємо pendingPoints, спробуємо ще раз пізніше
            return;
        }

        const data = await res.json();
        console.log("Response add_points:", data);

        // ✅ Запит пройшов УСПІШНО — тепер можна зняти delta з буфера
        pendingPoints -= delta;
        if (pendingPoints < 0) pendingPoints = 0;

        // Оновлюємо кеш (не обов'язково)
        if (data && typeof data.points === "number") {
            try {
                localStorage.setItem("dreamx_points", String(data.points));
            } catch (e) {
                console.log("Не вдалося зберегти dreamx_points після POST:", e);
            }
        }

    } catch (e) {
        console.log("Помилка savePointsToServer:", e);
        // ❌ знову ж таки — pendingPoints НЕ змінюємо
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
            body: JSON.stringify({
                user_id: userId,
                delta: delta,
            }),
        });

        console.log("Status add_tour_points:", res.status);

        if (!res.ok) {
            return;
        }

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


// Викликається з HTML-кнопки
async function exitGame() {
    await savePointsToServer();
    await saveTourPointsToServer();
    window.location.href = "index.html";
}



document.addEventListener("DOMContentLoaded", () => {
    renderGiveawayList();
});

// ✅ Спочатку гарантуємо користувача в БД, потім тягнемо бали
resetState();   // щоб усе було в стартовому стані

(async () => {
    await ensureUserInDB();
    await loadPoints();
    await loadTourPoints();   // якщо режим розіграшу — підтягуємо points_tour
})();


// Авто-збереження очок кожні 5 секунд (якщо є що зберігати)
setInterval(() => {
    savePointsToServer();
    saveTourPointsToServer();
}, 5000);

