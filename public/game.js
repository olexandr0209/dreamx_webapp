// ========================
//   DOM-елементи
// ========================
const resultEl = document.getElementById("result");
const choices = document.querySelectorAll(".choice");
const body = document.querySelector(".game-body");
const coinValue = document.getElementById("coin-value");
const flashOverlay = document.getElementById("flash-overlay");
const loadingOverlay = document.getElementById("loading-overlay");
const joinOverlay = document.getElementById("join-overlay");
const joinOkBtn = document.getElementById("join-ok-btn");

choices.forEach(c => c.classList.add("disabled"));

const gameArea = document.querySelector(".game-area");
const playerPickCircle = document.getElementById("player-pick-circle");
const playerPickSymbol = document.getElementById("player-pick-symbol");
const computerPickCircle = document.getElementById("computer-pick-circle");
const computerPickSymbol = document.getElementById("computer-pick-symbol");

// --- TOUR (розіграш на $10) ---
const params = new URLSearchParams(window.location.search);
const isTourMode = params.get("mode") === "tour";

const tourStatus = document.getElementById("tour-status");
const tourStatusText = document.getElementById("tour-status-text");
const tourFinishedOverlay = document.getElementById("tour-finished-overlay");
const tourFinishedBack = document.getElementById("tour-finished-back");

let tourPoints = 0;
let tourPending = 0;
const TOUR_TARGET = 5;

// Якщо НЕ тур-режим — ховаємо весь тур-UI про всяк випадок
if (!isTourMode) {
    if (tourStatus) tourStatus.classList.add("hidden");
    if (tourFinishedOverlay) tourFinishedOverlay.classList.add("hidden");
}

// Кнопка Back з оверлею
if (tourFinishedBack) {
    tourFinishedBack.addEventListener("click", () => {
        exitGame();  // вихід на головну з автозбереженням
    });
}

let canPlay = false; // гра недоступна поки не прийшли монети з бази

// Адреса бекенду
const API_BASE = "https://dreamx-bot.onrender.com";

// ========================
//   Завантаження монет
// ========================

// Звичайні монети (таблиця players.points)
// Звичайні монети (points) — тільки для НЕ tour режиму
async function loadPoints() {
    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : null;

    if (!userId) {
        console.log("Немає user_id");
        return;
    }

    try {
        const url = `${API_BASE}/api/get_points?user_id=${userId}`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        coins = data.points ?? 0;

        // На звичайній грі показуємо загальні монети
        if (!isTourMode && coinValue) {
            coinValue.textContent = coins;
        }

        // Грати дозволяємо тільки в звичайному режимі через цю функцію
        if (!isTourMode) {
            canPlay = true;
            choices.forEach(c => c.classList.remove("disabled"));
        }

        try {
            localStorage.setItem("dreamx_points", String(coins));
        } catch {}

        console.log("Монети (points) завантажені:", coins);

    } catch (e) {
        console.log("Помилка loadPoints:", e);
    }
}

// Турнірні монети (points_tour) — тільки для tour режиму
async function loadTourPoints() {
    if (!isTourMode) return;

    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : null;

    if (!userId) {
        console.log("Немає user_id для loadTourPoints");
        return;
    }

    try {
        const url = `${API_BASE}/api/get_tour_points?user_id=${userId}`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        tourPoints = data.points_tour ?? 0;

        // У тур-режимі в топ-барі завжди показуємо саме tour монети
        if (coinValue) {
            coinValue.textContent = tourPoints;
        }

        // Можна грати тільки якщо ще не набрали 5
        canPlay = tourPoints < TOUR_TARGET;
        choices.forEach(c => {
            c.classList.toggle("disabled", !canPlay);
        });

        updateTourUI();

        console.log("Турнірні монети (points_tour) завантажені:", tourPoints);

    } catch (e) {
        console.log("Помилка loadTourPoints:", e);
    }
}

function showJoinSuccessOverlay() {
    if (joinOverlay) {
        joinOverlay.classList.remove("hidden");
    }
}

function hideJoinSuccessOverlay() {
    if (joinOverlay) {
        joinOverlay.classList.add("hidden");
    }
}

// закриваємо оверлей по кнопці "Гаразд"
if (joinOkBtn) {
    joinOkBtn.addEventListener("click", () => {
        hideJoinSuccessOverlay();
    });
}
// Глобальні сети розіграшів, де юзер вже бере участь
// normal — звичайні розіграші
// promo  — промо-розіграші каналів
let joinedGiveawayIds = new Set();   // normal
let joinedPromoIds = new Set();      // promo

