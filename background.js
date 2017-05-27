var tabs = {};

chrome.tabs.query({}, function(tabList) {
	for (var i = 0; i < tabList.length; i++) {
		var tab = tabList[i];
		tabs[tab.id] = {};
		tabs[tab.id]["Tab"] = tab;
		if (!("Date" in tabs[tab.id] || "Alarm" in tabs[tab.id] || "Locked" in tabs[tab.id])) {
			tabs[tab.id]["Date"] = Date.now();
			tabs[tab.id]["Alarm"] = chrome.alarms.create('', {delayInMinutes: 1});
			tabs[tab.id]["Locked"] = false;
		}
	}
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	tabs[tabId] = {};
	tabs[tabId]["Tab"] = tab;
	if (!("Date" in tabs[tab.id] || "Alarm" in tabs[tab.id] || "Locked" in tabs[tab.id])) {
		tabs[tab.id]["Date"] = Date.now();
		tabs[tab.id]["Alarm"] = chrome.alarms.create('', {delayInMinutes: 1});
		tabs[tab.id]["Locked"] = false;
	}
});

// To handle pre-rendering, which alters tab ids
chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
	var tab = tabs[removedTabId];
	delete tabs[removedTabId];
	tabs[addedTabId] = tab;
	tabs[tabId]["Tab"] = tab;
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
	var tabId = activeInfo["tabId"];
});

chrome.tabs.onRemoved.addListener(function(tabId, tab) {
	delete tabs[tabId];
});

function changeFavicon() {
	var link = document.querySelector("link[rel~='icon']");
	if (!link) {
	  link = document.createElement("link");
	  link.setAttribute("rel", "icon");
	  document.head.appendChild(link);
	}
}