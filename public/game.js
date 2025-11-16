const resultEl = document.getElementById("result");
const choices = document.querySelectorAll(".choice");
const flash = document.getElementById("flash-overlay");

const options = ["stone", "scissors", "paper"];
let locked = false; // щоб не клікали, поки йде анімація

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
    // прибираємо підсвітку екрану
    flash.className = "";

    // базовий текст
    resultEl.textContent = "Choose";

    locked = false;
}

// клік по кружечку
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

        // хід бота + результат
        const botChoice = getBotChoice();
        const final = getResult(playerChoice, botChoice);

        // очищаємо старі класи
        resultEl.classList.remove("result-win", "result-lose", "result-draw");
        flash.className = "";

        // встановлюємо текст + анімацію + підсвітку
        if (final === "YOU WIN") {
            resultEl.textContent = "You WIN! 🔥";
            resultEl.classList.add("result-win");
            flash.classList.add("flash-win", "flash-active");
        } else if (final === "YOU LOSE") {
            resultEl.textContent = "You lose ❌";
            resultEl.classList.add("result-lose");
            flash.classList.add("flash-lose", "flash-active");
        } else {
            resultEl.textContent = "Draw 🤝";
            resultEl.classList.add("result-draw");
            flash.classList.add("flash-draw", "flash-active");
        }

        // через 1 секунду повертаємо все назад
        setTimeout(() => {
            resetState();
        }, 1000);
    });
});

// початковий стан при завантаженні
resetState();