async function loadJoinedGiveaways(userId) {
    try {
        const resp = await fetch(
            `${API_BASE}/api/get_joined_giveaways?user_id=${encodeURIComponent(userId)}`
        );
        if (!resp.ok) {
            console.warn("get_joined_giveaways bad status", resp.status);
            return;
        }

        const data = await resp.json();
        console.log("joined giveaways raw:", data);

        // скидаємо
        joinedGiveawayIds = new Set();
        joinedPromoIds = new Set();

        // 🔥 новий формат: data.joined = [{giveaway_id, kind}, ...]
        if (Array.isArray(data.joined)) {
            data.joined.forEach(row => {
                const gid = Number(row.giveaway_id);
                if (!gid) return;

                if (row.kind === "promo") {
                    joinedPromoIds.add(gid);
                } else if (row.kind === "normal") {
                    joinedGiveawayIds.add(gid);
                }
            });
        }
        // fallback на старий формат (якщо колись знадобиться)
        else if (Array.isArray(data.joined_giveaway_ids)) {
            joinedGiveawayIds = new Set(
                data.joined_giveaway_ids.map(id => Number(id))
            );
        }

        console.log("joined normal:", Array.from(joinedGiveawayIds));
        console.log("joined promo:", Array.from(joinedPromoIds));

    } catch (e) {
        console.error("loadJoinedGiveaways error", e);
    }
}




// ========================
//   Giveaway-картка (головний екран)
// ========================



function formatPrize(prize, prizeCount) {
    if (!prize) return "";
    if (prizeCount && prizeCount > 1) {
        return `${prize} (x${prizeCount})`;
    }
    return prize;
}

// короткий формат дати: "21.12 • 12:00"
function formatShortDateTime(raw) {
    if (!raw) return "";

    const d = new Date(raw);
    if (isNaN(d.getTime())) {
        // якщо не вдалося розпарсити — віддаємо як є
        return raw;
    }

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");

    return `${dd}.${mm} • ${hh}:${min}`;
}

