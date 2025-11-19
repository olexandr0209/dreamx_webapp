const resultEl = document.getElementById("result");
const choices = document.querySelectorAll(".choice");
const body = document.querySelector(".game-body"); // вся сторінка гри
const coinValue = document.getElementById("coin-value");
const flashOverlay = document.getElementById("flash-overlay"); // ✅ нове
// Адреса сервісу, де працює main.py (бот + PointsAPI)
const API_BASE = "https://dreamx-bot.onrender.com";

async function loadPoints() {
    const userId = window.DreamX.getUserId();  // 👈 беремо з нашого core

    if (!userId) {
        console.log("Немає user_id (ані з Telegram, ані з localStorage)");
        return;
    }

    try {
        const url = `${API_BASE}/api/get_points?user_id=${userId}`;

        console.log("GET points from:", url);

        const res = await fetch(url);
        console.log("Status get_points:", res.status);

        if (!res.ok) return;

        const data = await res.json();
        console.log("Data from server:", data);

        coins = data.points ?? 0;

        if (coinValue) {
            coinValue.textContent = coins;
        }

        //if (resultEl) {
        //    resultEl.textContent = "Loaded: " + coins; // тимчасовий дебаг
        //}
        
        try {
            localStorage.setItem("dreamx_points", String(coins));
        } catch (e) {
            console.log("Не вдалося зберегти dreamx_points в localStorage:", e);
        }


    } catch (e) {
        console.log("Помилка loadPoints:", e);
    }
}


const options = ["stone", "scissors", "paper"];
let locked = false;
let coins = 0;
let pendingPoints = 0;

if (coinValue) {
    // можемо або нічого не показувати, або поставити "..."
    coinValue.textContent = "...";
}


// ✅ окрема функція для скидання флеша
function resetFlash() {
    if (!flashOverlay) return;
    flashOverlay.className = ""; // прибираємо всі класи
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
    
    const circle = document.getElementById("computer-pick-circle");
    if (circle) {
    circle.style.opacity = "0";        
    circle.style.transform = "scale(0.7)";
    }
    
    locked = false;
}

// Основна логіка гри
choices.forEach(choice => {
    choice.addEventListener("click", () => {
        if (locked) return;
        locked = true;

        const playerChoice = choice.dataset.choice;

        // вибраний — великий, інші — маленькі
        choices.forEach(c => {
            if (c === choice) {
                c.classList.add("active");
                c.classList.remove("small");
            } else {
                c.classList.add("small");
                c.classList.remove("active");
            }
        });

        const botChoice = getBotChoice();

        // показати вибір комп’ютера
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
        let delay = 600; // базово — 0.6 секунди

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
            
            // 🔥 ОДРАЗУ ВІДПРАВЛЯЄМО В БАЗУ
            savePointsToServer();

            delay = 1000; // трошки довше показуємо перемогу

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
        

        // через delay повертаємо все назад
        setTimeout(() => {
            resetState();
        }, delay);
    });
});

async function savePointsToServer() {
    if (pendingPoints <= 0) {
        console.log("Немає очок для збереження");
        return;
    }

    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : null;

    if (!userId) {
        console.log("Немає user_id (ані з Telegram, ані з localStorage)");
        return;
    }

    const delta = pendingPoints;
    pendingPoints = 0; // одразу обнуляємо буфер, щоб не подвоїти

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
        if (!res.ok) return;

        const data = await res.json();
        console.log("Response add_points:", data);

        // можемо просто оновити кеш, але НЕ перезаписувати локальний coins
        if (data && typeof data.points === "number") {
            try {
                localStorage.setItem("dreamx_points", String(data.points));
            } catch (e) {
                console.log("Не вдалося зберегти dreamx_points після POST:", e);
            }
        }
    } catch (e) {
        console.log("Помилка savePointsToServer:", e);
    }
}


// Викликається з HTML-кнопки
function exitGame() {
    window.location.href = "index.html";
}


resetState();   // щоб усе було в стартовому стані
loadPoints();   // тягнемо актуальні бали з Postgres
