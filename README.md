Testing:

npm run test

What we use:
- sinon-chrome (https://github.com/acvetkov/sinon-chrome)
- mocha
- chai
- jsdom

- Based the tests off of this example (https://github.com/acvetkov/sinon-chrome/wiki/Usage-example)
- Gotcha: Have to mock chrome functions (using yields) before inserting scripts (background.js, modal.js) into the jsdom or else you can't test code inside callbacks
- The done keyword let's us wait for the completion of an async call in the beforeEach, afterEach, or it callbacks before progressing to the next part of the test suite
- We want to spy on functions like AddOrUpdateTab, but to do this, we have to inject backgroundFuncs.js (and modalFuncs.js) into the jsdom first, then set spies on window.addOrUpdateTab, then inject background.js and actually run the test code

- Similar to above, backgroundFuncs.js and background.js can access each other's variables and functions since they are injected into the same page. Same with modal.js and modalFuncs.js