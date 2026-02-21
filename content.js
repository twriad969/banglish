// --- STABLE STATE ---
let currentSelection = { text: '', range: null };

// --- ROBUST UI INJECTION ---
function createUI() {
  if (document.getElementById('banglish-root')) return;

  const root = document.createElement('div');
  root.id = 'banglish-root';
  // Use a shadow root or high specificity to isolate styles
  root.innerHTML = `
    <div id="banglish-trigger" style="display: none;">
      <img src="${chrome.runtime.getURL('icons/icon48.png')}">
    </div>
    <div id="banglish-panel" style="display: none;">
      <div class="banglish-header">
        <span>🔥 Banglish → বাংলা</span>
        <button id="banglish-close">&times;</button>
      </div>
      <div class="banglish-body">
        <div id="banglish-preview"></div>
        <button id="banglish-translate-btn">
          <span id="banglish-btn-text">Translate</span>
          <div id="banglish-spinner"></div>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // Setup Listeners
  document.getElementById('banglish-trigger').onclick = (e) => {
    e.stopPropagation();
    showPanel();
  };
  document.getElementById('banglish-close').onclick = hideUI;
  document.getElementById('banglish-translate-btn').onclick = performTranslation;
}

// --- CORE LOGIC ---
document.addEventListener('mouseup', (e) => {
  setTimeout(() => {
    const sel = window.getSelection();
    const text = sel.toString().trim();

    if (text && !document.getElementById('banglish-root').contains(e.target)) {
      const range = sel.getRangeAt(0);
      currentSelection = { text, range: range.cloneRange() };
      positionElement(document.getElementById('banglish-trigger'), range, true);
    } else if (!document.getElementById('banglish-root').contains(e.target)) {
      hideUI();
    }
  }, 50);
});

function positionElement(el, range, isTrigger) {
  const rect = range.getBoundingClientRect();
  const elWidth = isTrigger ? 44 : 320;
  const elHeight = isTrigger ? 44 : 200;
  const padding = 15;

  let top = rect.top - elHeight - 10;
  let left = rect.right - 20;

  if (top < padding) top = rect.bottom + 10;
  if (left + elWidth > window.innerWidth - padding) left = window.innerWidth - elWidth - padding;
  if (left < padding) left = padding;

  el.style.position = 'fixed';
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
  el.style.display = isTrigger ? 'flex' : 'flex';
  
  if (isTrigger) {
    el.classList.add('active');
    document.getElementById('banglish-panel').style.display = 'none';
  } else {
    el.classList.add('active');
  }
}

function showPanel() {
  const trigger = document.getElementById('banglish-trigger');
  const panel = document.getElementById('banglish-panel');
  const preview = document.getElementById('banglish-preview');
  
  trigger.style.display = 'none';
  preview.textContent = currentSelection.text.slice(0, 100);
  positionElement(panel, currentSelection.range, false);
}

function hideUI() {
  const root = document.getElementById('banglish-root');
  if (!root) return;
  document.getElementById('banglish-trigger').style.display = 'none';
  document.getElementById('banglish-panel').style.display = 'none';
}

// --- TRANSLATION ---
async function performTranslation() {
  const btn = document.getElementById('banglish-translate-btn');
  const spinner = document.getElementById('banglish-spinner');
  const text = document.getElementById('banglish-btn-text');

  btn.disabled = true;
  spinner.style.display = 'block';
  text.style.opacity = '0';

  try {
    const res = await chrome.runtime.sendMessage({ action: "translate", text: currentSelection.text });
    if (res.success) {
      replaceText(res.translatedText);
      hideUI();
    } else {
      alert("Error: " + res.error);
    }
  } catch (e) {
    console.error(e);
  } finally {
    btn.disabled = false;
    spinner.style.display = 'none';
    text.style.opacity = '1';
  }
}

function replaceText(newText) {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
    const start = active.selectionStart;
    const end = active.selectionEnd;
    active.value = active.value.slice(0, start) + newText + active.value.slice(end);
    return;
  }
  
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(currentSelection.range);
  document.execCommand('insertText', false, newText);
}

// Shortcut
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab' && window.getSelection().toString().trim()) {
    e.preventDefault();
    currentSelection.text = window.getSelection().toString().trim();
    currentSelection.range = window.getSelection().getRangeAt(0).cloneRange();
    performTranslation();
  }
});

createUI();
