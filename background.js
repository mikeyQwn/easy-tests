/**
 * @type {Record<string, string>}
 */
let answers = {};

/**
 * @param {unknown} object
 * @returns {object is {updatedAnswers: Record<string, string>}}
 */
function isAnswers(object) {
    if (!object || typeof object !== "object") {
        return false;
    }
    if (!("updatedAnswers" in object)) {
        return false;
    }
    return Object.values(object.updatedAnswers).every((v) => {
        return typeof v === "string";
    });
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levDist(a, b) {
    const m = a.length;
    const n = b.length;

    let r0 = new Array(n + 1).fill(0).map((_, i) => i);
    let r1 = new Array(n + 1).fill(0);

    for (let i = 0; i < m; ++i) {
        r1[0] = i + 1;
        for (let j = 0; j < n; ++j) {
            const delCost = r0[j + 1] + 1;
            const insCost = r1[j] + 1;
            const subCost = a[i] == b[j] ? r0[j] : r0[j] + 1;
            r1[j + 1] = Math.min(delCost, insCost, subCost);
        }
        [r0, r1] = [r1, r0];
    }

    return r0[n];
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function getScore(a, b) {
    const dist = levDist(a, b);
    const diff = Math.abs(a.length - b.length);
    return dist - diff;
}

/**
 * @param {Record<string, string>} questionToAnswer
 * @param {string} question
 * @param {number} fitness
 * @returns {number | null}
 */
function getAnswer(questionToAnswer, question, fitness) {
    let minScore = 1_000_000;
    let ans = null;
    for (const key of Object.keys(questionToAnswer)) {
        const score = getScore(key, question);
        if (score >= minScore) {
            continue;
        }
        minScore = score;
        ans = questionToAnswer[key];
    }
    return minScore <= fitness ? ans : null;
}

/**
 * @param {string} message
 * @returns {Promise<any>}
 */
async function sendToContext(message) {
    const tabs = await browser.tabs.query({
        currentWindow: true,
        active: true,
    });
    return browser.tabs.sendMessage(tabs[0].id, message);
}

browser.runtime.onMessage.addListener((req, _sender, sendRes) => {
    if (!isAnswers(req)) {
        sendRes({
            isOk: false,
            message: "Answers should be\nstring-string json",
        });
        return;
    }

    sendToContext({ updatedAnswers: req }).catch((_) => {
        console.error(
            "[background] Failed to send a message\nto the context script"
        );
    });
    sendRes({
        isOk: true,
        message: "Answers have been\nupdated",
    });
});

function sendEvent() {
    sendToContext({
        show_answer: true,
    }).catch((_) => {
        console.error(
            "[background] Failed to send a message to the context script"
        );
    });
}

browser.commands.onCommand.addListener((command) => {
    if (command === "show-answer") {
        sendEvent();
    } else {
        console.error("[background] Could not parse current command");
    }
});
