var fs = require('fs');
var sinon = require('sinon');
var chrome = require('sinon-chrome');
var assert = require('chai').assert;
var jsdom = require('jsdom/lib/old-api.js');
var vm = require('vm');

var window;
var belowThresholdTabs;
var aboveThresholdTabs;

describe('modal page with less than threshold tabs', function () {
  
  beforeEach(function (done) {

    // Set up tabs
    belowThresholdTabs = { 
      42: { 
        Tab: { 
          favIconUrl: 'chrome://theme/IDR_EXTENSIONS_FAVICON@2x',
          id: 42,
          title: 'Extensions' 
        },
        Pinned: false 
      },
      81: { 
        Tab: { 
          favIconUrl: 'https://www.google.ru/favicon.ico',
          id: 81,
          title: 'Google' 
        },
        Pinned: false 
      }
    }

    // Set up mocks
    chrome.runtime.getBackgroundPage.yields({
      tabs: belowThresholdTabs,
      timeLimit: '5',
      threshold: '5'
    });

    chrome.tabs.getCurrent.yields({
      id: '42'
    });

    // chrome.storage.sync.get.yields({});

    // Set up dom
    jsdom.env({
      html: fs.readFileSync('src/modal.html'),
      scripts: [
        'src/modalFuncs.js'
      ],
      created: function (errors, wnd) {
        // attach `chrome` to window
        wnd.chrome = chrome;
        wnd.console = console;
      },
      done: function (errors, wnd) {
        if (errors) {
          console.log(errors);
          done(true);
        } else {
          window = wnd;

          // Set up spies before loading modal.js
          sinon.stub(window, 'togglePin');
          sinon.stub(window, 'countdown');
          sinon.stub(window, 'setTimer');
          sinon.stub(window, 'isNumeric');
          sinon.stub(window, 'clearInterval');

          const script = new vm.Script(fs.readFileSync('src/modal.js'));
          jsdom.evalVMScript(window, script);
          done();
        }
      }
    });
  });

  afterEach(function () {
    chrome.reset();
    window.close();
  });

  it('should get background page and create table on start-up', function () {
    sinon.assert.calledOnce(chrome.runtime.getBackgroundPage);
    sinon.assert.notCalled(window.countdown);
    assert.equal(window.document.getElementById('tabs-table').rows.length, 2);
  });

  it('should handle addTab command', function () {
    window.bg.tabs['80'] = { 
      Tab: { 
        favIconUrl: 'https://www.google.ru/favicon.ico',
        id: 80,
        title: 'Google'
      },
      Pinned: false 
    };

    chrome.runtime.onMessage.dispatch({text: 'addTab', tabId: '80'}, null, null);

    assert.equal(window.document.getElementById('tabs-table').rows.length, 3);
  });

  it('should handle removeTab command', function () {
    chrome.runtime.onMessage.dispatch({text: 'removeTab', tabId: '81'}, null, null);

    sinon.assert.calledOnce(window.clearInterval);
    assert.equal(window.document.getElementById('tabs-table').rows.length, 1);
    assert.equal(Object.keys(window.modalTabs).length, 1);
  });

  it('should handle start command', function () {
    chrome.runtime.onMessage.dispatch({text: 'start', tabId: '81'}, null, null);

    sinon.assert.calledOnce(window.clearInterval);
    sinon.assert.calledOnce(window.countdown);
  });

  it('should handle stop command', function () {
    chrome.runtime.onMessage.dispatch({text: 'stop', tabId: '81'}, null, null);

    sinon.assert.calledOnce(window.clearInterval);
  });

  it('should save settings', function () {
    window.isNumeric.restore();

    window.document.getElementById('settings-form').dispatchEvent(new window.Event('submit'));

    sinon.assert.calledOnce(chrome.storage.sync.set);
    sinon.assert.calledOnce(chrome.alarms.clearAll);
    sinon.assert.calledTwice(window.clearInterval);
  });

  it('should close modal when X is pressed', function () {

    window.document.getElementById('modal-close-btn').firstChild.dispatchEvent(new window.Event('click'));

    sinon.assert.calledOnce(chrome.tabs.getCurrent);
    sinon.assert.calledOnce(chrome.tabs.sendMessage);
  });

  it('should clear alarm and timer if unpinned when togglePin is called', function () {
    window.togglePin.restore();

    window.togglePin(42);

    sinon.assert.calledOnce(chrome.alarms.clear);
    sinon.assert.calledOnce(window.clearInterval);
  });

  it('should do nothing if pinned when togglePin is called', function () {
    window.togglePin.restore();

    window.bg.tabs[42]['Pinned'] = true;

    window.togglePin(42);

    sinon.assert.notCalled(chrome.alarms.create);
    sinon.assert.notCalled(window.countdown);
  });
});