function createGiveawayCard(data) {
    const card = document.createElement("div");
    card.className = "giveaway-card";
    if (data.kindClass) {
        card.classList.add(data.kindClass);
    }

    const metaHtml = (data.metaLines && data.metaLines.length)
        ? `
        <div class="giveaway-meta">
            ${data.metaLines
                .map(line => `<div class="giveaway-meta-line">${line}</div>`)
                .join("")}
        </div>
        `
        : "";

    // 🔥 кнопка всередині body тільки для promo
    const bodyPromoBtnHtml = data.isPromoWithBodyBtn
        ? `
        <div class="promo-main-btn-row">
            <button class="promo-main-btn">${data.buttonText || "ВЗЯТИ УЧАСТЬ"}</button>
        </div>
        `
        : "";

    const channelsHtml = (data.channels && data.channels.length)
        ? `
        <div class="giveaway-channels">
            ${data.channels
                .map((ch, idx) => `
                    ${idx > 0 ? '<div class="channel-separator"></div>' : ""}
                    <div class="promo-channel-row">
                        <div class="promo-channel-info">
                            <div class="channel-name">${ch.name}</div>
                            ${ch.description
                                ? `<div class="channel-desc">${ch.description}</div>`
                                : ""
                            }
                        </div>
                        ${
                            ch.url
                                ? `<button class="channel-join-btn" data-url="${ch.url}">ПРИЄДНАТИСЬ</button>`
                                : ""
                        }
                    </div>
                `)
                .join("")}
            ${
                data.channelsExtraCount && data.channelsExtraCount > 0
                    ? `<div class="channels-extra">+ ще ${data.channelsExtraCount} каналів</div>`
                    : ""
            }
        </div>
        `
        : "";

    // 🔗 блок посилань для оголошень
    const linksHtml = (data.links && data.links.length)
        ? `
        <div class="giveaway-links">
            ${data.links
                .map((l, idx) => `
                    <div class="giveaway-link-row">
                        <div class="giveaway-link-main">
                            <div class="giveaway-link-title">
                                ${l.title || `Посилання ${idx + 1}`}
                            </div>
                            ${
                                l.description
                                    ? `<div class="giveaway-link-desc">${l.description}</div>`
                                    : ""
                            }
                            <div class="giveaway-link-url">${l.url}</div>
                        </div>
                        <button 
                            class="giveaway-link-btn" 
                            data-url="${l.url}"
                        >
                            ВІДКРИТИ
                        </button>
                    </div>
                `)
                .join("")}
        </div>
        `
        : "";

    // 🎁 приз показуємо не завжди (у announcement його не буде)
    const prizeHtml = (data.showPrize === false)
        ? ""
        : `
        <div class="giveaway-prize">
            <span class="prize-amount">${data.prize || ""}</span>
        </div>
        `;

    // футер — тільки якщо:
    //  - це НЕ promo з body-кнопкою
    //  - і не announcement
    const footerHtml = (data.isPromoWithBodyBtn || data.hideFooterBtn)
        ? ""
        : `
        <div class="giveaway-footer">
            <button class="giveaway-btn">${data.buttonText || "OK"}</button>
        </div>
        `;

    card.innerHTML = `
        <div class="giveaway-header">
            <div class="giveaway-left">
                <div class="giveaway-avatar"></div>
                <span class="giveaway-tag">${data.typeTag}</span>
            </div>
            ${prizeHtml}
        </div>

        <div class="giveaway-body">
            <h2 class="giveaway-title">${data.title}</h2>
            ${data.description
                ? `<p class="giveaway-description">${data.description}</p>`
                : ""
            }
            ${metaHtml}
            ${bodyPromoBtnHtml}
            ${channelsHtml}
            ${linksHtml}
        </div>

        ${footerHtml}
    `;

    const isJoined = !!data.isJoined;

    // ====== FOOTER-логіка (звичайні розіграші) ======
    const btn = card.querySelector(".giveaway-btn");

    if (btn && isJoined && (data.actionType === "join_normal_giveaway" || data.actionType === "already_joined")) {
        const footer = btn.parentElement;
        if (footer) {
            footer.innerHTML = `<div class="giveaway-joined-label">✅ Ви приєднались!</div>`;
        }
    } else if (btn) {
        // стандартна поведінка кнопки (normal)
        btn.onclick = async () => {
            console.log("Clicked:", data);

            await ensureUserInDB();

            if (data.actionType === "join_normal_giveaway") {
                const ok = await joinGiveawayOnServer(data.actionPayload, "normal");
                if (ok) {
                    joinedGiveawayIds.add(Number(data.actionPayload));
                    const footer = btn.parentElement;
                    if (footer) {
                        footer.innerHTML = `<div class="giveaway-joined-label">✅ Ви приєднались!</div>`;
                    }
                }
                return;
            }

            if (data.actionType === "open_channel") {
                window.open(data.actionPayload, "_blank");
                return;
            }
            if (data.actionType === "open_link") {
                window.open(data.actionPayload, "_blank");
                return;
            }
            if (data.actionType === "open_tournament") {
                console.log("Open tournament:", data.actionPayload);
                return;
            }
            if (data.actionType === "open_tour_game") {
                window.location.href = "game.html?mode=tour";
                return;
            }
        };
    }

    // ====== Кнопка всередині PROMO-картки ======
    const promoMainBtn = card.querySelector(".promo-main-btn");
    if (promoMainBtn) {
        if (isJoined && data.actionType === "join_promo_giveaway") {
            // вже приєднався — показуємо зелений лейбл замість кнопки
            const row = promoMainBtn.parentElement;
            if (row) {
                row.innerHTML = `<div class="giveaway-joined-label">✅ Ви приєднались!</div>`;
            }
        } else {
            promoMainBtn.onclick = async () => {
                console.log("Promo main btn clicked:", data);
                await ensureUserInDB();

                if (data.actionType === "join_promo_giveaway") {
                    const ok = await joinGiveawayOnServer(data.actionPayload, "promo");
                    if (ok) {
                        joinedPromoIds.add(Number(data.actionPayload));
                        const row = promoMainBtn.parentElement;
                        if (row) {
                            row.innerHTML = `<div class="giveaway-joined-label">✅ Ви приєднались!</div>`;
                        }
                    }
                }
            };
        }
    }

    // кнопки "ВІДКРИТИ" для посилань (announcement)
    if (data.links && data.links.length) {
        const linkBtns = card.querySelectorAll(".giveaway-link-btn");
        linkBtns.forEach(b => {
            b.addEventListener("click", () => {
                const url = b.dataset.url;
                if (url) {
                    window.open(url, "_blank");
                }
            });
        });
    }

    // кнопки "ПРИЄДНАТИСЬ" біля каналів
    if (data.channels && data.channels.length) {
        const joinBtns = card.querySelectorAll(".channel-join-btn");
        joinBtns.forEach(b => {
            b.addEventListener("click", () => {
                const url = b.dataset.url;
                if (url) {
                    window.open(url, "_blank");
                }
            });
        });
    }

    return card;
}


