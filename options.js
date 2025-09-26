    // Inject SweetAlert2 loader

document.addEventListener("DOMContentLoaded", function() {
    const tokenInput = document.querySelector('#gemini-token');
    const versionSelect = document.querySelector('#api-version');
    const modelSelect = document.querySelector('#model-name');
    const saveButton = document.querySelector('#save-token');

    // Load settings
    chrome.storage.local.get(["geminiToken", "apiVersion", "modelName"], (result) => {
        if (result.geminiToken) {
            tokenInput.value = result.geminiToken;
        }
        if (result.apiVersion) {
            versionSelect.value = result.apiVersion;
        }
        if (result.modelName) {
            modelSelect.value = result.modelName;
        }
    });

    saveButton.addEventListener("click", () => {
        const token = tokenInput.value.trim();
        const version = versionSelect.value;
        const model = modelSelect.value;
        if (token) {
            chrome.storage.local.set({ geminiToken: token, apiVersion: version, modelName: model }, () => {
                if (window.Swal) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Başarı!',
                        text: 'Ayarlar başarıyla kaydedildi.',
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            });
        } else {
            if (window.Swal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Eksik Bilgi',
                    text: 'Lütfen geçerli bir token girin.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        }
    });

    // Token visibility toggle
    const toggleTokenBtn = document.getElementById('toggle-token-visibility');
    if (toggleTokenBtn) {
        toggleTokenBtn.addEventListener('click', () => {
            if (tokenInput.type === 'password') {
                tokenInput.type = 'text';
                toggleTokenBtn.textContent = '🙈';
            } else {
                tokenInput.type = 'password';
                toggleTokenBtn.textContent = '👁️';
            }
        });
    }
});