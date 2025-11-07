// public/app.js - Client-side logic
const form = document.getElementById('lookupForm');
const input = document.getElementById('wordInput');
const statusEl = document.getElementById('status');
const output = document.getElementById('output');

function setStatus(message) {
  statusEl.textContent = message ?? '';
}

function safeText(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderResult(entries) {
  // entries: array from dictionary API
  if (!Array.isArray(entries) || entries.length === 0) {
    output.innerHTML = `<p>No results. Try another word.</p>`;
    return;
  }

  const entry = entries[0]; // take the first entry as primary
  const word = entry.word || '';
  const phoneticText = (entry.phonetic || (entry.phonetics?.find(p => p.text)?.text) || '').trim();
  const audioSrc = (entry.phonetics || []).find(p => p.audio)?.audio;

  let headerHtml = `
    <div class="result-header">
      <h2>${safeText(word)}</h2>
      ${phoneticText ? `<span class="phonetic">${safeText(phoneticText)}</span>` : ''}
      ${audioSrc ? `<button class="audio-btn" id="playAudio" type="button" aria-label="Play pronunciation">🔈 Play</button>` : ''}
    </div>
  `;

  let partsHtml = '';
  (entry.meanings || []).forEach(meaning => {
    const pos = meaning.partOfSpeech || '';
    const defs = meaning.definitions || [];
    if (defs.length) {
      partsHtml += `<div class="part-of-speech">${safeText(pos)}</div>`;
      partsHtml += `<ol class="definition-list">`;
      defs.slice(0, 5).forEach(d => {
        const def = d.definition || '';
        const ex = d.example ? `<div class="example" style="color:#4b5563; margin-top:0.2rem;">e.g., ${safeText(d.example)}</div>` : '';
        partsHtml += `<li>${safeText(def)}${ex}</li>`;
      });
      partsHtml += `</ol>`;
    }
  });

  if (!partsHtml) {
    partsHtml = `<p>No definitions found in this entry.</p>`;
  }

  output.innerHTML = headerHtml + partsHtml;

  if (audioSrc) {
    const btn = document.getElementById('playAudio');
    const audio = new Audio(audioSrc);
    btn.addEventListener('click', () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    });
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const word = input.value.trim();
  if (!word) return;

  output.innerHTML = '';
  setStatus('Looking up…');

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!res.ok) {
      // API returns 404 JSON when no definitions are found
      const data = await res.json().catch(() => ({}));
      const msg = data?.message || 'No definitions found.';
      setStatus('');
      output.innerHTML = `<p>${safeText(msg)}</p>`;
      return;
    }
    const data = await res.json();
    setStatus('');
    renderResult(data);
    // Remember the last searched word
    localStorage.setItem('lastWord', word);
  } catch (err) {
    setStatus('');
    output.innerHTML = `<p>Network error. Please try again.</p>`;
  }
});

// Load last searched word on first visit
window.addEventListener('DOMContentLoaded', () => {
  const last = localStorage.getItem('lastWord');
  if (last) {
    input.value = last;
    form.dispatchEvent(new Event('submit'));
  }
});
