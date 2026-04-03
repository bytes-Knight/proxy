function normalizeProxyInput(message) {
  const host = (message.host || '127.0.0.1').toString().trim() || '127.0.0.1';
  const parsedPort = Number.parseInt(message.port, 10);
  const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 8080;

  return { host, port };
}

function clearProxy() {
  chrome.proxy.settings.clear({ scope: 'regular' }, () => {
    if (chrome.runtime.lastError) {
      console.error('Proxy clearing failed:', chrome.runtime.lastError.message);
      return;
    }

    console.log('Proxy disabled. Control yielded.');
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'enableProxy') {
    const { host, port } = normalizeProxyInput(message);

    const proxyServer = {
      scheme: 'http',
      host,
      port
    };

    const config = {
      mode: 'fixed_servers',
      rules: {
        singleProxy: proxyServer,
        bypassList: ['<-loopback>']
      }
    };

    chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
      if (chrome.runtime.lastError) {
        console.error('Proxy setting failed:', chrome.runtime.lastError.message);
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      console.log(`Proxy enabled at ${host}:${port}`);
      sendResponse({ ok: true });
    });

    return true;
  }

  if (message.action === 'disableProxy') {
    chrome.proxy.settings.clear({ scope: 'regular' }, () => {
      if (chrome.runtime.lastError) {
        console.error('Proxy clearing failed:', chrome.runtime.lastError.message);
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      console.log('Proxy disabled. Control yielded.');
      sendResponse({ ok: true });
    });

    return true;
  }

  return false;
});

function clearProxyIfDisabled() {
  chrome.storage.local.get(['proxyEnabled'], (result) => {
    if (!result.proxyEnabled) {
      clearProxy();
    }
  });
}

chrome.runtime.onStartup.addListener(clearProxyIfDisabled);
chrome.runtime.onInstalled.addListener(clearProxyIfDisabled);