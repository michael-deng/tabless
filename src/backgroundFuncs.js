/**
 * Adds a new tab to the tab dictionary (or update a tab, doesn't have to just be add)
 *
 * @param {number} tabId - The Id of the new tab
 * @param {object} tab - The actual tab object
 * @params {number} timeLimit - How long to store tab for
 */
function addOrUpdateTab(tabId, tab, timeLimit) {
	if (!(tabId in tabs)) {
		// Add a tab
		tabs[tabId] = {};
		tabs[tabId]["Tab"] = tab;
		tabs[tabId]["Pinned"] = false;

		numTabs = Object.keys(tabs).length;

		if (numTabs == threshold + 1) {
			// Start autoclose if we pass threshold
			startAutoClose();
		} else if (numTabs > threshold + 1) {
			tabs[tabId]["Date"] = Date.now();
			chrome.alarms.create(tabId.toString(), {delayInMinutes: timeLimit});
		}

		// Have to populate tabs[tabId] fields before updating UI
		chrome.runtime.sendMessage({text: "addTab", tabId: tabId}, function(response) {
			console.log("got addTab response");
		});
	} else {
		// Update an existing tab

		// TODO: Update UI
		tabs[tabId]["Tab"] = tab;
	}
}

/**
 * If we go above tab threshold, enable auto-close and reset previous timers if they exist
 */
function startAutoClose() {
	console.log("Auto close started");
	for (var tabId in tabs) {
		if (!tabs[tabId]["Pinned"]) {  // Don't start auto-close if the tab is pinned

			tabs[tabId]["Date"] = Date.now();

			chrome.runtime.sendMessage({text: "start", tabId: tabId}, function(response) {
				console.log("got startAutoClose response");
			});

			chrome.alarms.create(tabId.toString(), {delayInMinutes: timeLimit});
		}
	}
}

/**
 * If we go below tab threshold, disable auto-close
 */
function stopAutoClose() {
	console.log("Auto close stopped");
	chrome.alarms.clearAll();
	for (var tabId in tabs) {
		if (!tabs[tabId]["Pinned"]) {  // Don't stop auto-close if the tab is pinned
			chrome.runtime.sendMessage({text: "stop", tabId: tabId}, function(response) {
				console.log("got stopAutoClose response");
			});
		}
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

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports.addOrUpdateTab = addOrUpdateTab;
} else {
	window.addOrUpdateTab = addOrUpdateTab;
}

// module.exports.addOrUpdateTab = addOrUpdateTab;