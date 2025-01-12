/**
 * @param {unknown} value
 * @returns {value is Record<string, string>}
 */
function isObject(value) {
    return !!value && typeof value === "object";
}

/**
 * @param {unknown} value
 * @param {Record<string, string>} schema
 * @returns {boolean}
 */
function validateObject(value, schema) {
    if (!isObject(value)) {
        return false;
    }

    for (const [key, type] of Object.entries(schema)) {
        if (!(key in value) || typeof value[key] != type) {
            return false;
        }

        if (type === "object" && !value[key]) {
            return false;
        }
    }

    return true;
}

/**
 * @param {unknown} object
 * @returns {object is BackgroundAnswer}
 */
function isBackgroundAnswer(object) {
    const schema = {
        isOk: "boolean",
        message: "string",
    };
    return validateObject(object, schema);
}

/**
 * @param {unknown} value
 * @returns {value is {updatedAnswers: Record<string, unknown>}}
 */
function isAnswers(value) {
    const schema = {
        updatedAnswers: "object",
    };
    return validateObject(value, schema);
}

/**
 * @type {Record<string, unknown>}
 */
let answers = {};

const EVENT_TYPES_BACKGROUND = {
    SHOW_ANSWER: "showAnswer",
    GET_QUESTION: "getQuestion",
};

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
 * @param {Record<string, unknown>} questionToAnswer
 * @param {string} question
 * @returns {Promise<[string, number, unknown] | null>}
 */
async function getQuestionAnswer(questionToAnswer, question) {
    let minScore = 1_000_000;
    /**
     * @type {[string | null, unknown | null]}
     */
    let [matchedQuestion, answer] = [null, null];
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

        matchedQuestion = key;
        answer = questionToAnswer[key];
    }

    if (!matchedQuestion || !answer) {
        return null;
    }

    return [matchedQuestion, minScore, answer];
}

/**
 * @param {Record<string, unknown>} message
 * @returns {Promise<any>}
 */
async function sendToContext(message) {
    const tabs = await browser.tabs.query({
        currentWindow: true,
        active: true,
    });

    if (tabs.length < 1) {
        return;
    }

    const first = tabs[0];
    if (!first.id) {
        return;
    }

    return browser.tabs.sendMessage(first.id, message);
}

browser.runtime.onMessage.addListener((req, _sender, sendRes) => {
    if (!isAnswers(req)) {
        sendRes({
            isOk: false,
            message: "Answers should be\nvalid json",
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
            type: EVENT_TYPES_BACKGROUND.GET_QUESTION,
        });
        if (!("question" in q && typeof q.question === "string")) {
            console.error("[background] Malformed question recieved");
        }
        return q.question;
    } catch (e) {
        console.error(
            `[background] Failed to send a message to the context script ${e}`,
        );
    }
}

function showAnswer() {
    getQuestion().then(async (question) => {
        const res = await getQuestionAnswer(answers, question);
        if (!res) {
            sendToContext({
                type: EVENT_TYPES_BACKGROUND.SHOW_ANSWER,
                message: "[404]",
            });
            return;
        }
        const [q, s, a] = res;
        sendToContext({
            type: EVENT_TYPES_BACKGROUND.SHOW_ANSWER,
            message: `Match: ${q}\nDiff: ${s}\nAnswer: ${a}`,
        });
    });
}

browser.commands.onCommand.addListener((command) => {
    if (command === "show-answer") {
        showAnswer();
    } else {
        console.error("[background] Could not parse current command");
    }
});
