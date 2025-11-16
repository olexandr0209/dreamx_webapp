const resultBox = document.getElementById("result");
const choices = document.querySelectorAll(".choice");

const options = ["stone", "scissors", "paper"];
let locked = false; // блокуємо повторні кліки під час анімації

// Початковий текст
const DEFAULT_TEXT = "Choose";
resultBox.textContent = DEFAULT_TEXT;

choices.forEach(btn => {
    btn.addEventListener("click", () => {
        if (locked) return;   // не даємо клікати поки йде раунд
        locked = true;

        const player = btn.dataset.choice;

        // 1) Анімація: обраний великий, інші маленькі
        setActive(btn);

        // 2) Рахуємо результат
        const bot = options[Math.floor(Math.random() * 3)];
        showResult(player, bot);

        // 3) Через 1 секунду все повертаємо назад
        setTimeout(() => {
            resetIcons();
            resultBox.textContent = DEFAULT_TEXT;
            locked = false;
        }, 1000);
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

function resetIcons() {
    choices.forEach(btn => {
        btn.classList.remove("active");
        btn.classList.remove("small");
        // на всякий випадок скидаємо inline-стилі, якщо будуть
        btn.style.transform = "";
        btn.style.opacity = "";
    });
}

function showResult(player, bot) {
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
        <div>You: ${icon(player)} &nbsp;&nbsp; Gamer1: ${icon(bot)}</div>
        <div style="margin-top:6px; font-size:24px;">${text}</div>
    `;
}

function icon(name) {
    if (name === "stone") return "🪨";
    if (name === "scissors") return "✂️";
    if (name === "paper") return "📜";
}
