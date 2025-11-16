const resultEl = document.getElementById("result");
const choices = document.querySelectorAll(".choice");
const body = document.querySelector(".game-body"); // вся сторінка гри

const coinValue = document.getElementById("coin-value");
const plusOneEl = document.getElementById("plus-one");

const options = ["stone", "scissors", "paper"];
let locked = false;
let coins = 0;

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
    resultEl.classList.remove("result-win", "result-lose", "result-draw");

    // прибираємо glow з фону
    if (body) {
        body.classList.remove("glow-win", "glow-lose", "glow-draw");
    }

    // ховаємо +1
    if (plusOneEl) {
        plusOneEl.classList.remove("plus-visible");
    }

    // базовий текст
    resultEl.textContent = "Choose";

    locked = false;
}

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

        // очищаємо попередні анімації
        resultEl.classList.remove("result-win", "result-lose", "result-draw");
        if (body) {
            body.classList.remove("glow-win", "glow-lose", "glow-draw");
    }

        // --- ЛОГІКА РЕЗУЛЬТАТУ + МОНЕТИ ---

        if (final === "YOU WIN") {
            resultEl.textContent = "You WIN! 🔥";
            resultEl.classList.add("result-win");
            if (body) body.classList.add("glow-win");

            // +1 монета
            coins += 1;
            if (coinValue) {
                coinValue.textContent = coins;
            }

            // показати +1
            if (plusOneEl) {
                plusOneEl.classList.add("plus-visible");
            }

        } else if (final === "YOU LOSE") {
            resultEl.textContent = "You lose ❌";
            resultEl.classList.add("result-lose");
            if (body) body.classList.add("glow-lose");

        } else {
            resultEl.textContent = "Draw 🤝";
            resultEl.classList.add("result-draw");
            if (body) body.classList.add("glow-draw");
        }

        // через 1 секунду повертаємо все назад
        setTimeout(() => {
            resetState();
        }, 1000);
    });
});

// початковий стан
resetState();
