/**
 * Add a new tab row in the UI
 *
 * @param {number} key - The id of the tab
 * @param {object} table - The UI table containing all the tabs
 */
function addTabRow(key, table) {
    console.log(key);
    console.log(bg.tabs[key]);
    var tab = bg.tabs[key]["Tab"];
    var pinned = bg.tabs[key]["Pinned"];
    var created = bg.tabs[key]["Created"];
    var end = bg.tabs[key]["End"];
    var row = table.insertRow(0);

    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);

    modalTabs[key] = {};
    modalTabs[key]["Row"] = row;

    // Set the favicon
    var favIconUrl = tab.favIconUrl;
    if (favIconUrl) {
        if (favIconUrl.startsWith('chrome://') || favIconUrl.startsWith('chrome-extension://')) {
            cell1.innerHTML = "<img class=\"favicon\" src=\"assets\/google.png\">";
        } else {
            // secureFavIconUrl = favIconUrl.replace(/^http:/, 'https:');
            cell1.innerHTML = "<img class=\"favicon\" src=" + favIconUrl + ">";
        }
    } else {
        cell1.innerHTML = "<img class=\"favicon\" src=\"assets\/default_favicon.png\">";
    }

    // Set the tab title
    cell2.innerHTML = "<div class=\"tab-title\">" + tab.title + "</div><div class=\"tab-time-elapsed\"></div><div class=\"dot\"> &middot </div><div class=\"tab-timer\"></div>";

    // Set up the redirect link on the title
    var title = cell2.getElementsByTagName("div")[0];
    title.addEventListener("click", function() {
        activateTab(key);
    });

    // Set the time elapsed
    var timeElapsed = cell2.getElementsByClassName("tab-time-elapsed")[0];
    countup(created, timeElapsed);

    // Set the timer
    var timer = cell2.getElementsByClassName("tab-timer")[0];
    modalTabs[key]["Timer"] = timer;

    // Set the tab pin icon
    cell3.innerHTML = "<div class=\"tab-pin\"><img title=\"Pin this tab\" src=\"assets\/tabless_pin_red.png\"><img title=\"Pin this tab\" src=\"assets\/tabless_pin_grey.png\"></div>";

    if (!pinned) {
        cell3.getElementsByTagName("img")[0].style.display = "none";
        // cell3.innerHTML = "<img src=\"assets\/tabless_pin_red.png\">";
        if (Object.keys(bg.tabs).length > bg.threshold) {
            modalTabs[key]["TimerId"] = countdown(end, timer);
        } else {
            timer.innerHTML = "Below threshold";
        }
    } else {
        cell3.getElementsByTagName("img")[1].style.display = "none";
        // cell3.innerHTML = "<img src=\"assets\/tabless_pin_grey.png\">";
        timer.innerHTML = "Pinned";
    }

    // Set up the pin/unpin button
    var pinContainer = cell3.getElementsByTagName("div")[0];
    modalTabs[key]["Pin"] = pinContainer;
    pinContainer.addEventListener("click", function() {
        togglePin(key);
    });
}

/**
 * Add a new history row in the UI
 *
 * @param {number} key - The id of the tab
 * @param {object} table - The UI table containing all the closed tabs
 */
function addHistoryRow(key, table) {
    var tab = bg.closedTabs[key]["Tab"];
    var row = table.insertRow(0);

    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);

    // Set the favicon
    var favIconUrl = tab.favIconUrl;
    if (favIconUrl) {
        if (favIconUrl.startsWith('chrome://') || favIconUrl.startsWith('chrome-extension://')) {
            cell1.innerHTML = "<img class=\"favicon\" src=\"assets\/google.png\">";
        } else {
            // secureFavIconUrl = favIconUrl.replace(/^http:/, 'https:');
            cell1.innerHTML = "<img class=\"favicon\" src=" + favIconUrl + ">";
        }
    } else {
        cell1.innerHTML = "<img class=\"favicon\" src=\"assets\/default_favicon.png\">";
    }

    cell2.innerHTML = "<div class=\"history-title\">" + tab.title + "</div><div class=\"history-time-closed\"></div>";

    var timer = cell2.getElementsByClassName("history-time-closed")[0];
    countup(bg.closedTabs[key]["Closed"], timer);

    // Set up the redirect link on the title
    var title = cell2.getElementsByTagName("div")[0];
    title.addEventListener("click", function() {
        chrome.tabs.create({url: tab.url});
    });
}


