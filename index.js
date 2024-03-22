const EVENT_TYPES = {
    SHOW_ANSWER: "showAnswer",
    GET_QUESTION: "getQuestion",
};

/**
 * @type {HTMLDivElement | null}
 */
let answerEl = null;

/**
 * @param {HTMLElement} elem
 * @return {string}
 */
function getElementText(elem) {
    if (!elem) {
        return "";
    }
    if (elem.innerText) {
        return elem.innerText;
    }
    if ("value" in elem && typeof elem.value === "string") {
        return elem.value;
    }
    return "";
}

function createAnswerEl() {
    answerEl = document.createElement("div");
    answerEl.hidden = true;
    answerEl.style.position = "fixed";
    answerEl.style.minWidth = "10px";
    answerEl.style.minHeight = "5px";
    answerEl.style.zIndex = "10000";
    answerEl.style.left = "10px";
    answerEl.style.bottom = "10px";
    document.body.appendChild(answerEl);
}

function tryShowAnswer(req) {
    if (!("message" in req && typeof req.message === "string")) {
        console.error("[context] Invalid show-answer request");
        console.error(req);
        return;
    }
    if (!answerEl) {
        createAnswerEl();
    }

    answerEl.hidden = false;
    answerEl.innerText = req.message;
}

function main() {
    /**
     * @type {[number, number]}
     */
    let cursorPosition = [0, 0];
    /**
     * @type {HTMLElement | null}
     */
    let lastTarget = null;

    window.addEventListener("mousemove", (e) => {
        cursorPosition = [e.clientX, e.clientY];
        lastTarget = e.target;
        if (answerEl) {
            answerEl.hidden = true;
        }
    });

    browser.runtime.onMessage.addListener((req, _sender, sendRes) => {
        if (!("type" in req)) {
            console.error("[context] Invalid request");
            return;
        }
        const type = req.type;

        if (type === EVENT_TYPES.GET_QUESTION) {
            const question = getElementText(lastTarget);
            sendRes({ question: question });
        } else if (type === EVENT_TYPES.SHOW_ANSWER) {
            tryShowAnswer(req);
        } else {
            console.error("[context] Invalid request type");
        }
    });
}

main();
