/*
The structure of the tabs dictionary, this keeps global state of all tabs:

tabs = {
	tabId: {
		"Tab": object,
		"Date": object,
		"Pinned": boolean
	}
}

The two variables stored in chrome storage are timeLimit and threshold
because they need to persist over multiple chrome sessions.
*/


/*
3. Add tab to modal visually if the modal is open
4. Don't start/stop auto-close if they're already started/stopped
6. Don't allow multiple modals to be open at once
*/

var tabs = {};
var timeLimit;  // in minutes
var threshold;
var numTabs = 0;  // Need an in-memory count of the number of tabs because when a lot of alarms go off at the same time,
									// we need this to make sure we don't delete past the threshold (because of stacked alarm listeners)

chrome.storage.sync.get(["timeLimit", "threshold"], function(settings) {
  if (!("timeLimit" in settings && "threshold" in settings)) {
    chrome.storage.sync.set({
      "timeLimit": 5,
      "threshold": 5
    });
    timeLimit = 5;
    threshold = 5;
  } else {
    timeLimit = parseInt(settings["timeLimit"]);
    threshold = parseInt(settings["threshold"]);
  }

  // Make sure we get all current tabs after getting current settings
  chrome.tabs.query({}, function(tabList) {
		for (var i = 0; i < tabList.length; i++) {
			var tab = tabList[i];
			console.log('calling addOrUpdateTab');
			addOrUpdateTab(tab.id, tab, timeLimit);
		}
	});
});

// Called whenever a tab is created or updated
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	addOrUpdateTab(tabId, tab, timeLimit);
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

	// onActivated might be called before onUpdated, so if the tab doesn't   
	// exist in the tabs global object yet, we don't need to do anything
	// We also don't need to do anything if we're below the threshold
	if (tabs[tabId] && !tabs[tabId]["Pinned"] && Object.keys(tabs).length > threshold) {
		
		tabs[tabId]["Date"] = Date.now();

		chrome.runtime.sendMessage({text: "start", tabId: tabId}, function(response) {
			console.log("got start in onActivated response");
		});

		// New alarm automatically clears the previous one
		chrome.alarms.create(tabId.toString(), {delayInMinutes: timeLimit});
	}
});

// This is called whenever a tab is removed manually or via alarm
chrome.tabs.onRemoved.addListener(function(tabId, tab) {

	// Have to delete UI element first before deleting tabs[tabId],
	// so we put the data-deletion code in the callback function
	chrome.runtime.sendMessage({text: "removeTab", tabId: tabId}, function(response) {

		console.log("got removeTab response");

		chrome.alarms.clear(tabId.toString());
		delete tabs[tabId];

		numTabs = Object.keys(tabs).length;

		// Stop autoclose whenever we drop to the threshold
		if (numTabs == threshold) {
			stopAutoClose();
		}
	});
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

// /**
//  * Adds a new tab to the tab dictionary (or update a tab, doesn't have to just be add)
//  *
//  * @param {number} tabId - The Id of the new tab
//  * @param {object} tab - The actual tab object
//  * @params {number} timeLimit - How long to store tab for
//  */
// function addOrUpdateTab(tabId, tab, timeLimit) {
// 	if (!(tabId in tabs)) {
// 		// Add a tab
// 		tabs[tabId] = {};
// 		tabs[tabId]["Tab"] = tab;
// 		tabs[tabId]["Pinned"] = false;

// 		numTabs = Object.keys(tabs).length;

// 		if (numTabs == threshold + 1) {
// 			// Start autoclose if we pass threshold
// 			startAutoClose();
// 		} else if (numTabs > threshold + 1) {
// 			tabs[tabId]["Date"] = Date.now();
// 			chrome.alarms.create(tabId.toString(), {delayInMinutes: timeLimit});
// 		}

// 		// Have to populate tabs[tabId] fields before updating UI
// 		chrome.runtime.sendMessage({text: "addTab", tabId: tabId}, function(response) {
// 			console.log("got addTab response");
// 		});
// 	} else {
// 		// Update an existing tab

// 		// TODO: Update UI
// 		tabs[tabId]["Tab"] = tab;
// 	}
// }

// /**
//  * If we go above tab threshold, enable auto-close and reset previous timers if they exist
//  */
// function startAutoClose() {
// 	console.log("Auto close started");
// 	for (var tabId in tabs) {
// 		if (!tabs[tabId]["Pinned"]) {  // Don't start auto-close if the tab is pinned

// 			tabs[tabId]["Date"] = Date.now();

// 			chrome.runtime.sendMessage({text: "start", tabId: tabId}, function(response) {
// 				console.log("got startAutoClose response");
// 			});

// 			chrome.alarms.create(tabId.toString(), {delayInMinutes: timeLimit});
// 		}
// 	}
// }

// /**
//  * If we go below tab threshold, disable auto-close
//  */
// function stopAutoClose() {
// 	console.log("Auto close stopped");
// 	chrome.alarms.clearAll();
// 	for (var tabId in tabs) {
// 		if (!tabs[tabId]["Pinned"]) {  // Don't stop auto-close if the tab is pinned
// 			chrome.runtime.sendMessage({text: "stop", tabId: tabId}, function(response) {
// 				console.log("got stopAutoClose response");
// 			});
// 		}
// 	}
// }

// /**
//  * Animate favicon if a tab is about to be deleted
//  */
// function changeFavicon() {
// 	var link = document.querySelector("link[rel~='icon']");
// 	if (!link) {
// 	  link = document.createElement("link");
// 	  link.setAttribute("rel", "icon");
// 	  document.head.appendChild(link);
// 	}
// }

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
	      // console.log("Already there");
	    }

	    // No response, inject jquery and content script, then resend message and insert css
	    else {
	      // console.log("Not there, inject content script");
	      chrome.tabs.executeScript(tab.id, {file: "jquery.min.js"}, function() {
		      chrome.tabs.executeScript(tab.id, {file: "tabless-extension-content-script.js"}, function() {
		      	chrome.tabs.sendMessage(tab.id, {text: "toggle"});
		      	chrome.tabs.insertCSS(tab.id, {file: "tabless-extension-iframe-styles.css"}, function() {
		      		// console.log('CSS inserted');
		      	});
		      });
		    });
	    }
		});
	}
});
