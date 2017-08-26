chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {

  // Receive request to toggle modal
  if (msg.text === "toggle") {

    // Respond that content script is running
    sendResponse({text: "ok"});

    var modal = document.getElementById("tabless-extension-modal"); // Get the modal, it might not exist yet

    // modal exists
    if (modal) {
      $(modal).fadeOut(300, function() {
        $(this).remove();
      });
    }
    // modal doesn't exist yet
    else {
      modal = document.createElement('div');
      modal.id = "tabless-extension-modal";
      var iframe = document.createElement('iframe');
      iframe.src = chrome.runtime.getURL("modal.html");
      iframe.frameBorder = 0;
      $(modal).append(iframe);
      $(modal).hide().appendTo("body").fadeIn(300);
    }
  }
});