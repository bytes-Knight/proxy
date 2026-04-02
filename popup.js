document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('proxy-toggle');
  const statusText = document.getElementById('status-text');
  const indicator = document.querySelector('.status-indicator');
  const hostInput = document.getElementById('host');
  const portInput = document.getElementById('port');
  const saveBtn = document.getElementById('save-btn');

  // Load saved settings
  chrome.storage.local.get(['host', 'port', 'proxyEnabled'], (result) => {
    if (result.host) hostInput.value = result.host;
    if (result.port) portInput.value = result.port;
    if (result.proxyEnabled) {
      toggle.checked = true;
      updateUI(true);
    }
  });

  // Toggle Proxy
  toggle.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    const host = hostInput.value.trim() || '127.0.0.1';
    const port = parseInt(portInput.value, 10) || 8080;

    updateUI(isEnabled);

    // Tell the background script to change settings
    chrome.runtime.sendMessage({
      action: isEnabled ? 'enableProxy' : 'disableProxy',
      host: host,
      port: port
    });

    // Save state
    chrome.storage.local.set({ proxyEnabled: isEnabled, host: host, port: port });
  });

  // Save Settings directly
  saveBtn.addEventListener('click', () => {
    const host = hostInput.value.trim() || '127.0.0.1';
    const port = parseInt(portInput.value, 10) || 8080;

    chrome.storage.local.set({ host: host, port: port }, () => {
      saveBtn.innerText = 'Saved!';
      setTimeout(() => {
        saveBtn.innerText = 'Save Configuration';
      }, 1500);

      // If already enabled, restart the proxy with new settings
      if (toggle.checked) {
        chrome.runtime.sendMessage({
          action: 'enableProxy',
          host: host,
          port: port
        });
      }
    });
  });

  function updateUI(isEnabled) {
    if (isEnabled) {
      statusText.innerText = 'PROXY ON';
      statusText.classList.add('active');
      indicator.classList.add('active');
    } else {
      statusText.innerText = 'OFF';
      statusText.classList.remove('active');
      indicator.classList.remove('active');
    }
  }
});
