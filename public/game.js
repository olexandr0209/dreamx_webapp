const resultBox = document.getElementById("result");
const choices = document.querySelectorAll(".choice");

const options = ["stone", "scissors", "paper"];

choices.forEach(btn => {
    btn.addEventListener("click", () => {
        const player = btn.dataset.choice;

        // Анімація вибору
        setActive(btn);

        // Запуск раунду з невеликою затримкою
        setTimeout(() => {
            const bot = options[Math.floor(Math.random() * 3)];
            playRound(player, bot);
        }, 500);
    });
});

function setActive(activeBtn) {
    choices.forEach(btn => {
        if (btn === activeBtn) {
            btn.classList.add("active");
            btn.classList.remove("small");
        } else {
            btn.classList.add("small");
            btn.classList.remove("active");
        }
    });
}

function playRound(player, bot) {
    let text = "";

    if (player === bot) {
        text = "Draw 🤝";
    } else if (
        (player === "stone" && bot === "scissors") ||
        (player === "scissors" && bot === "paper") ||
        (player === "paper" && bot === "stone")
    ) {
        text = "You WIN! 🔥";
    } else {
        text = "You lose ❌";
    }

    resultBox.innerHTML = `
        <div>You: ${icon(player)}<br/>Gamer1: ${icon(bot)}</div>
        <div style="margin-top:12px; font-size:24px;">${text}</div>
    `;
}

function icon(name) {
    if (name === "stone") return "🪨";
    if (name === "scissors") return "✂️";
    if (name === "paper") return "📜";
}
