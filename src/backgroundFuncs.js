/**
 * Adds a new tab to the tab dictionary (or update a tab, doesn't have to just be add)
 *
 * @param {number} tabId - The Id of the new tab
 * @param {object} tab - The actual tab object
 * @params {number} duration - How long to store tab for (milliseconds)
 */
function addOrUpdateTab(tabId, tab, duration) {
    if (!(tabId in tabs)) {
        console.log("addOrUpdateTab started - if statement");

        var now = Date.now();

        // Add a tab
        if (numTabs < threshold) {
            tabs[tabId] = {};
            tabs[tabId]["Tab"] = tab;
            tabs[tabId]["Pinned"] = false;
            tabs[tabId]["Created"] = now;
        } else if (numTabs == threshold) {
            startAutoclose();
            tabs[tabId] = {};
            tabs[tabId]["Tab"] = tab;
            tabs[tabId]["Pinned"] = false;
            tabs[tabId]["Created"] = now;
            if (tabId != activeTabId) {
                tabs[tabId]["End"] = now + duration;
                chrome.alarms.create(tabId.toString(), {when: tabs[tabId]["End"]});
            }
        } else {
            tabs[tabId] = {};
            tabs[tabId]["Tab"] = tab;
            tabs[tabId]["Pinned"] = false;
            tabs[tabId]["Created"] = now;
            if (tabId != activeTabId) {
                tabs[tabId]["End"] = now + duration;
                chrome.alarms.create(tabId.toString(), {when: tabs[tabId]["End"]});
            }
        }

        numTabs = Object.keys(tabs).length;

        // Have to populate tabs[tabId] fields before updating UI
        chrome.runtime.sendMessage({text: "addTab", tabId: tabId}, function(response) {
            console.log("got addTab response");
        });
    } else {
        console.log("addOrUpdateTab started - else statement");
        // Update an existing tab
        tabs[tabId]["Tab"] = tab;

        chrome.runtime.sendMessage({text: "updateTab", tabId: tabId}, function(response) {
            console.log("got updateTab response");
        });
    }
}

/**
 * If we go above tab threshold, enable auto-close and reset previous timers
 */
function startAutoclose() {
    console.log("Autoclose started");
    var end = Date.now() + duration;
    for (var tabId in tabs) {

        // Don't start auto-close if the tab is pinned
        if (!tabs[tabId]["Pinned"]) {

            tabs[tabId]["End"] = end;
            console.log(tabs[tabId]["End"]);

            chrome.alarms.create(tabId.toString(), {when: end});
        }
    }

    chrome.runtime.sendMessage({text: "startAll"}, function(response) {
        console.log("got startAll response in startAutoclose");
    });
}

/**
 * If we unlock the computer, enable autoclose and restore existing timers
 */
function unpauseAutoclose() {
    console.log("unpauseAutoclose started");
    var now = Date.now();
    var difference = now - lastStopDate;
    for (var tabId in tabs) {

        // Don't unpause auto-close if the tab is pinned
        if (!tabs[tabId]["Pinned"]) {

            // When unpausing a tab with less than 1 min left, set the alarm back to 1 min 
            // because chrome API doesn't allow alarms of <1 min in prod
            tabs[tabId]["End"] = Math.max(tabs[tabId]["End"] + difference, now + 60000);
            chrome.alarms.create(tabId.toString(), {when: tabs[tabId]["End"]});
        }
    }

    chrome.runtime.sendMessage({text: "startAll"}, function(response) {
        console.log("got startAll response in unpauseAutoclose");
    });
}

/**
 * If we go below tab threshold or the computer locks, disable auto-close
 */
function stopAutoclose() {
    console.log("stopAutoclose started");
    chrome.alarms.clearAll();
    // for (var tabId in tabs) {

    //  // Don't stop auto-close if the tab is pinned
    //  if (!tabs[tabId]["Pinned"]) {
    //      chrome.runtime.sendMessage({text: "stop", tabId: tabId}, function(response) {
    //          console.log("got stopAutoclose response");
    //      });
    //  }
    // }
    lastStopDate = Date.now();

    chrome.runtime.sendMessage({text: "stopAll"}, function(response) {
        console.log("got stopAll response in stopAutoClose");
    });
}

/**
 * Add a newly-closed tab to history
 *
 * @param {number} tabId - The Id of the closed tab
 */
 function addToClosedTabs(tabId) {
    closedTabs[tabId] = {};
    closedTabs[tabId] = tabs[tabId];
    closedTabs[tabId]["Closed"] = Date.now();

    chrome.runtime.sendMessage({text: "addHistory", tabId: tabId}, function(response) {
        console.log("got addHistory response");
    });
 }

 /**
 * Activate a tab
 *
 * @param {number} tabId - The Id of the newly activated tab
 */
 function activateTab(tabId) {
    var prevActiveTabId = activeTabId;
    activeTabId = tabId;

    if (tabs[activeTabId]) {
        tabs[activeTabId]["End"] = null;
    }

    chrome.alarms.clear(activeTabId.toString());

    chrome.runtime.sendMessage({text: "setActiveTab", newActiveTabId: activeTabId, oldActiveTabId: prevActiveTabId}, function(response) {
        console.log("got setActiveTab response in onActivated");
    });

    // onActivated might be called before onUpdated (when the tab is first created),
    // so if the tab doesn't exist in the tabs global object yet, don't do anything
    // We also don't need to do anything if we're below the threshold
    if (prevActiveTabId && tabs[prevActiveTabId] && !tabs[prevActiveTabId]["Pinned"] && Object.keys(tabs).length > threshold) {

        tabs[prevActiveTabId]["End"] = Date.now() + duration;
        chrome.alarms.create(prevActiveTabId.toString(), {when: tabs[prevActiveTabId]["End"]});

        chrome.runtime.sendMessage({text: "start", tabId: prevActiveTabId}, function(response) {
            console.log("got start response in onActivated");
        });
    }
 }

/**
 * Animate favicon if a tab is about to be deleted
 */
function changeFavicon() {
    var link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "icon");
      document.head.appendChild(link);
    }
}

// if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
//  module.exports.addOrUpdateTab = addOrUpdateTab;
// } else {
//  window.addOrUpdateTab = addOrUpdateTab;
// }

// module.exports.addOrUpdateTab = addOrUpdateTab;