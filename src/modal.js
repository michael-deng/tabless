/*
The structure of the modalTabs dictionary, this keeps per-modal info for tabs:

modalTabs = {
    tabId: {
        "Timer": HTML element,
        "TimerId": integer (need this to clear timers),
        "Pin": HTML element
    }
}
*/

/* TODO
1. Clean up code, use DRY
2. Think about how Timer and TimerId might break in different use cases
*/

var bg;  // The window of the background page
var modalTabs = {};

chrome.runtime.getBackgroundPage(function(background) {
    bg = background;
    var table = document.getElementById('tabs-table');

    // Populate the tabs table row by row
    for (let key of Object.keys(bg.tabs).sort(function(a,b){return bg.tabs[a]['Created']-bg.tabs[b]['Created']})) {
        addTabRow(key, table);
    }

    var historyTable = document.getElementById('history-table');

    // Populate the history table row by row
    for (let key of Object.keys(bg.closedTabs).sort(function(a,b){return bg.closedTabs[a]['Closed']-bg.closedTabs[b]['Closed']})) {
        addHistoryRow(key, historyTable);
    }

    // Populate "Settings" tab with information from background
    durationHours = Math.floor(bg.duration / 3600000);
    durationMinutes = Math.floor((bg.duration % 3600000) / 60000);
    document.getElementById("time-limit-hours").value = durationHours;
    document.getElementById("time-limit-minutes").value = durationMinutes;
    document.getElementById("min-open-tabs").value = bg.threshold;
    document.getElementById("min-open-tabs-count").innerHTML = bg.threshold;

    // Listen to commands from the background page
    chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
        if (msg.text == "addTab") {
            var table = document.getElementById('tabs-table');

            addTabRow(msg.tabId, table);
        }

        else if (msg.text == "addHistory") {
            var table = document.getElementById('history-table');

            addHistoryRow(msg.tabId, table);
        }

        else if (msg.text == "updateTab") {
            var tabId = msg.tabId;

            var cell1 = modalTabs[tabId]["Row"].cells[0];
            var cell2 = modalTabs[tabId]["Row"].cells[1];

            var tab = bg.tabs[tabId]["Tab"];

            var favIconUrl = tab.favIconUrl;
            if (favIconUrl) {
                if (favIconUrl.startsWith('chrome://') || favIconUrl.startsWith('chrome-extension://')) {
                    cell1.innerHTML = "<img class=\"favicon\" src=\"assets\/google.png\">";
                } else {
                    // secureFavIconUrl = favIconUrl.replace(/^http:/, 'https:');
                    cell1.innerHTML = "<img class=\"favicon\" src=" + favIconUrl + ">";
                }
            } else {
                cell1.innerHTML = "<img class=\"favicon\" src=\"assets\/default_favicon.png\">";
            }

            cell2.getElementsByClassName("tab-title")[0].innerHTML = tab.title;
        }

        else if (msg.text == "removeTab") {
            // Remove row
            var tabId = msg.tabId;
            var row = modalTabs[tabId]["Timer"].parentNode.parentNode;
            row.parentNode.removeChild(row);

            // Clear UI timer
            clearInterval(modalTabs[tabId]["TimerId"]);

            // Remove tabTimer entry
            delete modalTabs[tabId];
        }

        else if (msg.text == "start") {
            var tabId = msg.tabId;

            clearInterval(modalTabs[tabId]["TimerId"]);  // Clear previous timer if it exists
            modalTabs[tabId]["TimerId"] = countdown(bg.tabs[tabId]["End"], modalTabs[tabId]["Timer"]);
        }

        else if (msg.text == "startAll") {
            for (tabId in modalTabs) {
                if (!bg.tabs[tabId]["Pinned"]) {
                    clearInterval(modalTabs[tabId]["TimerId"]);  // Clear previous timer if it exists
                    modalTabs[tabId]["TimerId"] = countdown(bg.tabs[tabId]["End"], modalTabs[tabId]["Timer"]);
                }
            }
        }

        else if (msg.text == "stopAll") {
            for (tabId in modalTabs) {
                if (!bg.tabs[tabId]["Pinned"]) {
                    clearInterval(modalTabs[tabId]["TimerId"]);
                    modalTabs[tabId]["Timer"].innerHTML = "Below threshold";
                }
            }
        }
    });

    // Listen to changes in the threshold input
    document.getElementById("min-open-tabs").addEventListener('input', function(event) {
        if (isNumeric(this.value)) {
            // Update the min open tabs count in the caption
            document.getElementById("min-open-tabs-count").innerHTML = this.value;
        }
    });

    // Handle settings form submission
    document.getElementById("settings-form").addEventListener("submit", function(event) {
        event.preventDefault();

        var durationHours = document.getElementById("time-limit-hours");
        var durationMinutes = document.getElementById("time-limit-minutes")
        var durationError = document.getElementById("time-limit-error");

        if (durationHours.value == "") {
            durationHours.value = 0;
        }

        if (!isNumeric(durationHours.value)) {
            durationError.innerHTML = "Hours has to be a number";
            durationHours.focus();
            return false;
        }

        if (durationHours.value < 0) {
            durationError.innerHTML = "Hours cannot be less than 0";
            durationHours.focus();
            return false;
        }

        if (durationHours.value > 720) {
            durationError.innerHTML = "Hours cannot be greater than 720";
            durationHours.focus();
            return false;
        }

        if (durationHours.value % 1 != 0) {
            durationError.innerHTML = "Hours has to be a whole number";
            durationHours.focus();
            return false;
        }

        if (durationMinutes.value == "") {
            durationMinutes.value = 0;
        }

        if (!isNumeric(durationMinutes.value)) {
            durationError.innerHTML = "Minutes has to be a number";
            durationMinutes.focus();
            return false;
        }

        if (durationMinutes.value < 0) {
            durationError.innerHTML = "Minutes cannot be less than 0";
            durationMinutes.focus();
            return false;
        }

        if (durationMinutes.value % 1 != 0) {
            durationError.innerHTML = "Minutes has to be a whole number";
            durationMinutes.focus();
            return false;
        }

        if (durationMinutes.value > 59) {
            durationError.innerHTML = "Minutes cannot be greater than 59";
            durationMinutes.focus();
            return false;
        }

        if (durationHours.value == 0 && durationMinutes.value == 0) {
            durationError.innerHTML = "Duration has to be at least 1 minute";
            durationMinutes.focus();
            return false;
        }

        durationError.innerHTML = "";

        var threshold = document.getElementById("min-open-tabs");
        var thresholdError = document.getElementById("min-open-tabs-error");

        if (threshold.value == "") {
            thresholdError.innerHTML = "Minimum open tabs cannot be blank";
            threshold.focus();
            return false;
        }

        if (!isNumeric(threshold.value)) {
            thresholdError.innerHTML = "Minimum open tabs has to be a number";
            threshold.focus();
            return false;
        }

        if (threshold.value < 1) {
            thresholdError.innerHTML = "Minimum open tabs cannot be less than 1";
            threshold.focus();
            return false;
        }

        if (threshold.value > 999) {
            thresholdError.innerHTML = "Minimum open tabs cannot be greater than 999";
            threshold.focus();
            return false;
        }

        if (threshold.value % 1 != 0) {
            thresholdError.innerHTML = "Minimum open tabs has to be a whole number";
            threshold.focus();
            return false;
        }

        thresholdError.innerHTML = "";

        // Show submit indicator as "Saving..." and change it to "Done." in two seconds
        var submitIndicator = document.getElementsByClassName("submit-indicator")[0];
        submitIndicator.style.display = "block";
        submitIndicator.innerHTML = "Saving...";

        // Duration will be stored in minutes
        bg.duration = 3600000 * parseInt(durationHours.value) + 60000 * parseInt(durationMinutes.value);
        bg.threshold = threshold.value;

        chrome.storage.sync.set({
            "duration": bg.duration,
            "threshold": threshold.value
        }, function() {
            if (chrome.runtime.lastError) {
                // Save failure
                submitIndicator.innerHTML = "We hit a snag trying to save your settings, please try again!";
                return false;
            } else {
                // Save success
                setTimeout(function() {
                    submitIndicator.innerHTML = "Saved!";
                }, 500);

                if (Object.keys(bg.tabs).length > bg.threshold) {
                    // Update the timers of every tab
                    console.log("Start autoclose in settings");
                    chrome.alarms.clearAll();  // Might have to add callback in parameter
                    var end = Date.now() + bg.duration;
                    for (key in bg.tabs) {
                        if (!bg.tabs[key]["Pinned"]) {
                            bg.tabs[key]["End"] = end;
                            chrome.alarms.create(key.toString(), {when: end});
                            clearInterval(modalTabs[key]["TimerId"]);
                            modalTabs[key]["TimerId"] = countdown(end, modalTabs[key]["Timer"]);  // Update the timers UI in the "Tabs" tab
                        }
                    }
                } else {
                    // Stop autoclose
                    console.log("Stop autoclose in settings");
                    chrome.alarms.clearAll();
                    for (key in bg.tabs) {
                        if (!bg.tabs[key]["Pinned"]) {
                            clearInterval(modalTabs[key]["TimerId"]);
                            modalTabs[key]["Timer"].innerHTML = "Below threshold";  // Update the timers UI in the "Tabs" tab
                        }
                    }
                }
            }
        });
        return false;
    });

    // Listens for click event that opens the "Settings" page
    document.getElementById("settings-open-btn").firstChild.addEventListener("click", function() {
        settings = document.getElementById("settings");
        console.log(settings);
        settings.style.left = "0px";
        settings.style.boxShadow = "0 0 50px rgba(0,0,0,0.3)";
    });

    // Listens for click event that closes the "Settings" page
    document.getElementById("settings-close-btn").firstChild.addEventListener("click", function() {
        settings = document.getElementById("settings");
        settings.style.left = "-300px";
        settings.style.boxShadow = "none";
    });

    // Listens for click event that opens the "Settings" page
    document.getElementById("history-open-btn").firstChild.addEventListener("click", function() {
        hist = document.getElementById("history");
        hist.style.left = "0px";
        hist.style.boxShadow = "0 0 50px rgba(0,0,0,0.3)";
    });

    // Listens for click event that closes the "history" page
    document.getElementById("history-close-btn").firstChild.addEventListener("click", function() {
        hist = document.getElementById("history");
        hist.style.left = "-300px";
        hist.style.boxShadow = "none";
    });

    // Listens for click event that closes the modal
    document.getElementById("modal-close-btn").firstChild.addEventListener("click", function() {
        chrome.tabs.getCurrent(function(tab) {
            chrome.tabs.sendMessage(tab.id, {text: "toggle"});
        });
    });

    // Listens for click event that pins all websites
    document.getElementById("pin-all").addEventListener("click", function() {
        var pins = document.getElementsByClassName('tab-pin');
        for (key in bg.tabs) {
            if (!bg.tabs[key]["Pinned"]) {
                togglePin(key);
            }
        }
    });

    // Listens for click event that unpins all websites
    document.getElementById("unpin-all").addEventListener("click", function() {
        var pins = document.getElementsByClassName('tab-pin');
        for (key in bg.tabs) {
            if (bg.tabs[key]["Pinned"]) {
                togglePin(key);
            }
        }
    });
});
