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