function createCardFromBackend(card) {
    let typeTag = "РОЗІГРАШ";
    let title = card.title || "";
    let desc = card.description || card.message || "";
    let prize = "";
    let buttonText = "OK";
    let actionType = "none";
    let actionPayload = "";
    const metaLines = [];
    let channels = null;
    let channelsExtraCount = 0;
    let links = null;
    let kindClass = "";
    let hideFooterBtn = false;
    let showPrize = true;
    let isJoined = false; // 🔥 нове

    const endText = card.end_at_human || card.end_at || null;
    const startText = card.start_at_human || card.start_at || null;
    const endShort = endText ? formatShortDateTime(endText) : null;
    const startShort = startText ? formatShortDateTime(startText) : null;

    if (card.kind === "normal") {
        // Звичайний розіграш
        typeTag = "РОЗІГРАШ";
        prize = formatPrize(card.prize, card.prize_count);
        kindClass = "giveaway-card--normal";

        const idNum = Number(card.id);
        isJoined = joinedGiveawayIds.has(idNum);

        // Тільки час оголошення результату
        if (endShort) {
            metaLines.push(`Оголошення результату: ${endShort}`);
        }

        if (card.gtype === "tour") {
            // турнірний розіграш – відкриваємо тур-режим гри
            actionType = "open_tour_game";
            buttonText = "ПРИЄДНАТИСЬ";
        } else {
            // звичайний розіграш
            if (isJoined) {
                actionType = "already_joined";
                buttonText = "ВИ ПРИЄДНАЛИСЬ!";
            } else {
                actionType = "join_normal_giveaway";
                actionPayload = idNum; // id розіграшу з БД
                buttonText = "ПРИЄДНАТИСЬ";
            }
        }

        if (card.extra_info) {
            metaLines.push(card.extra_info);
        }

    } else if (card.kind === "promo") {
        // Рекламний розіграш каналів
        typeTag = "ПРОМО";
        prize = formatPrize(card.prize, card.prize_count);
        kindClass = "giveaway-card--promo";

        const idNum = Number(card.id);
        isJoined = joinedPromoIds.has(idNum);

        if (endShort) {
            metaLines.push(`Закінчення: ${endShort}`);
        }

        if (card.channels && card.channels.length) {
            const maxToShow = 3;
            const all = card.channels;

            channels = all.slice(0, maxToShow).map(ch => ({
                name: ch.name,
                description: ch.description || "",
                url: ch.url || ch.link || ""
            }));

            channelsExtraCount = Math.max(all.length - maxToShow, 0);
        }

        // 🔥 участь через кнопку всередині body
        actionType = "join_promo_giveaway";
        actionPayload = idNum;
        buttonText = isJoined ? "ВИ ПРИЄДНАЛИСЬ!" : "ВЗЯТИ УЧАСТЬ";

    } else if (card.kind === "announcement") {
        // Оголошення
        typeTag = "ОГОЛОШЕННЯ";
        prize = "";
        kindClass = "giveaway-card--announcement";
        hideFooterBtn = true;   // ❌ немає нижньої кнопки
        showPrize = false;      // ❌ немає жовтої "суми" справа

        if (card.extra_info) {
            metaLines.push(card.extra_info);
        }

        // показуємо дату ПУБЛІКАЦІЇ
        if (startShort) {
            metaLines.push(`Опубліковано: ${startShort}`);
        }

        if (card.links && card.links.length) {
            links = card.links.map(l => ({
                title: l.title || "Посилання",
                url: l.url,
                description: l.description || ""
            }));
        }

        buttonText = ""; // все одно не використовується (footer схований)

    } else {
        // fallback
        typeTag = card.kind ? card.kind.toUpperCase() : "INFO";
        prize = card.prize || "";
        buttonText = "OK";
    }

    const data = {
        typeTag,
        prize,
        title,
        description: desc,
        buttonText,
        actionType,
        actionPayload,
        metaLines,
        channels,
        channelsExtraCount,
        links,
        isPromoWithBodyBtn: (card.kind === "promo"),
        kindClass,
        hideFooterBtn,
        showPrize,
        isJoined, // 🔥 передаємо всередину
    };

    return createGiveawayCard(data);
}



