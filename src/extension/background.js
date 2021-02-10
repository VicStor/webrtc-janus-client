console.log('Hello from BACKGROUND');

chrome.tabs.onActivated.addListener((tab) => {
  console.log('onActovated ', tab);
});

chrome.tabs.executeScript(null, { file: './foreground.js' }, () => {
  console.log('foreground script injected');
});
