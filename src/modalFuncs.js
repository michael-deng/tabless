/**
 * Open or close Tabless
 */
function toggleOpen() {
    console.log("toggleOpen called with initial bg.open set to " + bg.open);
    var power = document.getElementById("power-btn").firstChild;

    if (bg.open) {
        chrome.storage.sync.set({
            "open": false,
        }, function() {
            if (chrome.runtime.lastError) {
                // Save failure
                // submitIndicator.innerHTML = "We hit a snag trying to save your settings, please try again!";
                return false;
            } else {
                bg.open = false;
                power.style.color = "#888888";
                chrome.alarms.clearAll();
                for (tabId in bg.tabs) {
                    clearInterval(modalTabs[tabId]["TimerId"]);
                    modalTabs[tabId]["Timer"].innerHTML = "Powered off";
                }
            }
        });
    } else {
        chrome.storage.sync.set({
            "open": true,
        }, function() {
            if (chrome.runtime.lastError) {
                // Save failure
                // submitIndicator.innerHTML = "We hit a snag trying to save your settings, please try again!";
                return false;
            } else {
                bg.open = true;
                power.style.color = "#E71D36";
                if (Object.keys(bg.tabs).length > bg.threshold) {
                    var end = Date.now() + bg.duration;
                    for (tabId in bg.tabs) {
                        bg.tabs[tabId]["End"] = end;
                        chrome.alarms.create(tabId.toString(), {when: end});
                        modalTabs[tabId]["TimerId"] = countdown(end, modalTabs[tabId]["Timer"]);
                    }
                } else {
                    for (tabId in bg.tabs) {
                        modalTabs[tabId]["Timer"].innerHTML = "Below threshold";
                    }
                }
            }
        });
    }
}

/**
 * Pin or unpin a tab
 *
 * @param {number} tabId - The Id of the tab we're pinning/unpinning
 */
function togglePin(tabId) {
    var timer = modalTabs[tabId]["Timer"];
    var pinContainer = modalTabs[tabId]["Pin"];

    if (bg.open) {
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
}

/**
 * Pin all tabs
 */
 function pinAll() {
    for (key in bg.tabs) {
        if (!bg.tabs[key]["Pinned"]) {
            togglePin(key);
        }
    }
}

 /**
 * Unpin all tabs
 */
 function unpinAll() {
    for (key in bg.tabs) {
        if (bg.tabs[key]["Pinned"]) {
            togglePin(key);
        }
    }
 }

/**
 * Make element a countdown to end
 *
 * @param {number} end - UTC time of when the tab should be closed
 * @param {object} element - The HTML element that will contain the countdown
 * @returns {number} The timer's Id, which can be called on by clearInterval()
 * to stop the timer
 */
function countdown(end, element) {

    setTimer(end, element);

    // Update the count down every 1 second
    var x = setInterval(function() {

        setTimer(end, element);

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
    element.innerHTML = days + "d " + hours + "h " + minutes + "m " + seconds + "s ";

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