async function renderGiveawayList() {
    const list = document.getElementById("giveaway-list");
    if (!list) return; // на game.html просто вийде

    // 🔥 показуємо лоадер
    if (loadingOverlay) {
        loadingOverlay.classList.remove("hidden");
    }

    list.innerHTML = "";

    let backendCards = [];

    try {
        const res = await fetch(`${API_BASE}/api/get_giveaways`);
        if (res.ok) {
            const data = await res.json();
            backendCards = data.giveaways || [];
            console.log("Cards from backend:", backendCards);
        } else {
            console.log("get_giveaways response not OK:", res.status);
        }

        if (backendCards.length > 0) {
            backendCards.forEach(card => {
                const el = createCardFromBackend(card);
                list.appendChild(el);
            });
        } else {
            // Якщо активних карток немає — показуємо просте повідомлення
            const empty = document.createElement("div");
            empty.style.padding = "80px 16px 0";
            empty.style.textAlign = "center";
            empty.style.opacity = "0.8";
            empty.innerHTML = "Наразі активних розіграшів немає.<br/>Заглянь пізніше 😉";
            list.appendChild(empty);
        }

    } catch (e) {
        console.log("Помилка завантаження /api/get_giveaways:", e);

        const error = document.createElement("div");
        error.style.padding = "80px 16px 0";
        error.style.textAlign = "center";
        error.style.opacity = "0.8";
        error.innerHTML = "Сталася помилка при завантаженні.<br/>Спробуй трохи пізніше 🙏";
        list.appendChild(error);

    } finally {
        // 🧨 ховаємо лоадер в будь-якому випадку
        if (loadingOverlay) {
            loadingOverlay.classList.add("hidden");
        }
    }
}



// ========================
//   Логіка гри
// ========================

const options = ["stone", "scissors", "paper"];
let locked = false;
let coins = 0;
let pendingPoints = 0;

if (coinValue) {
    coinValue.textContent = "...";
}

// Забороняємо грати до завантаження монет
choices.forEach(c => c.classList.add("disabled"));

// Скидання флеша
function resetFlash() {
    if (!flashOverlay) return;
    flashOverlay.className = "";
}

// Оновлення UI розіграшу
function updateTourUI() {
    if (!isTourMode) return;

    if (tourStatus && tourStatusText) {
        tourStatus.classList.remove("hidden");
        tourStatusText.textContent =
            `Зароби 5 монет щоб взяти участь: ${tourPoints} / ${TOUR_TARGET}`;
    }

    const finished = tourPoints >= TOUR_TARGET;

    if (finished) {
        if (tourFinishedOverlay) {
            tourFinishedOverlay.classList.remove("hidden");
        }

        canPlay = false;
        choices.forEach(c => c.classList.add("disabled"));

        if (gameArea) gameArea.classList.add("hidden");
        if (resultEl) resultEl.classList.add("hidden");
    } else {
        if (tourFinishedOverlay) {
            tourFinishedOverlay.classList.add("hidden");
        }
        // тут більше нічого не робимо
    }
}



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

function showComputerPick(choice) {
    const circle = document.getElementById("computer-pick-circle");
    const symbol = document.getElementById("computer-pick-symbol");

    const icons = { stone: "✊", paper: "✋", scissors: "✌️" };
    symbol.textContent = icons[choice];

    circle.style.opacity = "1";
    circle.style.transform = "scale(1)";
}

function showPlayerPick(choice) {
    if (!playerPickCircle || !playerPickSymbol) return;

    const icons = { stone: "✊", paper: "✋", scissors: "✌️" };
    playerPickSymbol.textContent = icons[choice];
    playerPickCircle.style.opacity = "1";
    playerPickCircle.style.transform = "scale(1)";
}

function resetState() {
    choices.forEach(c => {
        c.classList.remove("active");
        c.classList.remove("small");
    });

    if (resultEl) {
        resultEl.classList.remove("result-win", "result-lose", "result-draw");
        resultEl.textContent = "Обери";
        resultEl.classList.remove("hidden");
    }

    if (body) {
        body.classList.remove("glow-win", "glow-lose", "glow-draw");
    }

    resetFlash();

    if (computerPickCircle) {
        computerPickCircle.style.opacity = "0";
        computerPickCircle.style.transform = "scale(0.7)";
    }

    if (playerPickCircle) {
        playerPickCircle.style.opacity = "0";
        playerPickCircle.style.transform = "scale(0.7)";
    }

    if (gameArea) {
        gameArea.classList.remove("hidden");
    }

    locked = false;
}

