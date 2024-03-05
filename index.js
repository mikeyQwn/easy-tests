main();

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

    browser.runtime.onMessage.addListener((req, _sender, _sendRes) => {
        console.log(req);
    });

    setInterval(() => {
        console.log(getElementText(lastTarget));
    }, 5000);
}
