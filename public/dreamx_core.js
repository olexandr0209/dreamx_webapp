// dreamx_core.js

// Глобальний простір імен для проекту
window.DreamX = window.DreamX || {};

// Єдина функція для отримання user_id
window.DreamX.getUserId = function () {
    // 1) Пробуємо взяти з Telegram WebApp
    const tg = window.Telegram && window.Telegram.WebApp;
    const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;

    if (user && user.id) {
        // Збережемо на майбутнє
        try {
            localStorage.setItem("dreamx_user_id", String(user.id));
        } catch (e) {
            console.log("Не вдалось зберегти user_id в localStorage:", e);
        }
        return user.id;
    }

    // 2) Якщо на цій сторінці Telegram нам не дав user'а —
    //    пробуємо взяти з localStorage (ми вже могли його зберегти раніше)
    try {
        const stored = localStorage.getItem("dreamx_user_id");
        if (stored && !isNaN(parseInt(stored, 10))) {
            return parseInt(stored, 10);
        }
    } catch (e) {
        console.log("Не вдалось прочитати user_id з localStorage:", e);
    }

    // 3) Якщо взагалі нічого немає
    return null;
};

