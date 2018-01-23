/*
The structure of the tabs dictionary, this keeps global state of all tabs:

tabs = {
    tabId: {
        "Tab": object,
        "End": object,
        "Pinned": boolean
    }
}

The two variables stored in chrome storage are duration and threshold
because they need to persist over multiple chrome sessions.
*/

/*
3. Add tab to modal visually if the modal is open
4. Don't start/stop auto-close if they're already started/stopped
6. Don't allow multiple modals to be open at once
*/

var tabs = {};
var open;  // Whether or not Tabless is turned on
var duration;  // How long to wait after the latest activation before closing a tab (milliseconds)
var threshold;  // We only start autoclosing if there are more than the threshold number of tabs open
var numTabs = 0;  // Need an in-memory count of the # of tabs because when many alarms go off together, we need to make sure
                  // we don't delete past the threshold (because multiple alarms can sound before the removal happens)
var stopDate;  // The date when stopAutoClose() is last called, so when we call unpauseAutoclose(), 
               // we can calculate new end dates
var locked = false;  // We use this locked variable to ensure we only call unpauseAutoclose 
                     // when the idleState changes from locked to active, not idle to active

// Get duration and threshold when chrome starts
chrome.storage.sync.get(["on", "duration", "threshold"], function(settings) {
    if (!("open" in settings && "duration" in settings && "threshold" in settings)) {
        chrome.storage.sync.set({
            "open": true,
            "duration": 300000,
            "threshold": 5
        });
        open = true;
        duration = 300000;
        threshold = 5;
    } else {
        open = (settings["open"] == 'true');
        duration = parseInt(settings["duration"]);
        threshold = parseInt(settings["threshold"]);
    }

    // Make sure we get all current tabs after getting current settings
    chrome.tabs.query({}, function(tabList) {
        for (var i = 0; i < tabList.length; i++) {
            var tab = tabList[i];
            console.log('calling addOrUpdateTab');
            addOrUpdateTab(tab.id, tab, duration);
        }
    });
});

// Called whenever a tab is created or updated
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    addOrUpdateTab(tabId, tab, duration);
});

// Handle pre-rendering, which alters tab ids
chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
    var tab = tabs[removedTabId];
    delete tabs[removedTabId];
    tabs[addedTabId] = tab;
});

// Reset alarm and timer if a tab is activated
chrome.tabs.onActivated.addListener(function(activeInfo) {
    var tabId = activeInfo["tabId"];

    // onActivated might be called before onUpdated (when the tab is first created), 
    // so if the tab doesn't exist in the tabs global object yet, don't do anything
    // We also don't need to do anything if we're below the threshold
    if (tabs[tabId] && !tabs[tabId]["Pinned"] && Object.keys(tabs).length > threshold && open) {
        
        tabs[tabId]["End"] = Date.now() + duration;

        // New alarm automatically clears the previous one
        chrome.alarms.create(tabId.toString(), {when: tabs[tabId]["End"]});

        chrome.runtime.sendMessage({text: "start", tabId: tabId}, function(response) {
            console.log("got start response in onActivated");
        });
    }
});

// This is called whenever a tab is removed manually or via alarm
chrome.tabs.onRemoved.addListener(function(tabId, tab) {

    chrome.alarms.clear(tabId.toString());

    // Have to delete UI element first before deleting tabs[tabId],
    // so we put the data-deletion code in the callback function
    chrome.runtime.sendMessage({text: "removeTab", tabId: tabId}, function(response) {
        console.log("got removeTab response");
    });

    delete tabs[tabId];

    numTabs = Object.keys(tabs).length;

    // Stop autoclose whenever we drop to the threshold
    if (numTabs == threshold) {
        stopAutoclose();
    }
});

// This is called whenever an alarm sounds
chrome.alarms.onAlarm.addListener(function(alarm) {
    var tabId = parseInt(alarm["name"]);

    console.log("alarm sounded");

    // Don't delete tabs past the threshold
    if (numTabs > threshold) {
        chrome.tabs.remove(tabId);
        numTabs--;
    }
});

// Check if computer goes to sleep/wakes up
chrome.idle.onStateChanged.addListener(function(idleState) {
    console.log("state changed")
    if (idleState == 'active' && locked && Object.keys(tabs).length > threshold) {
        unpauseAutoclose();
        locked = false;
    } else if (idleState == 'locked') {
        stopAutoclose();
        locked = true;
    }
});

var injecting = false;

// Toggle modal
chrome.browserAction.onClicked.addListener(function(tab) {

    // Chrome doesn't let us to inject scripts into chrome:// or chrome-extension:// urls
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
        alert("Uh oh, Tabless couldn't start on this page. If you're on a \"chrome://\" or \"chrome-extension://\" page, " + 
                    "you aren't allowed to open Tabless. If not, let us know what's happening and we'll get to the bottom of this!");
    } else {
        chrome.tabs.sendMessage(tab.id, {text: "toggle"}, function(response) {

            // If we get a response, it means the content script is running and received our message
            if (response) {
                console.log("Content script already there");
            }

            // No response, inject jquery and content script, then resend message and insert css
            else {
                if (!injecting) {
                    console.log("Content script not there, inject jquery, content script, and css");
                    injecting = true;
                    chrome.tabs.executeScript(tab.id, {file: "jquery.min.js"}, function() {
                        chrome.tabs.executeScript(tab.id, {file: "tabless-extension-content-script.js", runAt: "document_start"}, function() {
                            console.log("injected content script");
                            chrome.tabs.sendMessage(tab.id, {text: "toggle"});
                            chrome.tabs.insertCSS(tab.id, {file: "tabless-extension-iframe-styles.css"}, function() {
                                // console.log('CSS inserted');
                            });
                            injecting = false;
                        });
                    });
                } else {
                    console.log("Already injecting");
                }
            }
        });
    }
});
