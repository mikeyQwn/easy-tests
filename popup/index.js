main();
/**
 * @typedef {Object} BackgroundAnswer
 * @property {boolean} isOk
 * @property {string} message
 */

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
 * @param {HTMLElement} div
 * @param {string} message
 */
function setError(div, message) {
    div.classList.remove("success");
    div.classList.add("error");
    div.innerText = message;
}

/**
 * @param {HTMLElement} div
 * @param {string} message
 */
function setSuccess(div, message) {
    div.classList.remove("error");
    div.classList.add("success");
    div.innerText = message;
}

/**
 * @param {HTMLElement} _form
 * @returns {_form is HTMLFormElement}
 */
function isFormTrustMe(_form) {
    return true;
}

/**
 * @param {HTMLFormElement} form
 * @returns {Record<string, unknown>}
 */
function validateForm(form) {
    const formData = new FormData(form);
    const upload = formData.get("upload");
    if (!upload) {
        throw "Answers field is empty";
    }

    if (typeof upload !== "string") {
        throw "Answers field is not string somehow";
    }

    try {
        const data = JSON.parse(upload);
        if (!isObject(data)) {
            throw "Invalid json format";
        }
        return data;
    } catch {
        throw "The answers are not\nvalid Json";
    }
}

function main() {
    const form = document.getElementById("form");
    const errorMessage = document.getElementById("error-message");

    if (!form || !errorMessage) {
        console.error("[easy-test error] Your installation is flawed");
        return;
    }

    if (!isFormTrustMe(form)) {
        return;
    }

    form.onsubmit = (e) => {
        e.preventDefault();

        try {
            const data = validateForm(form);
            browser.runtime
                .sendMessage({ updatedAnswers: data })
                .then((res) => {
                    if (!isBackgroundAnswer(res)) {
                        throw "Cold not get an answer\nfrom background script";
                    }
                    if (res.isOk) {
                        setSuccess(errorMessage, res.message);
                    } else {
                        throw res.message;
                    }
                });
        } catch (err) {
            if (typeof err !== "string") {
                console.error(`[index] ${err}`);
                return;
            }

            setError(errorMessage, err);
        }
    };
}
