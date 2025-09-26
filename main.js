    // Inject SweetAlert2 loader

function calculatePasswordStrength(password) {
    let score = 0;

    if (password.length >= 12) score += 30;
    else if (password.length >= 8) score += 15;

    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;

    let specialChars = password.match(/[!@#$%^&*()?":{}|<>]/g);
    if (specialChars) score += specialChars.length * 10;

    let spaces = (password.match(/ /g) || []).length;
    score += spaces * 10;

    return score;
}

function getStrengthText(score) {
    if (score >= 80) return { text: "Çok Güçlü 💪", color: "#4CAF50" };
    if (score >= 60) return { text: "Güçlü 👍", color: "#2196F3" };
    if (score >= 40) return { text: "Orta 🤔", color: "#FFC107" };
    if (score >= 20) return { text: "Zayıf 😬", color: "#FF9800" };
    return { text: "Çok Zayıf ❌", color: "#f44336" };
}

document.addEventListener("DOMContentLoaded", function() {
    const input = document.querySelector('#password');
    const bar = document.querySelector("#strength-bar");
    const label = document.querySelector("#strength-label");
    const actionBtn = document.querySelector('#action-btn');
    const toggleBtn = document.querySelector('#toggle-password');
    const suggestBtn = document.querySelector('#suggest-password');
    const memorableInput = document.querySelector('#memorable-input');
    const suggestedPasswordSpan = document.querySelector('#suggested-password');

    const cachedPassword = localStorage.getItem("cachedPassword");
    if (cachedPassword) {
        updateStrengthUI(cachedPassword);
        input.value = cachedPassword;
    }

    function updateStrengthUI(password) {
        let score = calculatePasswordStrength(password);
        score = Math.min(score, 100);
        let strength = getStrengthText(score);

        bar.style.width = score + "%";
        bar.style.background = strength.color;

        label.textContent = password ? `${strength.text} (${score}/100)` : "Şifre gücünü görmek için yazın";
        label.style.color = password ? strength.color : "rgba(255,255,255,0.7)";
    }

    input.addEventListener("input", () => {
        updateStrengthUI(input.value);
        localStorage.setItem("cachedPassword", input.value);
    });

    toggleBtn.addEventListener("click", () => {
        if (input.type === "password") {
            input.type = "text";
            toggleBtn.textContent = "🙈";
            toggleBtn.style.color = "white";
        } else {
            input.type = "password";
            toggleBtn.textContent = "👁️";
            toggleBtn.style.color = "rgba(255,255,255,0.7)";
        }
    });

    actionBtn.addEventListener("click", () => {
        if (!input.value) {
            if (window.Swal) {
                Swal.fire({ icon: 'info', title: 'Şifre girin', text: 'Kopyalamak için önce bir şifre girin.' });
            }
            return;
        }
        navigator.clipboard.writeText(input.value);
        if (window.Swal) {
            Swal.fire({ icon: 'success', title: 'Kopyalandı!', text: 'Şifre panoya kopyalandı.' });
        }
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const url = tabs[0].url;
            if (url && !url.startsWith("chrome://")) {
                chrome.scripting.executeScript({
                    target: {tabId: tabs[0].id},
                    function: (password) => {
                        document.querySelectorAll('input[type="password"]').forEach(inp => {
                            inp.value = password;
                        });
                    },
                    args: [input.value]
                });
            }
        });
    });

    suggestBtn.addEventListener("click", async () => {
        const memorableWords = memorableInput.value
            .split(",")
            .map(word => word.trim())
            .filter(word => word.length > 0);

        if (memorableWords.length === 0) {
            if (window.Swal) {
                Swal.fire({ icon: 'info', title: 'Kelime girin', text: 'Lütfen en az bir hatırlanabilir kelime girin.' });
            }
            return;
        }

        const geminiToken = await new Promise((resolve) => {
            chrome.storage.local.get("geminiToken", (result) => {
                resolve(result.geminiToken || null);
            });
        });

        if (!geminiToken) {
            if (window.Swal) {
                Swal.fire({ icon: 'warning', title: 'API anahtarı eksik', text: 'Lütfen seçenekler sayfasından Gemini API anahtarınızı girin.' });
            }
            return;
        }

        const settings = await new Promise((resolve) => {
            chrome.storage.local.get(["apiVersion", "modelName"], (result) => {
                resolve(result);
            });
        });

        const apiVersion = settings.apiVersion || "v1beta";
        const modelName = settings.modelName || "gemini-1.5-flash";
        const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent`;

        const systemInstruction = `
Sen bir Şifre Uzmanı'sın. Kullanıcı tarafından verilen hatırlanabilir kelimeleri kullanarak güçlü ve güvenli bir şifre oluşturacaksın.
KURALLAR: 
1. Şifre en az 12 karakter uzunluğunda olmalı. 
2. Büyük harf, küçük harf, rakam ve özel karakter içermeli. 
3. Şifre, kullanıcı tarafından verilen kelimelerle bağlantılı olmalı ancak tahmin edilmesi zor olmalı. 
4. JSON formatında sadece şu alanı döndür: { "password": "oluşturulan şifre" }. 
5. Şifrede ara yerlerde space karakteri de kullanabilirsin daha güvenli olabilir.
        `.trim();

        const userPrompt = `${systemInstruction}\n\nHatırlanabilir kelimeler: ${memorableWords.join(", ")}\n\nYukarıdaki kelimeleri kullanarak güçlü bir şifre oluştur.`;

        try {
            const response = await fetch(GEMINI_API_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": geminiToken
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: userPrompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 256 }
                })
            });
            if (!response.ok) {
                if (window.Swal) {
                    Swal.fire({ icon: 'error', title: 'API Hatası', text: 'Gemini API isteği başarısız oldu.' });
                }
                return;
            }
            const data = await response.json();
            let responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (!responseText) {
                if (window.Swal) {
                    Swal.fire({ icon: 'error', title: 'Yanıt Yok', text: 'API yanıtı alınamadı.' });
                }
                return;
            }
            responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(responseText);
            } catch (parseErr) {
                if (window.Swal) {
                    Swal.fire({ icon: 'error', title: 'Yanıt Hatası', text: 'API yanıtı işlenemedi.' });
                }
                return;
            }
            const generatedPassword = parsedResponse.password;
            if (!generatedPassword) {
                if (window.Swal) {
                    Swal.fire({ icon: 'error', title: 'Şifre Yok', text: 'API güçlü bir şifre üretemedi.' });
                }
                return;
            }
            suggestedPasswordSpan.textContent = generatedPassword;
            document.getElementById('suggested-password-container').style.display = 'flex';
        } catch (error) {
            if (window.Swal) {
                Swal.fire({ icon: 'error', title: 'İstek Hatası', text: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
            }
        }
    });

    const optionsButton = document.getElementById('options-btn');
    if (optionsButton) {
        optionsButton.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

        const copySuggestedBtn = document.getElementById('copy-suggested-btn');
        if (copySuggestedBtn) {
            copySuggestedBtn.addEventListener('click', () => {
                const password = suggestedPasswordSpan.textContent;
                if (password) {
                    navigator.clipboard.writeText(password);
                    if (window.Swal) {
                        Swal.fire({ icon: 'success', title: 'Kopyalandı!', text: 'Önerilen şifre panoya kopyalandı.' });
                    }
                } else {
                    if (window.Swal) {
                        Swal.fire({ icon: 'info', title: 'Şifre yok', text: 'Kopyalanacak önerilen şifre bulunamadı.' });
                    }
                }
            });
        }
});
