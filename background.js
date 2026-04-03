chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'enableProxy') {
    const proxyServer = {
      scheme: "http",
      host: message.host,
      port: message.port
    };

    const config = {
      mode: "fixed_servers",
      rules: {
        // Be exhaustive to ensure all types of traffic are caught (WS, WSS, HTTP, HTTPS, FTP)
        singleProxy: proxyServer,
        proxyForHttp: proxyServer,
        proxyForHttps: proxyServer,
        proxyForFtp: proxyServer,
        fallbackProxy: proxyServer,
        // <-loopback is the magic string that tells Chrome NOT to bypass localhost/127.0.0.1
        // This is heavily required for pentesting local apps with the local proxy!
        bypassList: ["<-loopback>"]
      }
    };

    chrome.proxy.settings.set(
      { value: config, scope: 'regular' },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Proxy setting failed: ", chrome.runtime.lastError);
        } else {
          console.log(`Proxy fully enabled for all traffic at ${message.host}:${message.port}`);
        }
      }
    );
  } else if (message.action === 'disableProxy') {
    // Clearing the settings is the most graceful way to yield control
    // back to the system or other VPN extensions like ProtonVPN.
    chrome.proxy.settings.clear(
      { scope: 'regular' },
      () => {
        if (chrome.runtime.lastError) {
          console.error("Proxy clearing failed: ", chrome.runtime.lastError);
        } else {
          console.log("Proxy disabled. Control yielded.");
        }
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
