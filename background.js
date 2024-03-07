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

browser.runtime.onMessage.addListener((req, _sender, sendRes) => {
    if (!isAnswers(req)) {
        sendRes({
            isOk: false,
            message: "Answers should be\nstring-string json",
        });
        return;
    }
    browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => {
        browser.tabs
            .sendMessage(tabs[0].id, {
                updatedAnswers: req,
            })
            .catch((_) => {
                console.error(
                    "[background] Failed to send a message\nto the context script"
                );
            });
    });
    sendRes({
        isOk: true,
        message: "Answers have been\nupdated",
    });
});

function sendEvent() {
    browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => {
        browser.tabs
            .sendMessage(tabs[0].id, {
                show_answer: true,
            })
            .catch((_) => {
                console.error(
                    "[background] Failed to send a message to the context script"
                );
            });
    });
}

browser.commands.onCommand.addListener((command) => {
    if (command === "show-answer") {
        sendEvent();
    } else {
        console.error("[background] Could not parse current command");
    }
});
