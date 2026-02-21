const SYSTEM_PROMPT = "You are a Banglish to Bangla translator. Output ONLY the translated Bangla text. No explanations, no formatting, no extra words. Just the Bangla translation.";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    handleTranslation(request.text)
      .then(translatedText => sendResponse({ success: true, translatedText }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

async function handleTranslation(text) {
  const settings = await chrome.storage.local.get(['provider', 'apiKey']);
  
  if (!settings.apiKey) {
    throw new Error("API key missing. Please set it in the extension popup.");
  }

  const provider = settings.provider || 'openrouter';
  let apiUrl, model, headers;

  if (provider === 'openrouter') {
    apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    model = "google/gemini-2.0-flash-001"; // Defaulting to 2.0-flash as 2.5 isn't widely available yet
    headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`
    };
  } else if (provider === 'groq') {
    apiUrl = "https://api.groq.com/openai/v1/chat/completions";
    model = "openai/gpt-oss-120b";
    headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`
    };
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}