/**
 * Activate a tab
 *
 * @param {number} tabId - The Id of the tab we're activating
 */
 function activateTab(tabId) {

    // Close the tabs modal
    chrome.tabs.getCurrent(function(tab) {
        chrome.tabs.sendMessage(tab.id, {text: "toggle"});
    });

    // Switch to the new tab's window
    chrome.tabs.get(parseInt(tabId), function(tab) {
        chrome.windows.update(tab.windowId, {focused: true});
    });

    // Switch to the new tab
    chrome.tabs.update(parseInt(tabId), {active: true});
 }

/**
 * Pin or unpin a tab
 *
 * @param {number} tabId - The Id of the tab we're pinning/unpinning
 */
function togglePin(tabId) {
    var timer = modalTabs[tabId]["Timer"];
    var pinContainer = modalTabs[tabId]["Pin"];

    if (bg.tabs[tabId]["Pinned"] == true) {
        // Unpin the tab
        console.log("unpinning tab");
        pinContainer.children[0].style.display = "none";
        pinContainer.children[1].style.display = "initial";
        bg.tabs[tabId]["Pinned"] = false;
        if (Object.keys(bg.tabs).length > bg.threshold) { 
            bg.tabs[tabId]["End"] = Date.now() + bg.duration;
            chrome.alarms.create(tabId.toString(), {when: bg.tabs[tabId]["End"]});
            modalTabs[tabId]["TimerId"] = countdown(bg.tabs[tabId]["End"], timer);
        } else {
            timer.innerHTML = "Below threshold";
        }
    } else {
        // Pin the tab
        console.log("pinning tab");
        pinContainer.children[0].style.display = "initial";
        pinContainer.children[1].style.display = "none";
        bg.tabs[tabId]["Pinned"] = true;
        chrome.alarms.clear(tabId.toString());
        clearInterval(modalTabs[tabId]["TimerId"]);
        timer.innerHTML = "Pinned";
    }
}

/**
 * Make element a countdown
 *
 * @param {number} end - UTC time of when the tab should be closed
 * @param {object} element - The HTML element that will contain the countdown
 * @returns {number} The timer's Id, which can be called on by clearInterval()
 * to stop the timer
 */
function countdown(end, element) {

    setCountdownTimer(end, element);

    // Update the countdown every 1 second
    var x = setInterval(function() {
        setCountdownTimer(end, element);
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
function setCountdownTimer(countDownDate, element) {
    var distance = countDownDate - Date.now();

    // Time calculations for days, hours, minutes and seconds
    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Display the result in the element with id="demo"
    element.innerHTML = days + "d " + hours + "h " + minutes + "m " + seconds + "s ";

    // if (distance < 60000) {
    //   element.innerHTML = "Less than a minute left";
    // } 

    // If the countdown is finished, write some text 
    if (distance < 5000) {
        clearInterval(this);
        element.innerHTML = "A few seconds left";
    }
}

/**
 * Make element a countup
 *
 * @param {number} start - UTC time of when the tab was closed
 * @param {object} element - The HTML element that will contain the countup
 * @returns {number} The timer's Id
 */
function countup(start, element) {

    setCountupTimer(start, element);

    // Update the countup every 1 second
    var x = setInterval(function() {
        setCountupTimer(start, element);
    }, 1000);

    return x;
}

/**
 * A helper function called every second by countup() that makes element
 * a countup from start
 *
 * @param {number} start - When the tab was first closed
 * @param {object} element - The HTML element that contains the countup
 */
function setCountupTimer(start, element) {
    var distance = Date.now() - start;

    // Time calculations for days, hours, minutes and seconds
    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (days == 0 && hours == 0 && minutes == 0) {
        element.innerHTML = "<1m ago";
    } else if (days == 0 && hours == 0) {
        element.innerHTML = minutes + "m ago";
    } else if (days == 0) {
        element.innerHTML = hours + "h ago";
    } else {
        element.innerHTML = days + "d ago";
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