describe('modal page with more than threshold tabs', function () {
  
  beforeEach(function (done) {

    aboveThresholdTabs = {
      42: { 
        Tab: { 
          favIconUrl: 'chrome://theme/IDR_EXTENSIONS_FAVICON@2x',
          id: 42,
          title: 'Extensions' 
        },
        Pinned: false 
      },
      81: { 
        Tab: { 
          favIconUrl: 'https://www.google.ru/favicon.ico',
          id: 81,
          title: 'Google' 
        },
        Pinned: false 
      },
      82: { 
        Tab: { 
          favIconUrl: 'https://www.google.ru/favicon.ico',
          id: 82,
          title: 'Google' 
        },
        Pinned: false 
      },
      83: { 
        Tab: { 
          favIconUrl: 'https://www.google.ru/favicon.ico',
          id: 83,
          title: 'Google' 
        },
        Pinned: false 
      },
      84: { 
        Tab: { 
          favIconUrl: 'https://www.google.ru/favicon.ico',
          id: 84,
          title: 'Google' 
        },
        Pinned: false 
      },
      85: { 
        Tab: { 
          favIconUrl: 'https://www.google.ru/favicon.ico',
          id: 85,
          title: 'Google' 
        },
        Pinned: false 
      }
    }

    // Set up mocks
    chrome.runtime.getBackgroundPage.yields({
      tabs: aboveThresholdTabs,
      timeLimit: '5',
      threshold: '5'
    });

    chrome.tabs.getCurrent.yields({
      id: '42'
    });

    // chrome.storage.sync.get.yields({});

    // Set up dom
    jsdom.env({
      html: fs.readFileSync('src/modal.html'),
      scripts: [
        'src/modalFuncs.js'
      ],
      created: function (errors, wnd) {
        // attach `chrome` to window
        wnd.chrome = chrome;
        wnd.console = console;
      },
      done: function (errors, wnd) {
        if (errors) {
          console.log(errors);
          done(true);
        } else {
          window = wnd;

          // Set up spies before loading modal.js
          sinon.stub(window, 'togglePin');
          sinon.stub(window, 'countdown');
          sinon.stub(window, 'setTimer');
          sinon.stub(window, 'isNumeric');
          sinon.stub(window, 'clearInterval');

          const script = new vm.Script(fs.readFileSync('src/modal.js'));
          jsdom.evalVMScript(window, script);
          done();
        }
      }
    });
  });

  afterEach(function () {
    chrome.reset();
    window.close();
  });

  it('should get background page and create table on start-up', function () {
    sinon.assert.calledOnce(chrome.runtime.getBackgroundPage);
    sinon.assert.callCount(window.countdown, 6);
    assert.equal(window.document.getElementById('tabs-table').rows.length, 6);
  });

  it('should handle addTab command', function () {
    window.bg.tabs['80'] = { 
      Tab: { 
        favIconUrl: 'https://www.google.ru/favicon.ico',
        id: 80,
        title: 'Google'
      },
      Pinned: false 
    };

    chrome.runtime.onMessage.dispatch({text: 'addTab', tabId: '80'}, null, null);
    sinon.assert.callCount(window.countdown, 7);
    assert.equal(window.document.getElementById('tabs-table').rows.length, 7);
  });

  it('should save settings', function () {
    window.isNumeric.restore();

    window.document.getElementById('settings-form').dispatchEvent(new window.Event('submit'));

    sinon.assert.callCount(chrome.alarms.create, 6);
    sinon.assert.callCount(window.clearInterval, 6);

    // 6 from start-up + 6 now
    sinon.assert.callCount(window.countdown, 12);
  });

  it('should clear alarm and timer if unpinned when togglePin is called', function () {
    window.togglePin.restore();

    window.togglePin(42);

    sinon.assert.calledOnce(chrome.alarms.clear);
    sinon.assert.calledOnce(window.clearInterval);
  });

  it('should do nothing if pinned when togglePin is called', function () {
    window.togglePin.restore();

    window.bg.tabs[42]['Pinned'] = true;

    window.togglePin(42);

    sinon.assert.calledOnce(chrome.alarms.create);

    // 6 from start-up + 1 now
    sinon.assert.callCount(window.countdown, 7);
  });

  it('should pin all tabs when the pin-all button is clicked', function() {
    window.document.getElementById('pin-all').dispatchEvent(new window.Event('click'));

    sinon.assert.callCount(window.togglePin, 6);
  });

  it('should unpin all tabs when the unpin-all button is clicked', function() {
    window.bg.tabs[42]['Pinned'] = true;
    window.bg.tabs[81]['Pinned'] = true;
    window.bg.tabs[82]['Pinned'] = true;
    window.bg.tabs[83]['Pinned'] = true;
    window.bg.tabs[84]['Pinned'] = true;
    window.bg.tabs[85]['Pinned'] = true;

    window.document.getElementById('unpin-all').dispatchEvent(new window.Event('click'));

    sinon.assert.callCount(window.togglePin, 6);
  });
});
