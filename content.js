let currentSelection = {
  text: '',
  rect: null,
  range: null
};

// --- DOM Elements ---
const trigger = document.createElement('div');
trigger.id = 'banglish-trigger';
trigger.innerHTML = `<img src="${chrome.runtime.getURL('icons/icon48.png')}" style="width: 24px; height: 24px; pointer-events: none;">`;
document.body.appendChild(trigger);

const panel = document.createElement('div');
panel.id = 'banglish-panel';
panel.innerHTML = `
  <div id="banglish-panel-header">
    <span>🔥 Banglish → বাংলা</span>
    <button id="banglish-panel-close">&times;</button>
  </div>
  <div id="banglish-panel-divider"></div>
  <div id="banglish-panel-body">
    <div id="banglish-preview-box"></div>
    <button id="banglish-translate-btn">
      <span id="banglish-btn-text">Translate</span>
      <div id="banglish-spinner"></div>
    </button>
  </div>
`;
document.body.appendChild(panel);

// --- Selection Logic ---
document.addEventListener('mouseup', (e) => {
  // Delay slightly to allow selection to finalize
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && !trigger.contains(e.target) && !panel.contains(e.target)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      currentSelection = {
        text: selectedText,
        rect: rect,
        range: range.cloneRange()
      };

      showTrigger(rect);
    } else if (!trigger.contains(e.target) && !panel.contains(e.target)) {
      hideUI();
    }
  }, 10);
});

// --- UI Actions ---
function showTrigger(rect) {
  trigger.style.top = `${rect.top + window.scrollY - 45}px`;
  trigger.style.left = `${rect.right + window.scrollX - 20}px`;
  trigger.classList.add('active');
  panel.classList.remove('active');
}

trigger.addEventListener('click', (e) => {
  e.stopPropagation();
  trigger.classList.remove('active');
  showPanel();
});

function showPanel() {
  const { rect, text } = currentSelection;
  panel.style.top = `${rect.bottom + window.scrollY + 10}px`;
  panel.style.left = `${rect.left + window.scrollX}px`;
  document.getElementById('banglish-preview-box').textContent = text.slice(0, 100) + (text.length > 100 ? '...' : '');
  panel.classList.add('active');
}

document.getElementById('banglish-panel-close').addEventListener('click', hideUI);

document.getElementById('banglish-translate-btn').addEventListener('click', async () => {
  await performTranslation();
});

function hideUI() {
  trigger.classList.remove('active');
  panel.classList.remove('active');
}

// --- Translation & Replacement ---
async function performTranslation(silent = false) {
  const text = currentSelection.text;
  if (!text) return;

  const btn = document.getElementById('banglish-translate-btn');
  const btnText = document.getElementById('banglish-btn-text');
  const spinner = document.getElementById('banglish-spinner');

  if (!silent) {
    btn.disabled = true;
    btnText.style.opacity = '0';
    spinner.style.display = 'block';
  }

  try {
    const response = await chrome.runtime.sendMessage({ action: "translate", text });
    if (response.success) {
      replaceTextInDOM(response.translatedText);
      if (!silent) hideUI();
    } else {
      console.error("Translation Error:", response.error);
      if (!silent) {
        alert("Translation failed: " + response.error);
      }
    }
  } catch (err) {
    console.error("Connection Error:", err);
  } finally {
    if (!silent) {
      btn.disabled = false;
      btnText.style.opacity = '1';
      spinner.style.display = 'none';
    }
  }
}

function replaceTextInDOM(translatedText) {
  const { range } = currentSelection;
  const activeElement = document.activeElement;

  // Handle inputs/textareas
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    const val = activeElement.value;
    activeElement.value = val.slice(0, start) + translatedText + val.slice(end);
    activeElement.setSelectionRange(start, start + translatedText.length);
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    flashEffect(activeElement);
    return;
  }

  // Handle contenteditable / static DOM
  try {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Use execCommand for better compatibility with rich editors, fallback to manual
    if (!document.execCommand('insertText', false, translatedText)) {
      const span = document.createElement('span');
      span.className = 'banglish-replaced-text';
      span.textContent = translatedText;
      range.deleteContents();
      range.insertNode(span);
      flashEffect(span);
    } else {
      // If execCommand worked, we need to find the new node to flash it
      // For simplicity, we flash the parent of the selection
      flashEffect(range.commonAncestorContainer.parentElement);
    }
  } catch (e) {
    console.error("Replacement failed:", e);
  }
}

function flashEffect(element) {
  element.style.transition = 'background 0.3s ease';
  const originalBg = element.style.background;
  element.style.background = 'rgba(255, 107, 0, 0.3)';
  setTimeout(() => {
    element.style.background = originalBg;
  }, 600);
}

// --- Keyboard Shortcut ---
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      e.preventDefault();
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      currentSelection = {
        text: selectedText,
        range: range.cloneRange()
      };
      performTranslation(true);
    }
  }
});
