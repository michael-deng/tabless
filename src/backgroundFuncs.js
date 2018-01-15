/**
 * Adds a new tab to the tab dictionary (or update a tab, doesn't have to just be add)
 *
 * @param {number} tabId - The Id of the new tab
 * @param {object} tab - The actual tab object
 * @params {number} duration - How long to store tab for (milliseconds)
 */
function addOrUpdateTab(tabId, tab, duration) {
	if (!(tabId in tabs)) {
		console.log("addOrUpdateTab started")
		// Add a tab
		if (numTabs < threshold) {
			tabs[tabId] = {};
			tabs[tabId]["Tab"] = tab;
			tabs[tabId]["Pinned"] = false;
		} else if (numTabs == threshold) {
			startAutoclose();
			tabs[tabId] = {};
			tabs[tabId]["Tab"] = tab;
			tabs[tabId]["Pinned"] = false;
			tabs[tabId]["End"] = Date.now() + duration;
			chrome.alarms.create(tabId.toString(), {when: tabs[tabId]["End"]});
		} else {
			tabs[tabId] = {};
			tabs[tabId]["Tab"] = tab;
			tabs[tabId]["Pinned"] = false;
			tabs[tabId]["End"] = Date.now() + duration;
			chrome.alarms.create(tabId.toString(), {when: tabs[tabId]["End"]});
		}

		numTabs = Object.keys(tabs).length;

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

			chrome.runtime.sendMessage({text: "start", tabId: tabId}, function(response) {
				console.log("got start response in startAutoclose");
			});

			chrome.alarms.create(tabId.toString(), {when: end});
		}
	}
}

/**
 * If we unlock the computer, enable autoclose and restore existing timers
 */
function unpauseAutoclose() {
	console.log("unpauseAutoclose started");
	for (var tabId in tabs) {

		// Don't unpause auto-close if the tab is pinned
		if (!tabs[tabId]["Pinned"]) {

			chrome.runtime.sendMessage({text: "start", tabId: tabId}, function(response) {
				console.log("got startAutoclose response");
			});

			difference = Math.floor((Date.now() - tabs[tabId]["Date"]) / 60);

			chrome.alarms.create(tabId.toString(), {delayInMinutes: difference});
		}
	}
}

/**
 * If we go below tab threshold or the computer locks, disable auto-close
 */
function stopAutoclose() {
	console.log("stopAutoclose started");
	chrome.alarms.clearAll();
	for (var tabId in tabs) {

		// Don't stop auto-close if the tab is pinned
		if (!tabs[tabId]["Pinned"]) {
			chrome.runtime.sendMessage({text: "stop", tabId: tabId}, function(response) {
				console.log("got stopAutoclose response");
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