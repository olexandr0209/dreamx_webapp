const resultEl = document.getElementById("result");
const choices = document.querySelectorAll(".choice");
const body = document.querySelector(".game-body"); // вся сторінка гри
const coinValue = document.getElementById("coin-value");
const flashOverlay = document.getElementById("flash-overlay"); // ✅ нове

const options = ["stone", "scissors", "paper"];
let locked = false;
let coins = 0;

// ✅ Безпечна анімація монетки
function animateCoinToBalance() {
    const flying = document.getElementById("flying-coin");
    const coinsDisplay = document.getElementById("coin-value");

    // Якщо чогось немає — просто не анімуємо, але гра не ламається
    if (!flying || !coinsDisplay) return;

    const rect = coinsDisplay.getBoundingClientRect();

    // Початкове положення — строго центр екрана
    flying.style.left = "50%";
    flying.style.top = "50%";
    flying.style.transform = "translate(-50%, -50%) scale(1)";
    flying.style.opacity = "1";

    // Даємо браузеру 1 кадр, щоб зафіксувати старт
    requestAnimationFrame(() => {
        const targetX = rect.left - window.innerWidth / 2 + rect.width / 2;
        const targetY = rect.top - window.innerHeight / 2 + rect.height / 2;

        flying.style.transform = `translate(${targetX}px, ${targetY}px) scale(0.3)`;
        flying.style.opacity = "0";
    });
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
            animateCoinToBalance();
            if (coinValue) {
                coinValue.textContent = coins;
            }

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

// початковий стан
resetState();
