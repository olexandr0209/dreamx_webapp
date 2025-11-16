const tg = window.Telegram.WebApp;

tg.expand(); // зробити вебап на повний екран

const resultEl = document.getElementById("result");
const playerNameEl = document.getElementById("player-name");

if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
  playerNameEl.textContent = tg.initDataUnsafe.user.first_name || "You";
}

const choices = ["rock", "paper", "scissors"];

function randomChoice() {
  return choices[Math.floor(Math.random() * choices.length)];
}

function getResultText(player, bot) {
  if (player === bot) return `Draw 🤝 (${player} = ${bot})`;

  if (
    (player === "rock" && bot === "scissors") ||
    (player === "scissors" && bot === "paper") ||
    (player === "paper" && bot === "rock")
  ) {
    return `You WIN! 🔥 (${player} vs ${bot})`;
  }

  return `You lose 😔 (${player} vs ${bot})`;
}

document.querySelectorAll(".choice").forEach((btn) => {
  btn.addEventListener("click", () => {
    const player = btn.dataset.choice;
    const bot = randomChoice();
    const text = getResultText(player, bot);
    resultEl.textContent = text;

    // Надіслати дані назад боту (якщо захочемо)
    tg.sendData(JSON.stringify({ player, bot, result: text }));
  });
});
