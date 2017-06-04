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
});

chrome.tabs.onRemoved.addListener(function(tabId, tab) {
	delete tabs[tabId];
});

function addTabToDictionary(tabId, tab, timeLimit) {
	tabs[tabId] = {};
	tabs[tabId]["Tab"] = tab;
	if (!("Date" in tabs[tabId] || "Alarm" in tabs[tabId] || "Locked" in tabs[tabId])) {
		tabs[tabId]["Date"] = Date.now();
		tabs[tabId]["Alarm"] = chrome.alarms.create(tabId.toString(), {delayInMinutes: timeLimit});
		tabs[tabId]["Locked"] = false;
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