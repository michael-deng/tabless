chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {

  // Receive request to toggle modal
  if (msg.text === "toggle") {

  	// Respond that content script is running
  	sendResponse({text: "ok"});

  	var iframe = document.getElementById("tabless-extension-modal"); // Get the modal, it might not exist yet

  	// modal exists
  	if (iframe) {
			$(iframe).fadeOut(300, function() {
				$(this).remove();
			});
  	}
  	// modal doesn't exist yet
  	else {
  		iframe = document.createElement('iframe');
			iframe.src = chrome.runtime.getURL("modal.html");
			iframe.frameBorder = 0;
			iframe.id = "tabless-extension-modal";
			$(iframe).hide().appendTo("body").fadeIn(300);
  	}
  }
});
