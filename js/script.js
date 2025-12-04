const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz3sshw7lvkF8LAQVP_Cai_DYn4thhLbpilM3u99_Lpp_77THKGufvPEVEZdwld_08/exec"; // <-- ensure exact

const fileInput = document.getElementById('file-input');
const dropArea = document.getElementById('drop-area');
const progressArea = document.getElementById('progress-area');

;(() => {
  ['dragenter','dragover'].forEach(ev => dropArea.addEventListener(ev, e => { e.preventDefault(); dropArea.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(ev => dropArea.addEventListener(ev, e => { e.preventDefault(); dropArea.classList.remove('dragover'); }));
  dropArea.addEventListener('drop', e => { const files = Array.from(e.dataTransfer.files || []); if (files.length) handleFiles(files); });
  fileInput.addEventListener('change', e => { const files = Array.from(e.target.files || []); if (files.length) handleFiles(files); fileInput.value=''; });
})();

function handleFiles(files){
  progressArea.innerHTML = '';
  files.forEach(file => {
    const row = createProgressRow(file);
    progressArea.appendChild(row.el);
    uploadFileBase64(file, prog => { row.level.style.width = `${prog}%`; row.text.innerText = `${Math.round(prog)}%`; })
      .then(res => {
        if (res && res.ok) {
          row.text.innerText = 'Done ✓';
          const a = document.createElement('a'); a.href = res.url; a.target='_blank'; a.textContent='Open'; a.style.marginLeft='10px';
          row.el.querySelector('.progress-row').appendChild(a);
        } else {
          row.text.innerText = 'Error';
          const err = document.createElement('div'); err.style.color='#ffb4b4'; err.textContent = (res && res.error) ? res.error : 'upload failed';
          row.el.appendChild(err);
          console.error('Upload response:', res);
        }
      })
      .catch(err => {
        row.text.innerText = 'Error';
        const errEl = document.createElement('div');
        errEl.style.color = '#ffb4b4';
        errEl.textContent = err.toString();
        row.el.appendChild(errEl);
        console.error('Upload exception:', err);
      });
  });
}

function createProgressRow(file){
  const el = document.createElement('div');
  el.className = 'progress-row-container';
  el.innerHTML = `
    <div class="progress-row">
      <div class="progress-thumb">${file.type.startsWith('image') ? 'IMG' : 'VID'}</div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:14px">${escapeHtml(file.name)}</strong>
          <span class="progress-text" style="font-size:13px;color:#9aa4b2">0%</span>
        </div>
        <div class="progress-bar"><div class="progress-level" style="width:0%"></div></div>
      </div>
    </div>
  `;
  const level = el.querySelector('.progress-level');
  const text = el.querySelector('.progress-text');
  return { el, level, text };
}

function uploadFileBase64(file, onProgress){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(',')[1];
        onProgress && onProgress(10);

        // Simple size guard before sending to server
        if (base64.length > 60 * 1024 * 1024) { // ~60MB base64 ≈ 45MB binary
          return resolve({ ok:false, error: 'File too large for this uploader. Try a smaller file.' });
        }

        const payload = { name: file.name, mimeType: file.type || 'application/octet-stream', base64 };

        // POST
        const fetchOpts = { method:'POST', headers:{ 'Content-Type': 'application/json' }, body: JSON.stringify(payload), mode: 'cors' };
        const res = await fetch(WEBAPP_URL, fetchOpts);

        // If network failure, fetch will throw; if non-2xx, still try to extract body
        let text;
        try { text = await res.text(); } catch (e) { text = ''; }

        if (!res.ok) {
          console.error('Server returned non-OK', res.status, text);
          // try parse JSON body if available
          try { const j = JSON.parse(text); return resolve(j); } catch (e) { return resolve({ ok:false, error: 'Server error: ' + res.status + ' ' + res.statusText }); }
        }

        // parse JSON safely
        try {
          const json = JSON.parse(text);
          onProgress && onProgress(100);
          return resolve(json);
        } catch (e) {
          console.error('Failed to parse JSON response:', text);
          return resolve({ ok:false, error: 'Invalid JSON response from server' });
        }
      } catch (err) {
        console.error('Upload exception:', err);
        return reject(err);
      }
    };

    reader.onerror = (ev) => {
      console.error('FileReader error', ev);
      reject(new Error('FileReader error: ' + (ev && ev.target && ev.target.error && ev.target.error.message ? ev.target.error.message : ev)));
    };

    // Start reading
    try {
      reader.readAsDataURL(file);
    } catch (err) {
      reject(err);
    }
  });
}

function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
