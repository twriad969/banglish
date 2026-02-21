document.addEventListener('DOMContentLoaded', async () => {
  const providerOptions = document.querySelectorAll('.toggle-option');
  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-btn');
  const statusDiv = document.getElementById('status');

  let currentProvider = 'openrouter';

  // Load saved settings
  const settings = await chrome.storage.local.get(['provider', 'apiKey']);
  if (settings.provider) {
    currentProvider = settings.provider;
    updateToggleUI(currentProvider);
  }
  if (settings.apiKey) {
    apiKeyInput.value = settings.apiKey;
  }

  // Toggle Provider
  providerOptions.forEach(option => {
    option.addEventListener('click', () => {
      currentProvider = option.getAttribute('data-value');
      updateToggleUI(currentProvider);
    });
  });

  function updateToggleUI(provider) {
    providerOptions.forEach(opt => {
      if (opt.getAttribute('data-value') === provider) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
  }

  // Save Settings
  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    await chrome.storage.local.set({
      provider: currentProvider,
      apiKey: apiKey
    });

    showStatus('Settings saved!', 'success');
  });

  function showStatus(msg, type) {
    statusDiv.textContent = msg;
    statusDiv.className = type;
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }, 3000);
  }
});
