/*
The structure of the tabs dictionary:

tabs = {
	tabId: {
		"Tab": object,
		"Date": object,
		"Locked": boolean,
		"Alarm": boolean,
		"Timer": HTML element (inserted in popup.js),
		"TimerId": integer (inserted in popup.js)
	}
}

The two variables stored in chrome storage are timeLimit and minOpenTabs
because they need to persist over multiple chrome sessions.
*/

var tabs = {};
var timeLimit;  // in minutes
var minOpenTabs;

chrome.storage.sync.get(["timeLimit", "minOpenTabs"], function(settings) {
  if (!("timeLimit" in settings && "minOpenTabs" in settings)) {
    chrome.storage.sync.set({
      "timeLimit": 5,
      "minOpenTabs": 5
    });
    timeLimit = 5;
    minOpenTabs = 5;
  } else {
    timeLimit = settings["timeLimit"];
    minOpenTabs = settings["minOpenTabs"];
  }

  /* Make sure we get all current tabs after getting current settings first */
  chrome.tabs.query({}, function(tabList) {
		for (var i = 0; i < tabList.length; i++) {
			var tab = tabList[i];
			addTabToDictionary(tab.id, tab, timeLimit);
		}
	});
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	addTabToDictionary(tabId, tab, timeLimit);
});

/* To handle pre-rendering, which alters tab ids */
chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
	var tab = tabs[removedTabId];
	delete tabs[removedTabId];
	addTabToDictionary(addedTabId, tab, timeLimit);
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
	var tabId = activeInfo["tabId"];

	// TODO: reset timer
});

chrome.tabs.onRemoved.addListener(function(tabId, tab) {
	delete tabs[tabId];

	// TODO: if popup is open, delete row
});

chrome.alarms.onAlarm.addListener(function(alarm) {
	var tabId = parseInt(alarm["name"]);
	chrome.tabs.remove(tabId);
	var row = tabs[tabId]["Timer"].parentNode.parentNode;
	row.parentNode.removeChild(row);
	clearInterval(tabs[tabId]["TimerId"]);
	delete tabs[tabId];
});

/**
 * Adds a new tab to the tab dictionary
 *
 * @param {number} tabId - The Id of the new tab
 * @param {object} tab - The actual tab object
 * @params {number} timeLimit - How long to store tab for
 */
function addTabToDictionary(tabId, tab, timeLimit) {
	if (!(tabId in tabs)) {
		tabs[tabId] = {};
	}
	tabs[tabId]["Tab"] = tab;
	if (!("Date" in tabs[tabId] || "Locked" in tabs[tabId] || "Alarm" in tabs[tabId])) {
		tabs[tabId]["Locked"] = false;
		tabs[tabId]["Alarm"] = true;
		tabs[tabId]["Date"] = Date.now();
		chrome.alarms.create(tabId.toString(), {delayInMinutes: timeLimit});
	}
}

function changeFavicon() {
	var link = document.querySelector("link[rel~='icon']");
	if (!link) {
	  link = document.createElement("link");
	  link.setAttribute("rel", "icon");
	  document.head.appendChild(link);
	}
}