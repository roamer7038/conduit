import './style.css';

export default defineContentScript({
  matches: ['*://*/*'],
  main() {
    // Content script is intentionally minimal.
    // Page interaction is handled via chrome.scripting.executeScript from the background script.
  }
});
