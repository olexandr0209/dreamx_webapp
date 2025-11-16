const resultEl = document.getElementById("result");
const choices = document.querySelectorAll(".choice");

const options = ["stone", "scissors", "paper"];

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

    // скидаємо класи анімацій + текст
    resultEl.classList.remove("result-win", "result-lose", "result-draw");
    resultEl.textContent = "Choose";
}

// клік по кружечку
choices.forEach(choice => {
    choice.addEventListener("click", () => {
        const playerChoice = choice.dataset.choice;

        // вибраний — великий
        choice.classList.add("active");

        // інші — менші
        choices.forEach(c => {
            if (c !== choice) c.classList.add("small");
        });

        // хід бота + результат
        const botChoice = getBotChoice();
        const final = getResult(playerChoice, botChoice);

        // спочатку приберемо старі анімаційні класи
        resultEl.classList.remove("result-win", "result-lose", "result-draw");

        // встановлюємо текст і клас під анімацію
        if (final === "YOU WIN") {
            resultEl.textContent = "You WIN! 🔥";
            resultEl.classList.add("result-win");
        } else if (final === "YOU LOSE") {
            resultEl.textContent = "You lose ❌";
            resultEl.classList.add("result-lose");
        } else { // DRAW
            resultEl.textContent = "Draw 🤝";
            resultEl.classList.add("result-draw");
        }

        // через 1 секунду все назад у базовий стан
        setTimeout(resetState, 1000);
    });
});

// початковий стан при завантаженні
resetState();
