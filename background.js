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

  // Make sure we get all current tabs after getting current settings first
  chrome.tabs.query({}, function(tabList) {
		for (var i = 0; i < tabList.length; i++) {
			var tab = tabList[i];
			addTabToDictionary(tab.id, tab, timeLimit);
		}
	});
});

// Called whenever a tab is created or updated
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	addTabToDictionary(tabId, tab, timeLimit);
});

// To handle pre-rendering, which alters tab ids
chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
	var tab = tabs[removedTabId];
	delete tabs[removedTabId];
	addTabToDictionary(addedTabId, tab, timeLimit);
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
	var tabId = activeInfo["tabId"];

	// onActivated might be called before onUpdated, so if the tab doesn't exist
	// in the tabs dictionary yet, we don't need to do anything here
	if (tabs[tabId] && !tabs[tabId]["Locked"]) {
		// Clear UI timer
		if (tabs[tabId]["TimerId"]) {
			clearInterval(tabs[tabId]["TimerId"]);
		}
		// Clear alarm
		chrome.alarms.clear(tabId.toString());

		// Update everything
		tabs[tabId]["Date"] = Date.now();
		chrome.alarms.create(tabId.toString(), {delayInMinutes: timeLimit});
		// tabs[tabId]["TimerId"] = countdown(date, timer, bg.timeLimit);
	}
});

chrome.tabs.onRemoved.addListener(function(tabId, tab) {
	// Remove row from modal
	if (tabs[tabId]["Timer"]) {
		var row = tabs[tabId]["Timer"].parentNode.parentNode;
		row.parentNode.removeChild(row);
	}
	// Clear UI timer
	if (tabs[tabId]["TimerId"]) {
		clearInterval(tabs[tabId]["TimerId"]);
	}
	// Clear alarm
	chrome.alarms.clear(tabId.toString());
	delete tabs[tabId];
});

chrome.alarms.onAlarm.addListener(function(alarm) {
	var tabId = parseInt(alarm["name"]);
	chrome.tabs.remove(tabId);
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
	      console.log("Already there");
	    }

	    // No response, inject jquery and content script, then resend message and insert css
	    else {
	      console.log("Not there, inject content script");
	      chrome.tabs.executeScript(tab.id, {file: "jquery.min.js"}, function() {
		      chrome.tabs.executeScript(tab.id, {file: "tabless-extension-content-script.js"}, function() {
		      	chrome.tabs.sendMessage(tab.id, {text: "toggle"});
		      	chrome.tabs.insertCSS(tab.id, {file: "tabless-extension-iframe-styles.css"}, function() {
		      		console.log('CSS inserted');
		      	});
		      });
		    });
	    }
		});
	}
	// var iframe = document.createElement('iframe');
	// iframe.src = chrome.runtime.getURL("modal.html");
	// iframe.frameBorder = 0;
	// iframe.id = "myFrame";
	// document.body.appendChild(iframe);
	// var path = chrome.runtime.getURL("modal.html");
	// modal.style.display = "block";
});
