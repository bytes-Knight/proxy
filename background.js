chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'enableProxy') {
    const config = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: "http",
          host: message.host,
          port: message.port
        },
        bypassList: ["<local>"]
      }
    };
    chrome.proxy.settings.set(
      { value: config, scope: 'regular' },
      () => {
        console.log(`Caido Proxy enabled: ${message.host}:${message.port}`);
      }
    );
  } else if (message.action === 'disableProxy') {
    // Clearing the settings is the most graceful way to yield control
    // back to the system or other VPN extensions like ProtonVPN.
    chrome.proxy.settings.clear(
      { scope: 'regular' },
      () => {
        console.log("Caido Proxy disabled. Control yielded.");
      }
    );
  }
});

// To be safe, ensure proxy is clear on install/startup if state says it should be off
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['proxyEnabled'], (result) => {
    if (!result.proxyEnabled) {
      chrome.proxy.settings.clear({ scope: 'regular' });
    }
  });
});
