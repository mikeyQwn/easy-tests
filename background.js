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
