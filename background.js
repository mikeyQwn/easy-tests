/**
 * @type {Record<string, string>}
 */
let answers = {};
let gptToken = "[TODO: add token loading]";

const EVENT_TYPES = {
    SHOW_ANSWER: "showAnswer",
    GET_QUESTION: "getQuestion",
};

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

function askGpt() {}

/**
 * @param {string} question
 * @returns {Promise<string | null>}
 */
async function getGptAsnwer(question) {
    const apiUrl =
        "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";
    const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${gptToken}`,
    };
    const body = {
        model: "GigaChat:latest",
        messages: [
            {
                role: "user",
                content: question,
            },
        ],
        temperature: 1.0,
        top_p: 0.1,
        n: 1,
        stream: false,
        max_tokens: 512,
        repetition_penalty: 1,
    };
    const ans = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
    });
    const ansJson = await ans.json();
    return ansJson.choices[0].message.content;
}

/**
 * @param {Record<string, string>} questionToAnswer
 * @param {string} question
 * @param {number} fitness
 * @returns {Promise<string | null>}
 */
async function getAnswer(questionToAnswer, question, fitness, isGptForced) {
    if (isGptForced) {
        try {
            return await getGptAsnwer(question);
        } catch (e) {
            console.error("[background] Failed to fetch data from gpt");
            return "[404]";
        }
    }
    let minScore = 1_000_000;
    let ans = null;
    for (const key of Object.keys(questionToAnswer)) {
        let score = getScore(key, question);
        if (key.length < 20) {
            if (question.toLowerCase().match(key.toLowerCase())) {
                score = 0;
            } else {
                score = 1_000_000;
            }
        }
        if (score >= minScore) {
            continue;
        }
        minScore = score;
        ans = questionToAnswer[key];
    }
    if (minScore > fitness) {
        try {
            ans = await getGptAsnwer(question);
        } catch (e) {
            console.error("[background] Failed to fetch data from gpt");
            ans = "[404]";
        }
    }
    return ans;
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
    answers = req.updatedAnswers;
    sendRes({
        isOk: true,
        message: "Answers have been\nupdated",
    });
});

async function getQuestion() {
    try {
        const q = await sendToContext({
            type: EVENT_TYPES.GET_QUESTION,
        });
        if (!("question" in q && typeof q.question === "string")) {
            console.error("[background] Malformed question recieved");
        }
        return q.question;
    } catch {
        console.error(
            "[background] Failed to send a message to the context script"
        );
    }
}

function showAnswer(isGptForced) {
    getQuestion().then(async (question) => {
        const answer = await getAnswer(answers, question, 6, isGptForced);
        if (!answer) {
            sendToContext({
                type: EVENT_TYPES.SHOW_ANSWER,
                message: "[404]",
            });
        } else {
            sendToContext({
                type: EVENT_TYPES.SHOW_ANSWER,
                message: answer,
            });
        }
    });
}

browser.commands.onCommand.addListener((command) => {
    if (command === "show-answer") {
        showAnswer(false);
    } else if ((command = "force-gpt")) {
        showAnswer(true);
    } else {
        console.error("[background] Could not parse current command");
    }
});
