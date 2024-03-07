main();
/**
 * @typedef {Object} BackgroundAnswer
 * @property {boolean} isOk
 * @property {string} message
 */

/**
 * @param {unknown} object
 * @returns {object is BackgroundAnswer}
 */
function isBackgroundAnswer(object) {
    if (!object || typeof object !== "object") {
        return false;
    }
    if (!("isOk" in object && "message" in object)) {
        return false;
    }
    if (typeof object.isOk !== "boolean" || typeof object.message != "string") {
        return false;
    }
    return true;
}

/**
 * @param {HTMLDivElement} div
 * @param {string} message
 */
function setError(div, message) {
    div.classList.remove("success");
    div.classList.add("error");
    div.innerText = message;
}

/**
 * @param {HTMLDivElement} div
 * @param {string} message
 */
function setSuccess(div, message) {
    div.classList.remove("error");
    div.classList.add("success");
    div.innerText = message;
}

function main() {
    /**
     * @type {HTMLFormElement | null}
     */
    const form = document.getElementById("form");
    /**
     * @type {HTMLDivElement | null}
     */
    const errorMessage = document.getElementById("error-message");

    if (!form || !errorMessage) {
        console.error("[easy-test error] Your installation is flawed");
        return;
    }

    form.onsubmit = (e) => {
        e.preventDefault();
        /**
         * @type {HTMLFormElement}
         */
        const form = e.target;
        const formData = new FormData(form);

        const upload = formData.get("upload");
        if (!upload) {
            setError(errorMessage, "Answers field is empty");
            return;
        }
        try {
            const data = JSON.parse(upload);
            browser.runtime
                .sendMessage({ updatedAnswers: data })
                .then((res) => {
                    if (!isBackgroundAnswer(res)) {
                        setError(
                            errorMessage,
                            "Cold not get an answer\nfrom background script"
                        );
                        return;
                    }
                    if (res.isOk) {
                        setSuccess(errorMessage, res.message);
                    } else {
                        setError(errorMessage, res.message);
                    }
                });
        } catch {
            setError(errorMessage, "The answers are not\nvalid Json");
        }
    };
}
