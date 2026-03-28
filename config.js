const APP_CONFIG = Object.freeze({
  dataMode: window.BPAD_APP_CONFIG?.dataMode || "local",
  apiBaseUrl: window.BPAD_APP_CONFIG?.apiBaseUrl || "/api",
});
