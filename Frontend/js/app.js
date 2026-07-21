document.addEventListener('DOMContentLoaded', () => {
    // Exact mapping matching your recovered HTML IDs perfectly
    const analyzeBtn = document.getElementById('submit-btn');
    const promptInput = document.getElementById('user-prompt');
    const responseContainer = document.getElementById('decision-output-container');
    const outputArea = document.getElementById('streaming-output');
    const resetBtn = document.getElementById('reset-btn');

    // Advanced modular formatting utility to parse markers into clean layout tags
    function parseMarkdownToHTML(text) {
        if (!text) return "";
        let formatted = text;

        const sections = [
            "QUICK RECOMMENDATION:", 
            "DETAILED ANALYSIS:", 
            "PROS & CONS:", 
            "RISKS & TRADE-OFFS:", 
            "PRACTICAL EXECUTION ROADMAP:"
        ];

        sections.forEach(section => {
            const regex = new RegExp(section, 'g');
            formatted = formatted.replace(regex, `<div class="section-block-title">${section}</div>`);
        });

        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.split(' * ').join('<span class="bullet-accent">•</span> ');
        return formatted.split('\n').join('<br>');
    }

    // Direct event listener binding setup with Timeout Safeguard
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const promptText = promptInput ? promptInput.value.trim() : "";
            if (!promptText) {
                alert("Please describe your decision scenario first.");
                return;
            }

            // Trigger and display output state layout blocks
            if (outputArea) {
                outputArea.innerHTML = '<span class="system-loader">Parsing system logic metrics... Engine running...</span>';
            }
            if (responseContainer) {
                responseContainer.classList.remove('hidden');
                // Scroll down smoothly to show the response block instantly
                responseContainer.scrollIntoView({ behavior: 'smooth' });
            }
            
            analyzeBtn.disabled = true;

            // Timeout controller setup (20s limit)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            try {
                const response = await fetch('/api/decide', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: promptText }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId); // Clear timeout on successful connection

                if (!response.ok) {
                    throw new Error(`Server returned status code: ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedText = "";
                
                if (outputArea) outputArea.innerHTML = ""; 

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    accumulatedText += decoder.decode(value, { stream: true });
                    if (outputArea) {
                        outputArea.innerHTML = parseMarkdownToHTML(accumulatedText);
                    }
                }

            } catch (error) {
                console.error("Connectivity or stream error:", error);
                if (outputArea) {
                    const isTimeout = error.name === 'AbortError';
                    outputArea.innerHTML = `
                        <div class="error-box">
                            <span class="error-title">${isTimeout ? 'Request Timeout' : 'System Connectivity Anomaly'}</span>
                            <p>${isTimeout ? 'The engine took too long to respond. Please check your connection or retry.' : 'Unable to establish a live channel to the analytical backend engine.'}</p>
                        </div>
                    `;
                }
            } finally {
                analyzeBtn.disabled = false;
            }
        });
    }

    // New Decision button clear utility handler
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (promptInput) promptInput.value = "";
            if (responseContainer) responseContainer.classList.add('hidden');
            if (outputArea) outputArea.innerHTML = "";
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});