/* script.js
 - Put your Apps Script web app URL into WEBAPP_URL below.
 - Accepts multiple files and uploads them one-by-one as base64 JSON POSTs.
*/

const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz8MlRw1WdMC_KcEJ98FQxtSL_MwdOFdBhANm6I38orxkgQNx7PkmGP46_C39k-YS_7/exec"; // <-- paste your Apps Script URL

const fileInput = document.getElementById('file-input');
const dropArea = document.getElementById('drop-area');
const progressArea = document.getElementById('progress-area');

;(() => {
  // drag/drop UX
  ['dragenter','dragover'].forEach(ev => {
    dropArea.addEventListener(ev, (e) => { e.preventDefault(); dropArea.classList.add('dragover'); });
  });
  ['dragleave','drop'].forEach(ev => {
    dropArea.addEventListener(ev, (e) => { e.preventDefault(); dropArea.classList.remove('dragover'); });
  });

  dropArea.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) handleFiles(files);
  });

  fileInput.addEventListener('change', e => {
    const files = Array.from(e.target.files || []);
    if (files.length) handleFiles(files);
    fileInput.value = '';
  });
})();

function handleFiles(files){
  // limit check
  const allowed = files.filter(f => f.size > 0);
  if (!allowed.length) return;
  progressArea.innerHTML = '';
  // For each file, create progress UI and upload
  allowed.forEach(file => {
    const row = createProgressRow(file);
    progressArea.appendChild(row.el);
    uploadFileBase64(file, prog => {
      row.level.style.width = `${prog}%`;
      row.text.innerText = `${Math.round(prog)}%`;
    }).then(res => {
      if (res.ok) {
        row.text.innerText = 'Done ✓';
        const a = document.createElement('a');
        a.href = res.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Open';
        a.style.marginLeft = '10px';
        row.el.querySelector('.progress-row').appendChild(a);
      } else {
        row.text.innerText = 'Error';
        const err = document.createElement('div');
        err.style.color = '#ffb4b4';
        err.textContent = res.error || 'upload failed';
        row.el.appendChild(err);
      }
    }).catch(err => {
      row.text.innerText = 'Error';
      const errEl = document.createElement('div');
      errEl.style.color = '#ffb4b4';
      errEl.textContent = err.toString();
      row.el.appendChild(errEl);
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
        const dataUrl = reader.result; // "data:...;base64,XXXXX"
        const base64 = dataUrl.split(',')[1];
        // Simple progress simulation: for big files this will at least show something
        onProgress && onProgress(10);

        // POST to Apps Script
        const payload = { name: file.name, mimeType: file.type || 'application/octet-stream', base64 };
        const res = await fetch(WEBAPP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          mode: 'cors'
        });

        onProgress && onProgress(70);

        const json = await res.json();
        onProgress && onProgress(100);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });
}

// tiny escape
function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
