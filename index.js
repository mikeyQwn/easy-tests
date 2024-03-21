const EVENT_TYPES = {
    SHOW_ANSWER: "showAnswer",
    GET_QUESTION: "getQuestion",
};

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

function tryShowAnswer(req) {
    if (!("message" in req && typeof req.message === "string")) {
        console.error("[context] Invalid show-answer request");
        console.error(req);
        return;
    }
    const answerEl = document.createElement("div");
    answerEl.innerText = req.message;
    document.body.appendChild(answerEl);
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
