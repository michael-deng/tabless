 // Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* TODO
1. Clean up code, use DRY
2. Consider pulling Timer and TimerId out of bg.tabs since they're specific to popup.js
3. Think about how Timer and TimerId might break in different use cases
4. Handle alarm in background.js
5. Create timer
*/

/* FIX BUG
Facebook bugs out when I open it in a new tab and try to lock it
*/

chrome.runtime.getBackgroundPage(function(bg) {
  // Do what you want with the page
  var table = document.getElementById('tabs-table');
  // .textContent = bg.text;
  for (key in bg.tabs) {
    var tab = bg.tabs[key]["Tab"];
    var date = bg.tabs[key]["Date"];
    var locked = bg.tabs[key]["Locked"];
    var row = table.insertRow(-1);
    
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);

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
    bg.tabs[key]["Timer"] = timer;

    // cell3.innerHTML = "<div class=\"switch\"><input type=\"checkbox\"><label><span class=\"fontawesome-ok\"></span><span class=\"fontawesome-remove\"></span><div></div></label></div>"
    // var checkbox = cell3.getElementsByTagName("input")[0];

    // // Set lock toggle's initial state
    // if (!locked) {
    //   checkbox.checked = true;
    //   bg.tabs[key]["TimerId"] = countdown(date, timer, bg.timeLimit);
    // } else {
    //   timer.innerHTML = "Locked";
    // }

    // // Use let to get a block-scoped id that can be passed to event listener
    // let tabId = key;

    // checkbox.addEventListener("change", function() {
    //   toggleLock(tabId);
    // });

    cell3.innerHTML = "<div class=\"tab-pin\"><img title=\"Pin a tab\" src=\"tabless_pin_red.png\"><img title=\"Pin a tab\" src=\"tabless_pin_grey.png\"></div>";
    if (!locked) {
      cell3.getElementsByTagName("img")[0].style.display = "none";
      // cell3.innerHTML = "<img src=\"tabless_pin_red.png\">";
      bg.tabs[key]["TimerId"] = countdown(date, timer, bg.timeLimit);
    } else {
      cell3.getElementsByTagName("img")[1].style.display = "none";
      // cell3.innerHTML = "<img src=\"tabless_pin_grey.png\">";
      timer.innerHTML = "Pinned";
    }

    var pinContainer = cell3.getElementsByTagName("div")[0];

    // Use let to get a block-scoped id that can be passed to event listener
    let tabId = key;

    pinContainer.addEventListener("click", function() {
      togglePin(this, tabId);
    });
  }

  function togglePin(pinContainer, tabId) {
    var timer = bg.tabs[tabId]["Timer"];

    if (bg.tabs[tabId]["Locked"] == true) {
      // this.src = "tabless_pin_red.png"
      pinContainer.children[0].style.display = "none";
      pinContainer.children[1].style.display = "initial";
      bg.tabs[tabId]["Locked"] = false;
      chrome.alarms.create(tabId.toString(), {delayInMinutes: bg.timeLimit});
      bg.tabs[tabId]["Date"] = Date.now();
      bg.tabs[tabId]["TimerId"] = countdown(Date.now(), timer, bg.timeLimit);
    } else {
      // this.src = "tabless_pin_grey.png"
      pinContainer.children[0].style.display = "initial";
      pinContainer.children[1].style.display = "none";
      bg.tabs[tabId]["Locked"] = true;
      chrome.alarms.clear(tabId.toString());
      clearInterval(bg.tabs[tabId]["TimerId"]);
      timer.innerHTML = "Pinned";
    }
  }

  // Populate "Settings" tab with information from storage
  chrome.storage.sync.get(["timeLimit", "minOpenTabs"], function(settings) {
    var timeLimit = settings["timeLimit"];
    timeLimitHours = Math.floor(timeLimit/60);
    timeLimitMinutes = timeLimit % 60;
    minOpenTabs = settings["minOpenTabs"];

    document.getElementById("time-limit-hours").value = timeLimitHours;
    document.getElementById("time-limit-minutes").value = timeLimitMinutes;
    document.getElementById("min-open-tabs").value = minOpenTabs;
  });

  // Handle settings form submission
  document.getElementById("settings-form").addEventListener("submit", function(event) {
    event.preventDefault();

    var timeLimitHours = document.getElementById("time-limit-hours");
    var timeLimitMinutes = document.getElementById("time-limit-minutes")
    var timeLimitError = document.getElementById("time-limit-error");

    if (timeLimitHours.value == "") {
      timeLimitHours.value = 0;
    }

    if (!isNumeric(timeLimitHours.value)) {
      timeLimitError.innerHTML = "Hours has to be a number";
      timeLimitHours.focus();
      return false;
    }

    if (timeLimitHours.value < 0) {
      timeLimitError.innerHTML = "Hours cannot be less than 0";
      timeLimitHours.focus();
      return false;
    }

    if (timeLimitHours.value > 720) {
      timeLimitError.innerHTML = "Hours cannot be greater than 720";
      timeLimitHours.focus();
      return false;
    }

    if (timeLimitHours.value % 1 != 0) {
      timeLimitError.innerHTML = "Hours has to be a whole number";
      timeLimitHours.focus();
      return false;
    }

    if (timeLimitMinutes.value == "") {
      timeLimitMinutes.value = 0;
    }

    if (!isNumeric(timeLimitMinutes.value)) {
      timeLimitError.innerHTML = "Minutes has to be a number";
      timeLimitMinutes.focus();
      return false;
    }

    if (timeLimitMinutes.value < 0) {
      timeLimitError.innerHTML = "Minutes cannot be less than 0";
      timeLimitMinutes.focus();
      return false;
    }

    if (timeLimitMinutes.value % 1 != 0) {
      timeLimitError.innerHTML = "Minutes has to be a whole number";
      timeLimitMinutes.focus();
      return false;
    }

    if (timeLimitMinutes.value > 59) {
      timeLimitError.innerHTML = "Minutes cannot be greater than 59";
      timeLimitMinutes.focus();
      return false;
    }

    if (timeLimitHours.value == 0 && timeLimitMinutes.value == 0) {
      timeLimitError.innerHTML = "Time limit has to be at least 1 minute";
      timeLimitMinutes.focus();
      return false;
    }

    timeLimitError.innerHTML = "";

    var minOpenTabs = document.getElementById("min-open-tabs");
    var minOpenTabsError = document.getElementById("min-open-tabs-error");

    if (minOpenTabs.value == "") {
      minOpenTabsError.innerHTML = "Minimum open tabs cannot be blank";
      minOpenTabs.focus();
      return false;
    }

    if (!isNumeric(minOpenTabs.value)) {
      minOpenTabsError.innerHTML = "Minimum open tabs has to be a number";
      minOpenTabs.focus();
      return false;
    }

    if (minOpenTabs.value < 1) {
      minOpenTabsError.innerHTML = "Minimum open tabs cannot be less than 1";
      minOpenTabs.focus();
      return false;
    }

    if (minOpenTabs.value > 100) {
      minOpenTabsError.innerHTML = "Minimum open tabs cannot be greater than 100";
      minOpenTabs.focus();
      return false;
    }

    if (minOpenTabs.value % 1 != 0) {
      minOpenTabsError.innerHTML = "Minimum open tabs has to be a whole number";
      minOpenTabs.focus();
      return false;
    }

    minOpenTabsError.innerHTML = "";

    // Time limit will be stored in minutes
    var timeLimit = 60 * parseInt(timeLimitHours.value) + parseInt(timeLimitMinutes.value);
    bg.timeLimit = timeLimit;

    chrome.storage.sync.set({
      "timeLimit": timeLimit,
      "minOpenTabs": minOpenTabs.value
    });
 
    // Update the timers of every tab
    chrome.alarms.clearAll();  // Might have to add callback in parameter
    var date = Date.now();

    for (key in bg.tabs) {
      if (!bg.tabs[key]["Locked"]) {
        bg.tabs[key]["Date"] = date;
        chrome.alarms.create(key.toString(), {delayInMinutes: timeLimit});
        clearInterval(bg.tabs[key]["TimerId"]);
        var timer = bg.tabs[key]["Timer"];
        bg.tabs[key]["TimerId"] = countdown(date, timer, timeLimit);  // Update the timers UI in the "Tabs" tab
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

  /**
   * Changes view to "Tabs" or "Settings" page
   *
   * @param {object} event - The button clicked on to change page
   * @param {string} tabName - "Tabs" or "Settings"
   */
  function openTab(event, tabName) {
    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].className = tabcontent[i].className.replace(" active", "");
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).className += " active"
    event.currentTarget.className += " active";
  }

  /**
   * Lock or unlock a tab
   *
   * @param {number} tabId - The Id of the tab we're locking/unlocking
   */
  function toggleLock(tabId) {
    var timer = bg.tabs[tabId]["Timer"];

    if (bg.tabs[tabId]["Locked"] == true) {
      bg.tabs[tabId]["Locked"] = false;
      chrome.alarms.create(tabId.toString(), {delayInMinutes: bg.timeLimit});
      bg.tabs[tabId]["Date"] = Date.now();
      bg.tabs[tabId]["TimerId"] = countdown(Date.now(), timer, bg.timeLimit);
    } else {
      bg.tabs[tabId]["Locked"] = true;
      chrome.alarms.clear(tabId.toString());
      clearInterval(bg.tabs[tabId]["TimerId"]);
      timer.innerHTML = "Locked";
    }
  }

  /**
   * Make element a countdown to date + timeLimit
   *
   * @param {number} date - When the tab was created or last opened
   * @param {object} element - The HTML element that will contain the countdown
   * @params {number} timeLimit - How long to store tab for
   * @returns {number} The timer's Id, which can be called on by clearInterval()
   * to stop the timer
   */
  function countdown(date, element, timeLimit) {
    // Set the date we're counting down to
    var countDownDate = date + timeLimit * 60000;

    setTimer(countDownDate, element);

    // Update the count down every 1 second
    var x = setInterval(function() {

      setTimer(countDownDate, element);

    }, 1000);
    return x;
  }

  /**
   * A helper function called every second by countdown() that makes element
   * a countdown to countDownDate and stops countdown when there's 5s left
   *
   * @param {number} countDownDate - When the tab will be closed
   * @param {object} element - The HTML element that contains the countdown
   */
  function setTimer(countDownDate, element) {
    // Find the distance between now an the count down date
    var currentDate = Date.now()
    var distance = countDownDate - currentDate;

    // Time calculations for days, hours, minutes and seconds
    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Display the result in the element with id="demo"
    element.innerHTML = days + "d " + hours + "h "
    + minutes + "m " + seconds + "s ";

    // if (distance < 60000) {
    //   element.innerHTML = "Less than a minute left";
    // } 
    
    // If the count down is finished, write some text 
    if (distance < 5000) {
      clearInterval(this);
      element.innerHTML = "A few seconds left";
    }
  }

  /**
   * Check if a string is a number
   *
   * @param {string} n - A string
   * @returns {boolean} Whether or not n is a number
   */
  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
});


  




/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var url = tab.url;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof url == 'string', 'tab.url should be a string');

    callback(url);
  });

  // Most methods of the Chrome extension APIs are asynchronous. This means that
  // you CANNOT do something like this:
  //
  // var url;
  // chrome.tabs.query(queryInfo, function(tabs) {
  //   url = tabs[0].url;
  // });
  // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

