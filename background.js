var tabs = {};

chrome.tabs.query({}, function(tabList) {
	for (var i = 0; i < tabList.length; i++) {
		var tab = tabList[i];
		tabs[tab.id] = {};
		tabs[tab.id]["Tab"] = tab;
		if (!("Date" in tabs[tab.id] || "Alarm" in tabs[tab.id])) {
			tabs[tab.id]["Date"] = Date.now();
			tabs[tab.id]["Alarm"] = chrome.alarms.create('', {delayInMinutes: 1});
		}
	}
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	console.log(tab);
	// text = tab.url;
	tabs[tabId] = {};
	tabs[tabId]["Tab"] = tab;
	if (!("Date" in tabs[tabId] || "Alarm" in tabs[tabId])) {
		tabs[tabId]["Date"] = Date.now();
		tabs[tabId]["Alarm"] = chrome.alarms.create('', {delayInMinutes: 1});
	}
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