// Кліки по вибору
choices.forEach(choice => {
    choice.addEventListener("click", () => {
        // Якщо це тур-режим і вже 5+ монет — гра заблокована
        if (isTourMode && tourPoints >= TOUR_TARGET) {
            console.log("Вже в розіграші – гра вимкнена.");
            return;
        }

        if (!canPlay) {
            console.log("Гра ще не готова. Очікуємо завантаження монет.");
            return;
        }
        if (locked) return;
        locked = true;

        const playerChoice = choice.dataset.choice;

        // спочатку плавно ховаємо трикутник
        if (gameArea) gameArea.classList.add("hidden");

        // гарантуємо, що старі кружки сховані
        if (computerPickCircle) {
            computerPickCircle.style.opacity = "0";
            computerPickCircle.style.transform = "scale(0.7)";
        }
        if (playerPickCircle) {
            playerPickCircle.style.opacity = "0";
            playerPickCircle.style.transform = "scale(0.7)";
        }

        // даємо 150 мс, щоб трикутник згас → потім показуємо вибір гравця
        setTimeout(() => {
            showPlayerPick(playerChoice);

            // ще через 200 мс показуємо вибір компʼютера
            setTimeout(() => {
                const botChoice = getBotChoice();
                showComputerPick(botChoice);

                const final = getResult(playerChoice, botChoice);

                if (resultEl) {
                    resultEl.classList.remove("result-win", "result-lose", "result-draw");
                }
                if (body) {
                    body.classList.remove("glow-win", "glow-lose", "glow-draw");
                }
                resetFlash();

                let delay = 1000;

                if (final === "YOU WIN") {
                    if (resultEl) {
                        resultEl.innerHTML =
                            'ВИГРАШ! 🔥<br><span class="plus-one-inline">+1</span>';
                        resultEl.classList.add("result-win");
                    }
                    if (body) body.classList.add("glow-win");
                    if (flashOverlay) {
                        flashOverlay.classList.add("flash-win", "flash-active");
                    }

                    if (isTourMode) {
                        if (tourPoints < TOUR_TARGET) {
                            tourPoints += 1;
                            tourPending += 1;
                            updateTourUI();
                        }
                    } else {
                        coins += 1;
                        pendingPoints += 1;
                    }

                    if (coinValue) {
                        coinValue.textContent = isTourMode ? tourPoints : coins;
                    }

                    delay = 1000;
                } else if (final === "YOU LOSE") {
                    if (resultEl) {
                        resultEl.textContent = "ПРОГРАШ ❌";
                        resultEl.classList.add("result-lose");
                    }
                    if (body) body.classList.add("glow-lose");
                    if (flashOverlay) {
                        flashOverlay.classList.add("flash-lose", "flash-active");
                    }
                } else {
                    if (resultEl) {
                        resultEl.textContent = "НІЧИЯ 🤝";
                        resultEl.classList.add("result-draw");
                    }
                    if (body) body.classList.add("glow-draw");
                    if (flashOverlay) {
                        flashOverlay.classList.add("flash-draw", "flash-active");
                    }
                }

                setTimeout(() => {
                    resetState();
                }, delay);

            }, 50); // між гравцем і компʼютером
        }, 150); // даємо трикутнику сховатись
    });
});

// ========================
//   API: ensure_user, save
// ========================

async function ensureUserInDB() {
    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : null;

    if (!userId) {
        console.log("ensureUserInDB: немає user_id");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/ensure_user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId })
        });

        console.log("ensure_user status:", res.status);
    } catch (e) {
        console.log("Помилка ensureUserInDB:", e);
    }
}

let isSaving = false;

async function savePointsToServer() {
    if (pendingPoints <= 0) return;
    if (isSaving) return;

    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : null;

    if (!userId) {
        console.log("Немає user_id для збереження");
        return;
    }

    const delta = pendingPoints;
    isSaving = true;

    try {
        const url = `${API_BASE}/api/add_points`;

        console.log("POST points to:", url, "delta:", delta);

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, delta })
        });

        console.log("Status add_points:", res.status);
        if (!res.ok) return;

        const data = await res.json();
        console.log("Response add_points:", data);

        pendingPoints -= delta;
        if (pendingPoints < 0) pendingPoints = 0;

        if (data && typeof data.points === "number") {
            try {
                localStorage.setItem("dreamx_points", String(data.points));
            } catch (e) {
                console.log("Не вдалося зберегти dreamx_points після POST:", e);
            }
        }
    } catch (e) {
        console.log("Помилка savePointsToServer:", e);
    } finally {
        isSaving = false;
    }
}

let isSavingTour = false;

async function saveTourPointsToServer() {
    if (!isTourMode) return;
    if (tourPending <= 0) return;
    if (isSavingTour) return;

    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : null;

    if (!userId) {
        console.log("Немає user_id для збереження tour");
        return;
    }

    const delta = tourPending;
    isSavingTour = true;

    try {
        const url = `${API_BASE}/api/add_tour_points`;

        console.log("POST tour points to:", url, "delta:", delta);

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, delta })
        });

        console.log("Status add_tour_points:", res.status);
        if (!res.ok) return;

        const data = await res.json();
        console.log("Response add_tour_points:", data);

        tourPending -= delta;
        if (tourPending < 0) tourPending = 0;
    } catch (e) {
        console.log("Помилка saveTourPointsToServer:", e);
    } finally {
        isSavingTour = false;
    }
}

