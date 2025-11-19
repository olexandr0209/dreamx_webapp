// dreamx_core.js

window.DreamX = window.DreamX || {};

// Єдина функція: дати актуальний user_id
window.DreamX.getUserId = function () {
    // 1) Пробуємо взяти з URL ?user_id=...
    try {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = params.get("user_id");
        if (fromUrl && !isNaN(parseInt(fromUrl, 10))) {
            const uid = parseInt(fromUrl, 10);
            // зберігаємо в localStorage на майбутні сторінки
            localStorage.setItem("dreamx_user_id", String(uid));
            return uid;
        }
    } catch (e) {
        console.log("Помилка читання user_id з URL:", e);
    }

    // 2) Якщо в URL немає — пробуємо з localStorage
    try {
        const stored = localStorage.getItem("dreamx_user_id");
        if (stored && !isNaN(parseInt(stored, 10))) {
            return parseInt(stored, 10);
        }
    } catch (e) {
        console.log("Помилка читання user_id з localStorage:", e);
    }

    // 3) Якщо ніде нема — сумно
    return null;
};
