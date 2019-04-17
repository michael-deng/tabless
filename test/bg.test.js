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
            80: {
                Tab: {
                    favIconUrl: 'chrome://theme/IDR_EXTENSIONS_FAVICON@2x',
                    id: 80,
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
        };

        aboveThresholdTabs = {
            80: {
                Tab: {
                    favIconUrl: 'chrome://theme/IDR_EXTENSIONS_FAVICON@2x',
                    id: 80,
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
        };

        // Set up mocks
        chrome.storage.sync.get.yields([]);

        chrome.tabs.query.yields([
            {
                'favIconUrl': 'chrome://theme/IDR_EXTENSIONS_FAVICON@2x',
                'id': 80,
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
                    sinon.stub(window, 'unpauseAutoclose');
                    sinon.stub(window, 'stopAutoclose');
                    sinon.stub(window, 'addToClosedTabs');
                    sinon.stub(window, 'activateTab');

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
        sinon.assert.calledOnce(chrome.windows.onFocusChanged.addListener);
        sinon.assert.calledOnce(chrome.tabs.onRemoved.addListener);
        sinon.assert.calledOnce(chrome.alarms.onAlarm.addListener);
        sinon.assert.calledOnce(chrome.browserAction.onClicked.addListener);
    });

    it('should add or update a tab when onUpdated is called', function() {
        window.tabs = belowThresholdTabs;

        chrome.tabs.onUpdated.dispatch(80);

        // 2 from start-up + 1 now
        sinon.assert.calledThrice(window.addOrUpdateTab);
    });

    it('should call activateTab when onActivated is called', function() {
        window.tabs = belowThresholdTabs;

        chrome.tabs.onActivated.dispatch({tabId: 80});

        sinon.assert.calledOnce(window.activateTab);
    });

    it('should call activateTab when onFocused is called', function() {
        window.tabs = aboveThresholdTabs;

        chrome.tabs.get(80, function(tab) {
            chrome.windows.onFocusChanged.dispatch({windowId: tab.windowId});

            sinon.assert.calledOnce(window.activateTab);
        });
    });

    it('should remove tab when on onRemoved is called below threshold', function() {
        window.tabs = belowThresholdTabs;

        chrome.tabs.onRemoved.dispatch(80);

        sinon.assert.calledOnce(chrome.runtime.sendMessage);
        sinon.assert.calledOnce(chrome.alarms.clear);
        sinon.assert.notCalled(window.stopAutoclose);
        assert.equal(Object.keys(window.tabs).length, 1);
    });

    it('should disable autoclose when onRemoved is called one above threshold', function() {
        window.tabs = aboveThresholdTabs;
        
        chrome.tabs.onRemoved.dispatch(80);

        sinon.assert.calledOnce(chrome.runtime.sendMessage);
        sinon.assert.calledOnce(chrome.alarms.clear);
        sinon.assert.calledOnce(window.stopAutoclose);
        assert.equal(Object.keys(window.tabs).length, 5);
    });

    it('should not remove tab when onAlarm is called under threshold', function() {
        window.tabs = belowThresholdTabs;
        window.numTabs = 2;

        chrome.alarms.onAlarm.dispatch({name: '80'});

        sinon.assert.notCalled(chrome.tabs.remove);
        assert.equal(Object.keys(window.tabs).length, 2);
    });

    it('should remove tab when onAlarm is called above threshold', function() {
        window.tabs = aboveThresholdTabs;
        window.numTabs = 6;
        
        chrome.alarms.onAlarm.dispatch({name: '80'});

        sinon.assert.calledOnce(chrome.tabs.remove);
    });

    it('should add tab when AddOrUpdateTab is called', function() {
        window.tabs = belowThresholdTabs;

        window.addOrUpdateTab.restore();  // Restore stubbed method

        window.addOrUpdateTab(82);

        sinon.assert.calledOnce(chrome.runtime.sendMessage);
        sinon.assert.notCalled(window.startAutoclose);
        sinon.assert.notCalled(chrome.alarms.create);
        assert.equal(Object.keys(window.tabs).length, 3);
    });

    it('should update tab if it already exists when AddOrUpdateTab is called', function() {
        window.tabs = aboveThresholdTabs;

        window.addOrUpdateTab.restore();  // Restore stubbed method

        window.addOrUpdateTab(80);

        sinon.assert.calledOnce(chrome.runtime.sendMessage);
        sinon.assert.notCalled(window.startAutoclose);
        sinon.assert.notCalled(chrome.alarms.create);
        assert.equal(Object.keys(window.tabs).length, 6);
    });

    it('should call startAutoclose after AddOrUpdateTab is called 6 times', function() {
        window.tabs = belowThresholdTabs;

        window.addOrUpdateTab.restore();  // Restore stubbed method

        window.addOrUpdateTab(82);
        window.addOrUpdateTab(83);
        window.addOrUpdateTab(84);
        window.addOrUpdateTab(85);

        sinon.assert.callCount(chrome.runtime.sendMessage, 4);
        sinon.assert.calledOnce(window.startAutoclose);
    });

    it('should create alarms when startAutoclose is called', function() {
        window.tabs = belowThresholdTabs;

        window.startAutoclose.restore();

        window.startAutoclose();

        sinon.assert.calledOnce(chrome.runtime.sendMessage);
        sinon.assert.calledTwice(chrome.alarms.create);
    });

    it('should create alarms when unpauseAutoclose is called', function() {
        window.tabs = belowThresholdTabs;

        window.unpauseAutoclose.restore();

        window.unpauseAutoclose();

        sinon.assert.calledOnce(chrome.runtime.sendMessage);
        sinon.assert.calledTwice(chrome.alarms.create);
    });

    it('should stop alarms when stopAutoclose is called', function() {
        window.tabs = belowThresholdTabs;

        window.stopAutoclose.restore();

        window.stopAutoclose();

        sinon.assert.calledOnce(chrome.runtime.sendMessage);
        sinon.assert.calledOnce(chrome.alarms.clearAll);
    });

    it('should add a tab to history if addToClosedTabs is called', function() {
        window.tabs = belowThresholdTabs;

        window.addToClosedTabs.restore();

        window.addToClosedTabs(80);

        sinon.assert.calledOnce(chrome.runtime.sendMessage);
        assert.equal(Object.keys(window.closedTabs).length, 1);
    });

    it('should freeze the newly activated tab when activateTab is called', function() {
        window.tabs = belowThresholdTabs;

        window.activateTab.restore();

        window.activateTab(80);

        sinon.assert.calledOnce(chrome.alarms.clear);
        sinon.assert.calledOnce(chrome.runtime.sendMessage);
    });

    it('should freeze the newly activated tab when activateTab is called and restart the alarm for the prev active tab', function() {
        window.tabs = aboveThresholdTabs;
        window.activeTabId = 80;

        window.activateTab.restore();

        window.activateTab(81);

        sinon.assert.calledOnce(chrome.alarms.clear);
        sinon.assert.calledTwice(chrome.runtime.sendMessage);
        sinon.assert.calledOnce(chrome.alarms.create);
    });
});