async function joinGiveawayOnServer(giveawayId, kind = "normal") {
    const tg = window.Telegram && window.Telegram.WebApp;

    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : tg && tg.initDataUnsafe && tg.initDataUnsafe.user
            ? tg.initDataUnsafe.user.id
            : null;

    const username =
        (window.DreamX && window.DreamX.getUsername && window.DreamX.getUsername()) ||
        (tg && tg.initDataUnsafe && tg.initDataUnsafe.user
            ? tg.initDataUnsafe.user.username
            : null);

    if (!userId) {
        console.log("joinGiveawayOnServer: немає user_id");
        return false;
    }

    try {
        const res = await fetch(`${API_BASE}/api/join_giveaway`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                giveaway_id: giveawayId,
                user_id: userId,
                username: username,
                kind: kind,        // 🔥 normal або promo
            })
        });

        if (!res.ok) {
            console.log("join_giveaway error status:", res.status);
            return false;
        }

        const data = await res.json();
        console.log("join_giveaway response:", data);

        // успіх — показуємо оверлей
        showJoinSuccessOverlay();
        return true;

    } catch (e) {
        console.log("Помилка joinGiveawayOnServer:", e);
        return false;
    }
}


// Викликається з HTML-кнопки Back
async function exitGame() {
    await savePointsToServer();
    await saveTourPointsToServer();
    window.location.href = "index.html";
}

// ========================
//   Ініціалізація
// ========================

document.addEventListener("DOMContentLoaded", async () => {
    const tg = window.Telegram && window.Telegram.WebApp;
    const userId = window.DreamX && window.DreamX.getUserId
        ? window.DreamX.getUserId()
        : tg && tg.initDataUnsafe && tg.initDataUnsafe.user
            ? tg.initDataUnsafe.user.id
            : null;

    if (userId) {
        await loadJoinedGiveaways(userId);
    }

    await renderGiveawayList(); // на game.html просто нічого не знайде і вийде
});


resetState();   // стартовий стан

(async () => {
    await ensureUserInDB();

    // Спочатку завжди тягнемо звичайні монети (для /start, статистики і т.д.)
    await loadPoints();

    // Якщо це тур-режим — поверх цього підтягуємо points_tour
    await loadTourPoints();
})();

// Автозбереження кожні 5 секунд
setInterval(() => {
    savePointsToServer();
    saveTourPointsToServer();
}, 5000);

// ================================
//  БЛИЖЧІ ТУРНІРИ НА ГОЛОВНІЙ
// ================================

// Базовий URL API. Якщо є глобальна змінна – використовуємо її.
const HOME_API_BASE =
    window.DREAMX_API_BASE || "https://dreamx-api.onrender.com";

