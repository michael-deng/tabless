var tabs = {};

chrome.tabs.query({}, function(allTabs) {
	for (var i = 0; i < allTabs.length; i++) {
		tabs[allTabs[i].id] = allTabs[i];
	}
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	console.log(tab);
	// text = tab.url;
	tabs[tabId] = tab;
});

chrome.tabs.onRemoved.addListener(function(tabId, tab) {
	delete tabs[tabId];
});