/**
 * @param {string} searchTerm - Search term for Google Image search.
 * @param {function(string,number,number)} callback - Called when an image has
 *   been found. The callback gets the URL, width and height of the image.
 * @param {function(string)} errorCallback - Called when the image is not found.
 *   The callback gets a string that describes the failure reason.
 */
function getImageUrl(searchTerm, callback, errorCallback) {
  // Google image search - 100 searches per day.
  // https://developers.google.com/image-search/
  var searchUrl = 'https://ajax.googleapis.com/ajax/services/search/images' +
    '?v=1.0&q=' + encodeURIComponent(searchTerm);
  var x = new XMLHttpRequest();
  x.open('GET', searchUrl);
  // The Google image search API responds with JSON, so let Chrome parse it.
  x.responseType = 'json';
  x.onload = function() {
    // Parse and process the response from Google Image Search.
    var response = x.response;
    if (!response || !response.responseData || !response.responseData.results ||
        response.responseData.results.length === 0) {
      errorCallback('No response from Google Image search!');
      return;
    }
    var firstResult = response.responseData.results[0];
    // Take the thumbnail instead of the full image to get an approximately
    // consistent image size.
    var imageUrl = firstResult.tbUrl;
    var width = parseInt(firstResult.tbWidth);
    var height = parseInt(firstResult.tbHeight);
    console.assert(
        typeof imageUrl == 'string' && !isNaN(width) && !isNaN(height),
        'Unexpected respose from the Google Image Search API!');
    callback(imageUrl, width, height);
  };
  x.onerror = function() {
    errorCallback('Network error.');
  };
  x.send();
}