// Формат різниці в мс так само, як на екрані турнірів
function homeFormatDiff(diffMs) {
    if (diffMs <= 0) return "00:00:00";

    const totalSeconds = Math.floor(diffMs / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");

    if (days > 0) {
        return `${days} д. ${hh}:${mm}:${ss}`;
    }
    return `${hh}:${mm}:${ss}`;
}

// Оновлення таймера на картці "домашнього" турніру
function updateHomeTournamentCardTimer(card) {
    const startIso = card.dataset.startAt;
    if (!startIso) return;

    const label = card.querySelector(".tour-start-label");
    if (!label) return;

    const btn = card.querySelector(".tour-join-btn");

    const now = Date.now();
    const startMs = Date.parse(startIso);
    if (Number.isNaN(startMs)) {
        label.textContent = "Помилка часу";
        if (btn) {
            btn.disabled = true;
            btn.classList.add("tour-join-btn-disabled");
        }
        return;
    }

    const fiveMinutesMs = 5 * 60 * 1000;
    const twoMinutesMs = 2 * 60 * 1000;
    const endWindow = startMs + fiveMinutesMs;

    // Якщо вікно старту вже повністю пройшло – просто ховаємо картку
    if (now > endWindow) {
        card.remove();
        return;
    }

    // Далеко до старту (> 2 хв) — показуємо таймер, кнопка заблокована
    if (now < startMs - twoMinutesMs) {
        const diff = startMs - now;
        label.textContent = homeFormatDiff(diff);

        if (btn) {
            btn.disabled = true;
            btn.classList.add("tour-join-btn-disabled");
            btn.textContent = "СКОРО СТАРТ";
        }
        return;
    }

    // За 2 хв до старту — таймер іде, кнопку дозволяємо
    if (now >= startMs - twoMinutesMs && now < startMs) {
        const diff = startMs - now;
        label.textContent = homeFormatDiff(diff);

        if (btn) {
            btn.disabled = false;
            btn.classList.remove("tour-join-btn-disabled");
            btn.textContent = "ВІДКРИТИ ТУРНІР";
        }
        return;
    }

    // Вікно від старту до +5 хв — "СТАРТУЄМО!", кнопка активна
    if (now >= startMs && now <= endWindow) {
        label.textContent = "СТАРТУЄМО!";
        if (btn) {
            btn.disabled = false;
            btn.classList.remove("tour-join-btn-disabled");
            btn.textContent = "ВІДКРИТИ ТУРНІР";
        }
        return;
    }
}

// Малюємо одну картку турніру на головній
function renderHomeTournamentCard(t) {
    const wrapper = document.createElement("div");
    wrapper.className = "mode-card tournament-card";
    wrapper.dataset.tournamentId = t.id;
    wrapper.dataset.startAt = t.start_at; // ISO-час старту

    const title = document.createElement("div");
    title.className = "mode-title";
    title.textContent = t.title || `Турнір #${t.id}`;

    const sub = document.createElement("div");
    sub.className = "mode-sub";
    const playersInfo =
        t.players_total && t.players_pass
            ? `${t.players_total} учасників • ${t.players_pass} проходять`
            : "Турнір DreamX";

    sub.textContent = playersInfo;

    const bottomRow = document.createElement("div");
    bottomRow.className = "tour-card-bottom";

    const startLabel = document.createElement("div");
    startLabel.className = "tour-start-label";
    startLabel.textContent = "";

    const btn = document.createElement("button");
    btn.className = "tour-join-btn";
    btn.textContent = "ВІДКРИТИ ТУРНІР";
    btn.addEventListener("click", () => {
        if (btn.disabled) return;

        const params = new URLSearchParams(window.location.search);
        params.set("tournament_id", t.id);
        const qs = params.toString();
        window.location.href = qs
            ? `tournament_game.html?${qs}`
            : `tournament_game.html?tournament_id=${t.id}`;
    });

    bottomRow.appendChild(startLabel);
    bottomRow.appendChild(btn);

    wrapper.appendChild(title);
    wrapper.appendChild(sub);
    wrapper.appendChild(bottomRow);

    // Початковий таймер
    updateHomeTournamentCardTimer(wrapper);

    return wrapper;
}

// Завантаження ближчих турнірів (до 1 години)
async function loadHomeTournaments() {
    const listEl = document.getElementById("home-tournaments-list");
    if (!listEl) return;

    listEl.innerHTML = "Завантаження турнірів…";

    try {
        const res = await fetch(`${HOME_API_BASE}/api/get_tournaments`);
        if (!res.ok) throw new Error("http " + res.status);

        const data = await res.json();
        const tournaments = data.tournaments || [];

        const now = Date.now();
        const oneHourMs = 60 * 60 * 1000;
        const fiveMinutesMs = 5 * 60 * 1000;

        // Фільтр: живі турніри, вікно ще не закінчилось
        // + старт не далі, ніж за 1 годину
        const nearTournaments = tournaments.filter((t) => {
            if (!t.start_at) return false;
            const startMs = Date.parse(t.start_at);
            if (Number.isNaN(startMs)) return false;
            const endWindow = startMs + fiveMinutesMs;

            const soonEnough = startMs - now <= oneHourMs;
            const notExpired = endWindow >= now;

            return soonEnough && notExpired;
        });

        if (!nearTournaments.length) {
            listEl.textContent = "Наразі немає турнірів у найближчу годину.";
            return;
        }

        listEl.innerHTML = "";
        nearTournaments.forEach((t) => {
            const card = renderHomeTournamentCard(t);
            listEl.appendChild(card);
        });

        // Оновлення таймерів раз на секунду
        setInterval(() => {
            const cards = document.querySelectorAll(
                "#home-tournaments-list .tournament-card"
            );
            cards.forEach((card) => updateHomeTournamentCardTimer(card));
        }, 1000);
    } catch (err) {
        console.error("loadHomeTournaments error:", err);
        listEl.textContent = "Не вдалося завантажити турніри.";
    }
}

// Підключаємо до вже існуючого DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    loadHomeTournaments();
});

