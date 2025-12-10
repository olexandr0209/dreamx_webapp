// online_1v1.js
// Каркас екрана "Онлайн 1 vs 1" без реальної онлайн-логіки

const tg = window.Telegram && window.Telegram.WebApp;
const USER_ID =
    (window.DreamX && window.DreamX.getUserId && window.DreamX.getUserId()) ||
    (tg && tg.initDataUnsafe && tg.initDataUnsafe.user
        ? tg.initDataUnsafe.user.id
        : null);

const USERNAME =
    (window.DreamX && window.DreamX.getUsername && window.DreamX.getUsername()) ||
    (tg && tg.initDataUnsafe && tg.initDataUnsafe.user
        ? tg.initDataUnsafe.user.username
        : null);

// Хелпер: красиво показати нік
function formatNick(raw) {
    if (!raw) return "Ти";
    const s = String(raw);
    return s.startsWith("@") ? s : "@" + s;
}

document.addEventListener("DOMContentLoaded", () => {
    const meNick = formatNick(USERNAME);

    // Всі місця з "Ти"
    const meNameEl = document.getElementById("online-me-name");
    const meHistoryNickEl = document.getElementById("online-history-me");
    const playersList = document.getElementById("online-room-players");
    const roomProgress = document.getElementById("online-room-progress");
    const statusText = document.getElementById("online-status-text");

    if (meNameEl) meNameEl.textContent = meNick;
    if (meHistoryNickEl) meHistoryNickEl.textContent = meNick;

    // Оновлюємо перший елемент у списку гравців
    if (playersList) {
        const firstLi = playersList.querySelector(".tourgame-group-player.me");
        if (firstLi) {
            const nameSpan = firstLi.querySelector(".tourgame-player-name");
            if (nameSpan) {
                nameSpan.textContent = `${meNick} (Ти)`;
            }
        }
    }

    if (roomProgress) {
        roomProgress.textContent = "У кімнаті: 1 гравець · чекаємо опонента";
    }

    if (statusText) {
        statusText.textContent =
            "Ти в кімнаті. Як тільки зайде ще один гравець — розпочнеться раунд 1 / 1.";
    }

    // TODO:
    // 1. Підключення до сервера (WS / long polling)
    // 2. Матчмейкінг: коли гравців >= 2 — старт раунду
    // 3. Після 3 ігор: обнулити локальні раундові бали,
    //    а вгорі у списку гравців додати суму до їхнього загального рахунку
});
