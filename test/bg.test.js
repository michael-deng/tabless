var fs = require('fs');
var sinon = require('sinon');
var chrome = require('sinon-chrome');
var assert = require('chai').assert;
var jsdom = require('jsdom/lib/old-api.js');
var vm = require('vm');

var window;
var belowThresholdTabs;
var aboveThresholdTabs;

describe('background page', function() {

  beforeEach(function(done) {

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
    chrome.storage.sync.get.yields([]);

    chrome.tabs.query.yields([
      {
        'favIconUrl': 'chrome://theme/IDR_EXTENSIONS_FAVICON@2x',
        'id': 42,
        'title': 'Extensions',
      },
      {
        'favIconUrl': 'https://www.google.ru/favicon.ico',
        'id': 81,
        'title': 'Google',
      }
    ]);

    chrome.runtime.sendMessage.yields();

    // Set up dom
    jsdom.env({
      html: '<html></html>',
      scripts: [
        'src/backgroundFuncs.js'
      ],
      created: function(errors, wnd) {
        // attach `chrome` to window
        wnd.chrome = chrome;
        wnd.console = console;
      },
      done: function(errors, wnd) {
        if (errors) {
          console.log(errors);
          done(true);
        } else {
          window = wnd;

          // Set up spies before loading background.js
          sinon.stub(window, 'addOrUpdateTab');
          sinon.stub(window, 'startAutoclose');
          sinon.stub(window, 'stopAutoclose');

          const script = new vm.Script(fs.readFileSync('src/background.js'));
          jsdom.evalVMScript(window, script);
          done();
        }
      }
    });
  });

  afterEach(function() {
    chrome.reset();
    window.close();
  });

  it('should get settings and existing tabs on start-up', function() {
    window.tabs = belowThresholdTabs;

    sinon.assert.calledOnce(chrome.storage.sync.get);
    sinon.assert.calledOnce(chrome.tabs.query);
    sinon.assert.calledTwice(window.addOrUpdateTab);
  });

  it('should attach listeners on start-up', function() {
    window.tabs = belowThresholdTabs;

    sinon.assert.calledOnce(chrome.tabs.onUpdated.addListener);
    sinon.assert.calledOnce(chrome.tabs.onReplaced.addListener);
    sinon.assert.calledOnce(chrome.tabs.onActivated.addListener);
    sinon.assert.calledOnce(chrome.tabs.onRemoved.addListener);
    sinon.assert.calledOnce(chrome.alarms.onAlarm.addListener);
    sinon.assert.calledOnce(chrome.browserAction.onClicked.addListener);
  });

  it('should add a tab and when onUpdated is called', function() {
    window.tabs = belowThresholdTabs;

    chrome.tabs.onUpdated.dispatch(42);

    // 2 from start-up + 1 now
    sinon.assert.calledThrice(window.addOrUpdateTab);
  });

  it('should not reset timer/alarm when onActivated is called below threshold ', function() {
    window.tabs = belowThresholdTabs;

    chrome.tabs.onActivated.dispatch({tabId: 42});

    sinon.assert.notCalled(chrome.alarms.create);
  });

  it('should reset timer/alarm when onActivated is called above threshold', function() {
    window.tabs = aboveThresholdTabs;

    chrome.tabs.onActivated.dispatch({tabId: 42});

    sinon.assert.calledOnce(chrome.runtime.sendMessage);
    sinon.assert.calledOnce(chrome.alarms.create);
  });

  it('should remove tab when on onRemoved is called below threshold', function() {
    window.tabs = belowThresholdTabs;

    chrome.tabs.onRemoved.dispatch(42);

    sinon.assert.calledOnce(chrome.runtime.sendMessage);
    sinon.assert.calledOnce(chrome.alarms.clear);
    sinon.assert.notCalled(window.stopAutoclose);
  });

  it('should disable autoclose when onRemoved is called one above threshold', function() {
    window.tabs = aboveThresholdTabs;
    
    chrome.tabs.onRemoved.dispatch(42);

    sinon.assert.calledOnce(chrome.runtime.sendMessage);
    sinon.assert.calledOnce(chrome.alarms.clear);
    sinon.assert.calledOnce(window.stopAutoclose);
  });

  it('should not remove tab when onAlarm is called under threshold', function() {
    window.tabs = belowThresholdTabs;
    window.numTabs = 2;

    chrome.alarms.onAlarm.dispatch({name: '42'});

    sinon.assert.notCalled(chrome.tabs.remove);
  });

  it('should remove tab when onAlarm is called above threshold', function() {
    window.tabs = aboveThresholdTabs;
    window.numTabs = 6;
    
    chrome.alarms.onAlarm.dispatch({name: '42'});

    sinon.assert.calledOnce(chrome.tabs.remove);
  });

  it('should not add duplicate tab when AddOrUpdateTab is called', function() {
    window.tabs = belowThresholdTabs;

    window.addOrUpdateTab.restore();  // Restore stubbed method

    window.addOrUpdateTab(42);

    sinon.assert.notCalled(chrome.runtime.sendMessage);
  });

  it('should add tab when AddOrUpdateTab is called', function() {
    window.tabs = belowThresholdTabs;

    window.addOrUpdateTab.restore();  // Restore stubbed method

    window.addOrUpdateTab(43);

    sinon.assert.calledOnce(chrome.runtime.sendMessage);
    sinon.assert.notCalled(window.startAutoclose);
    sinon.assert.notCalled(chrome.alarms.create);
  });

  it('should call startAutoclose after AddOrUpdateTab is called 6 times', function() {
    window.tabs = belowThresholdTabs;

    window.addOrUpdateTab.restore();  // Restore stubbed method

    window.addOrUpdateTab(43);
    window.addOrUpdateTab(44);
    window.addOrUpdateTab(45);
    window.addOrUpdateTab(46);

    sinon.assert.callCount(chrome.runtime.sendMessage, 4);
    sinon.assert.calledOnce(window.startAutoclose);
  });

  it('should create alarms when startAutoclose is called', function() {
    window.tabs = belowThresholdTabs;

    window.startAutoclose.restore();

    window.startAutoclose();

    sinon.assert.callCount(chrome.runtime.sendMessage, 2);
    sinon.assert.calledTwice(chrome.alarms.create);
  });

  it('should stop alarms when stopAutoclose is called', function() {
    window.tabs = belowThresholdTabs;

    window.stopAutoclose.restore();

    window.stopAutoclose();

    sinon.assert.callCount(chrome.runtime.sendMessage, 2);
    sinon.assert.calledOnce(chrome.alarms.clearAll);
  });
});

