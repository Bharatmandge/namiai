const API_KEY = "PASTE YOUR GROQ API KEY HERE";
let recognition;
let synthesis;
let isListening = false;
let isSpeaking = false;
let isPaused = false;
let abortController = new AbortController();

// UI Functions
function toggleLoading(show) {
    document.getElementById('loadingIndicator').classList.toggle('hidden', !show);
}

function scrollToBottom() {
    const container = document.getElementById('conversationContainer');
    container.scrollTop = container.scrollHeight;
}

function createMessageElement(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `w-full flex justify-center animate-fade-in-up`;
    
    // Properly escape content for HTML and JavaScript
    const escapedContent = content
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
    
    messageDiv.innerHTML = `
        <div class="w-full max-w-xl p-4 rounded-2xl ${
            isUser ? 'bg-gray-800' : 'bg-gray-700'
        }">
            <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center">
                    ${
                        isUser
                        ? '<i class="fas fa-user text-white text-sm bg-gray-600 w-8 h-8 rounded-full flex items-center justify-center"></i>'
                        : `<img src="https://i.pinimg.com/736x/fe/4d/23/fe4d23e351d1fec9e404a812f4b30d8c.jpg" alt="NAMI AI" class="w-8 h-8 rounded-full">`
                    }
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium ${
                        isUser ? 'text-gray-300' : 'text-blue-300'
                    } mb-2">${isUser ? 'You' : 'NAMI AI'}</p>
                    <p class="text-gray-100 text-sm leading-relaxed">${content}</p>
                    ${!isUser ? `
                    <div class="mt-3 flex gap-3">
                        <button onclick="speakText('${escapedContent}')" 
                            class="text-gray-400 hover:text-white transition-colors">
                            <i class="fas fa-volume-up text-xs"></i>
                        </button>
                        <button onclick="copyToClipboard('${escapedContent}')" 
                            class="text-gray-400 hover:text-white transition-colors">
                            <i class="fas fa-copy text-xs"></i>
                        </button>
                    </div>` : ''}
                </div>
            </div>
        </div>
    `;
    return messageDiv;
}

// Core Functionality
async function fetchAnswer(question) {
    toggleLoading(true);
    abortController = new AbortController();
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "mixtral-8x7b-32768",
                messages: [{ role: "user", content: question }],
                temperature: 0.3,
                max_tokens: 512,
                top_p: 0.9
            }),
            signal: abortController.signal
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const answer = data.choices[0].message.content;
        
        document.getElementById('conversationContainer').appendChild(
            createMessageElement(answer, false)
        );
        scrollToBottom();
        speakText(answer);
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error:', error);
            showError('Failed to get response. Please try again.');
        }
    } finally {
        toggleLoading(false);
    }
}

// Voice Control Functions
function togglePause() {
    if (!synthesis) return;
    
    if (isPaused) {
        synthesis.resume();
        document.getElementById('pauseButton').innerHTML = '<i class="fas fa-pause text-gray-300"></i>';
        isPaused = false;
        document.getElementById('statusText').textContent = "Speaking...";
    } else {
        synthesis.pause();
        document.getElementById('pauseButton').innerHTML = '<i class="fas fa-play text-gray-300"></i>';
        isPaused = true;
        document.getElementById('statusText').textContent = "Paused";
    }
}

function stopSpeaking() {
    if (synthesis && isSpeaking) {
        synthesis.cancel();
        isSpeaking = false;
        isPaused = false;
        document.getElementById('pauseButton').innerHTML = '<i class="fas fa-pause text-gray-300"></i>';
        document.getElementById('statusText').textContent = "Ready";
    }
}

// Voice Recognition Functions
function startListening() {
    stopSpeaking();
    
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        const question = event.results[0][0].transcript;
        document.getElementById('conversationContainer').appendChild(
            createMessageElement(question, true)
        );
        scrollToBottom();
        fetchAnswer(question);
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showError('Speech recognition error. Please try again.');
        isListening = false;
        document.getElementById('statusText').textContent = "Ready";
    };

    recognition.onend = () => {
        isListening = false;
        document.getElementById('statusText').textContent = "Ready";
    };

    recognition.start();
    isListening = true;
    document.getElementById('statusText').textContent = "Listening...";
}

function stopListening() {
    if (recognition) {
        recognition.stop();
    }
    isListening = false;
    document.getElementById('statusText').textContent = "Ready";
}

function toggleListening() {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

// Utility Functions
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'w-full p-3 bg-red-800/50 rounded-lg backdrop-blur-sm animate-fade-in-up';
    errorDiv.innerHTML = `
        <div class="flex items-center gap-2 text-red-300">
            <i class="fas fa-exclamation-circle"></i>
            <p class="text-sm">${message}</p>
        </div>
    `;
    document.getElementById('conversationContainer').appendChild(errorDiv);
    scrollToBottom();
}

function stopResponse() {
    abortController.abort();
    stopSpeaking();
    stopListening();
    toggleLoading(false);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const alert = document.createElement('div');
        alert.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-800/90 text-white rounded-full text-sm backdrop-blur-sm animate-fade-in';
        alert.textContent = 'Copied to clipboard!';
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

function speakText(text) {
    stopSpeaking();
    
    if (!synthesis) {
        synthesis = window.speechSynthesis;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => {
        isSpeaking = true;
        isPaused = false;
        document.getElementById('statusText').textContent = "Speaking...";
    };

    utterance.onend = () => {
        isSpeaking = false;
        isPaused = false;
        document.getElementById('statusText').textContent = "Ready";
    };

    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        isSpeaking = false;
        isPaused = false;
        document.getElementById('statusText').textContent = "Ready";
    };

    // Try to find a pleasant voice
    const voices = synthesis.getVoices();
    if (voices.length > 0) {
        const preferredVoices = voices.filter(v => v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Google UK Female'));
        utterance.voice = preferredVoices.length > 0 ? preferredVoices[0] : voices[0];
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
    }

    synthesis.speak(utterance);
}

// Initialize
window.addEventListener('load', () => {
    synthesis = window.speechSynthesis;
    
    // Load voices properly
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
            console.log('Voices loaded');
        };
    }
    
    // Some browsers need this to load voices
    setTimeout(() => {
        if (synthesis.getVoices().length === 0) {
            synthesis.getVoices();
        }
    }, 1000);
    
    // Add event listeners for buttons
    document.getElementById('listenButton').addEventListener('click', toggleListening);
    document.getElementById('stopButton').addEventListener('click', stopResponse);
    document.getElementById('pauseButton').addEventListener('click', togglePause);
    
    // Initialize status
    document.getElementById('statusText').textContent = "Ready";
});
