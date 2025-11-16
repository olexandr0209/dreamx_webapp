const resultEl = document.getElementById("result");
const choices = document.querySelectorAll(".choice");
const flash = document.getElementById("flash-overlay");

const options = ["stone", "scissors", "paper"];
let locked = false;

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
    choices.forEach(c => {
        c.classList.remove("active");
        c.classList.remove("small");
    });

    resultEl.classList.remove("result-win", "result-lose", "result-draw");

    if (flash) flash.className = "";

    resultEl.textContent = "Choose";
    locked = false;
}

choices.forEach(choice => {
    choice.addEventListener("click", () => {
        if (locked) return;
        locked = true;

        const playerChoice = choice.dataset.choice;

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

        resultEl.classList.remove("result-win", "result-lose", "result-draw");
        if (flash) flash.className = "";

        if (final === "YOU WIN") {
            resultEl.textContent = "You WIN! 🔥";
            resultEl.classList.add("result-win");
            if (flash) flash.classList.add("flash-win", "flash-active");
        } 
        else if (final === "YOU LOSE") {
            resultEl.textContent = "You lose ❌";
            resultEl.classList.add("result-lose");
            if (flash) flash.classList.add("flash-lose", "flash-active");
        } 
        else {
            resultEl.textContent = "Draw 🤝";
            resultEl.classList.add("result-draw");
            if (flash) flash.classList.add("flash-draw", "flash-active");
        }

        setTimeout(() => {
            resetState();
        }, 1000);
    });
});

resetState();
