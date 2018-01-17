/*
The structure of the modalTabs dictionary, this keeps per-modal info for tabs:

modalTabs = {
  tabId: {
    "Timer": HTML element,
    "TimerId": integer (need this to clear timers),
    "Pin": HTML element
  }
}
*/

/* TODO
1. Clean up code, use DRY
2. Think about how Timer and TimerId might break in different use cases
*/

var bg;  // The window of the background page
var modalTabs = {};

chrome.runtime.getBackgroundPage(function(background) {
  bg = background;
  var table = document.getElementById('tabs-table');

  // Populate the tabs table row by row
  for (key in bg.tabs) {
    var tab = bg.tabs[key]["Tab"];
    var end = bg.tabs[key]["End"];
    var pinned = bg.tabs[key]["Pinned"];
    var row = table.insertRow(-1);

    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);

    modalTabs[key] = {};

    // Set the favicon
    var favIconUrl = tab.favIconUrl;
    if (favIconUrl) {
      if (favIconUrl.startsWith('chrome://') || favIconUrl.startsWith('chrome-extension://')) {
        cell1.innerHTML = "<img class=\"favicon\" src=\"google.png\">";
      } else {
        // secureFavIconUrl = favIconUrl.replace(/^http:/, 'https:');
        cell1.innerHTML = "<img class=\"favicon\" src=" + favIconUrl + ">";
      }
    } else {
      cell1.innerHTML = "<img class=\"favicon\" src=\"default_favicon.png\">";
    }

    // Set the tab title
    cell2.innerHTML = "<div class=\"tab-title\">" + tab.title + "</div><div class=\"tab-timer\"></div>";
    var timer = cell2.getElementsByClassName("tab-timer")[0];
    modalTabs[key]["Timer"] = timer;

    // Set the tab pin icon
    cell3.innerHTML = "<div class=\"tab-pin\"><img title=\"Pin this tab\" src=\"tabless_pin_red.png\"><img title=\"Pin this tab\" src=\"tabless_pin_grey.png\"></div>";

    if (!pinned) {
      cell3.getElementsByTagName("img")[0].style.display = "none";
      // cell3.innerHTML = "<img src=\"tabless_pin_red.png\">";
      if (Object.keys(bg.tabs).length > bg.threshold) {
        modalTabs[key]["TimerId"] = countdown(end, timer);
      } else {
        timer.innerHTML = "Below threshold";
      }
    } else {
      cell3.getElementsByTagName("img")[1].style.display = "none";
      // cell3.innerHTML = "<img src=\"tabless_pin_grey.png\">";
      timer.innerHTML = "Pinned";
    }

    var pinContainer = cell3.getElementsByTagName("div")[0];
    modalTabs[key]["Pin"] = pinContainer;

    // Use let to get a block-scoped id that can be passed to event listener
    let tabId = key;

    pinContainer.addEventListener("click", function() {
      togglePin(tabId, bg);
    });
  }

  // Populate "Settings" tab with information from background
  durationHours = Math.floor(bg.duration / 3600000);
  durationMinutes = Math.floor((bg.duration % 3600000) / 60000);
  document.getElementById("time-limit-hours").value = durationHours;
  document.getElementById("time-limit-minutes").value = durationMinutes;
  document.getElementById("min-open-tabs").value = bg.threshold;

  // Listen to commands from the background page
  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.text == "addTab") {
      var key = msg.tabId;

      var table = document.getElementById('tabs-table');
      var row = table.insertRow(-1);
    
      var cell1 = row.insertCell(0);
      var cell2 = row.insertCell(1);
      var cell3 = row.insertCell(2);

      var tab = bg.tabs[key]["Tab"];
      modalTabs[key] = {};

      var favIconUrl = tab.favIconUrl;
      if (favIconUrl) {
        if (favIconUrl.startsWith('chrome://') || favIconUrl.startsWith('chrome-extension://')) {
          cell1.innerHTML = "<img class=\"favicon\" src=\"google.png\">";
        } else {
          // secureFavIconUrl = favIconUrl.replace(/^http:/, 'https:');
          cell1.innerHTML = "<img class=\"favicon\" src=" + favIconUrl + ">";
        }
      } else {
        cell1.innerHTML = "<img class=\"favicon\" src=\"default_favicon.png\">";
      }

      cell2.innerHTML = "<div class=\"tab-title\">" + tab.title + "</div><div class=\"tab-timer\"></div>";
      var timer = cell2.getElementsByClassName("tab-timer")[0];
      modalTabs[key]["Timer"] = timer;

      cell3.innerHTML = "<div class=\"tab-pin\"><img title=\"Pin this tab\" src=\"tabless_pin_red.png\"><img title=\"Pin this tab\" src=\"tabless_pin_grey.png\"></div>";

      cell3.getElementsByTagName("img")[0].style.display = "none";
      // cell3.innerHTML = "<img src=\"tabless_pin_red.png\">";
      if (Object.keys(bg.tabs).length > bg.threshold) {
        modalTabs[key]["TimerId"] = countdown(bg.tabs[key]["End"], timer);
      } else {
        timer.innerHTML = "Below threshold";       
      }

      var pinContainer = cell3.getElementsByTagName("div")[0];
      modalTabs[key]["Pin"] = pinContainer;

      // Use let to get a block-scoped id that can be passed to event listener
      let tabId = key;

      pinContainer.addEventListener("click", function() {
        togglePin(tabId, bg);
      });
    }

    else if (msg.text == "removeTab") {
      // Remove row
      var tabId = msg.tabId;
      var row = modalTabs[tabId]["Timer"].parentNode.parentNode;
      row.parentNode.removeChild(row);

      // Clear UI timer
      clearInterval(modalTabs[tabId]["TimerId"]);

      // Remove tabTimer entry
      delete modalTabs[tabId];
    }

    else if (msg.text == "start") {
      var tabId = msg.tabId;

      clearInterval(modalTabs[tabId]["TimerId"]);  // Clear previous timer if it exists
      modalTabs[tabId]["TimerId"] = countdown(bg.tabs[tabId]["End"], modalTabs[tabId]["Timer"]);
    }

    else if (msg.text == "startAll") {
      for (tabId in modalTabs) {
        if (!bg.tabs[tabId]["Pinned"]) {
          clearInterval(modalTabs[tabId]["TimerId"]);  // Clear previous timer if it exists
          modalTabs[tabId]["TimerId"] = countdown(bg.tabs[tabId]["End"], modalTabs[tabId]["Timer"]);
        }
      }
    }

    else if (msg.text == "stopAll") {
      for (tabId in modalTabs) {
        if (!bg.tabs[tabId]["Pinned"]) {
          clearInterval(modalTabs[tabId]["TimerId"]);
          modalTabs[tabId]["Timer"].innerHTML = "Below threshold";
        }
      }
    }
  });

  // Handle settings form submission
  document.getElementById("settings-form").addEventListener("submit", function(event) {
    event.preventDefault();

    var durationHours = document.getElementById("time-limit-hours");
    var durationMinutes = document.getElementById("time-limit-minutes")
    var durationError = document.getElementById("time-limit-error");

    if (durationHours.value == "") {
      durationHours.value = 0;
    }

    if (!isNumeric(durationHours.value)) {
      durationError.innerHTML = "Hours has to be a number";
      durationHours.focus();
      return false;
    }

    if (durationHours.value < 0) {
      durationError.innerHTML = "Hours cannot be less than 0";
      durationHours.focus();
      return false;
    }

    if (durationHours.value > 720) {
      durationError.innerHTML = "Hours cannot be greater than 720";
      durationHours.focus();
      return false;
    }

    if (durationHours.value % 1 != 0) {
      durationError.innerHTML = "Hours has to be a whole number";
      durationHours.focus();
      return false;
    }

    if (durationMinutes.value == "") {
      durationMinutes.value = 0;
    }

    if (!isNumeric(durationMinutes.value)) {
      durationError.innerHTML = "Minutes has to be a number";
      durationMinutes.focus();
      return false;
    }

    if (durationMinutes.value < 0) {
      durationError.innerHTML = "Minutes cannot be less than 0";
      durationMinutes.focus();
      return false;
    }

    if (durationMinutes.value % 1 != 0) {
      durationError.innerHTML = "Minutes has to be a whole number";
      durationMinutes.focus();
      return false;
    }

    if (durationMinutes.value > 59) {
      durationError.innerHTML = "Minutes cannot be greater than 59";
      durationMinutes.focus();
      return false;
    }

    if (durationHours.value == 0 && durationMinutes.value == 0) {
      durationError.innerHTML = "Duration has to be at least 1 minute";
      durationMinutes.focus();
      return false;
    }

    durationError.innerHTML = "";

    var threshold = document.getElementById("min-open-tabs");
    var thresholdError = document.getElementById("min-open-tabs-error");

    if (threshold.value == "") {
      thresholdError.innerHTML = "Minimum open tabs cannot be blank";
      threshold.focus();
      return false;
    }

    if (!isNumeric(threshold.value)) {
      thresholdError.innerHTML = "Minimum open tabs has to be a number";
      threshold.focus();
      return false;
    }

    if (threshold.value < 1) {
      thresholdError.innerHTML = "Minimum open tabs cannot be less than 1";
      threshold.focus();
      return false;
    }

    if (threshold.value > 100) {
      thresholdError.innerHTML = "Minimum open tabs cannot be greater than 100";
      threshold.focus();
      return false;
    }

    if (threshold.value % 1 != 0) {
      thresholdError.innerHTML = "Minimum open tabs has to be a whole number";
      threshold.focus();
      return false;
    }

    thresholdError.innerHTML = "";

    // Show submit indicator as "Saving..." and change it to "Done." in two seconds
    var submitIndicator = document.getElementsByClassName("submit-indicator")[0];
    submitIndicator.style.display = "block";
    submitIndicator.innerHTML = "Saving...";

    // Duration will be stored in minutes
    bg.duration = 3600000 * parseInt(durationHours.value) + 60000 * parseInt(durationMinutes.value);
    bg.threshold = threshold.value;

    chrome.storage.sync.set({
      "duration": bg.duration,
      "threshold": threshold.value
    }, function() {
      if (chrome.runtime.lastError) {
        // Save failure
        submitIndicator.innerHTML = "We hit a snag trying to save your settings, please try again!";
        return false;
      } else {
        // Save success
        setTimeout(function() {
          submitIndicator.innerHTML = "Saved!";
        }, 500);
      }
    });

    if (Object.keys(bg.tabs).length > bg.threshold) {
      // Update the timers of every tab
      console.log("Start autoclose in settings");
      chrome.alarms.clearAll();  // Might have to add callback in parameter
      var end = Date.now() + bg.duration;
      for (key in bg.tabs) {
        if (!bg.tabs[key]["Pinned"]) {
          bg.tabs[key]["End"] = end;
          chrome.alarms.create(key.toString(), {when: end});
          clearInterval(modalTabs[key]["TimerId"]);
          modalTabs[key]["TimerId"] = countdown(end, modalTabs[key]["Timer"]);  // Update the timers UI in the "Tabs" tab
        }
      }
    } else {
      // Stop autoclose
      console.log("Stop autoclose in settings");
      chrome.alarms.clearAll();
      for (key in bg.tabs) {
        if (!bg.tabs[key]["Pinned"]) {
          clearInterval(modalTabs[key]["TimerId"]);
          modalTabs[key]["Timer"].innerHTML = "Below threshold";  // Update the timers UI in the "Tabs" tab
        }
      }
    }
    return false;
  });

  // Listens for click event that opens the "Settings" page
  document.getElementById("settings-open-btn").firstChild.addEventListener("click", function() {
    settings = document.getElementById("settings");
    settings.style.left = "0px";
    settings.style.boxShadow = "0 0 50px rgba(0,0,0,0.3)";
  });

  // Listens for click event that closes the "Settings" page
  document.getElementById("settings-close-btn").firstChild.addEventListener("click", function() {
    settings = document.getElementById("settings");
    settings.style.left = "-300px";
    settings.style.boxShadow = "none";
  });

  // Listens for click event that closes the modal
  document.getElementById("modal-close-btn").firstChild.addEventListener("click", function() {
    chrome.tabs.getCurrent(function(tab) {
      chrome.tabs.sendMessage(tab.id, {text: "toggle"});
    });
  });

  // Listens for click event that pins all websites
  document.getElementById("pin-all").addEventListener("click", function() {
    var pins = document.getElementsByClassName('tab-pin');
    for (key in bg.tabs) {
      if (!bg.tabs[key]["Pinned"]) {
        togglePin(key);
      }
    }
  });

  // Listens for click event that unpins all websites
  document.getElementById("unpin-all").addEventListener("click", function() {
    var pins = document.getElementsByClassName('tab-pin');
    for (key in bg.tabs) {
      if (bg.tabs[key]["Pinned"]) {
        togglePin(key);
      }
    }
  });
});
