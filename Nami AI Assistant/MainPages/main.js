const API_KEY = "Your GROk API KEY ";
        let recognition;
        let synthesis;
        let isListening = false;
        let isSpeaking = false;
        let isPaused = false;
        let abortController = new AbortController();
        let particles = [];
        let isDarkMode = true;

        // Initialize particles
        function initParticles() {
            const container = document.getElementById('particles');
            const particleCount = window.innerWidth < 768 ? 30 : 50;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.classList.add('particle');
                
                // Random properties
                const size = Math.random() * 5 + 2;
                const posX = Math.random() * 100;
                const posY = Math.random() * 100;
                const opacity = Math.random() * 0.4 + 0.1;
                const duration = Math.random() * 20 + 10;
                const delay = Math.random() * 5;
                
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                particle.style.left = `${posX}%`;
                particle.style.top = `${posY}%`;
                particle.style.opacity = opacity;
                particle.style.animation = `float ${duration}s ease-in-out ${delay}s infinite`;
                
                container.appendChild(particle);
                particles.push({
                    element: particle,
                    x: posX,
                    y: posY,
                    speedX: (Math.random() - 0.5) * 0.2,
                    speedY: (Math.random() - 0.5) * 0.2
                });
            }
            
            // Animate particles
            animateParticles();
        }
        
        function animateParticles() {
            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                
                // Boundary check
                if (p.x < 0 || p.x > 100) p.speedX *= -1;
                if (p.y < 0 || p.y > 100) p.speedY *= -1;
                
                p.element.style.left = `${p.x}%`;
                p.element.style.top = `${p.y}%`;
            });
            
            requestAnimationFrame(animateParticles);
        }

        // Create ripple effect
        function createRipple(event) {
            const button = event.currentTarget;
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            button.appendChild(ripple);
            
            ripple.addEventListener('animationend', () => {
                ripple.remove();
            });
        }

        // UI Functions
        function toggleLoading(show) {
            const indicator = document.getElementById('loadingIndicator');
            const micButton = document.getElementById('micButton');
            
            if (show) {
                indicator.classList.remove('hidden');
                micButton.querySelector('div').classList.add('speaking-animation');
            } else {
                indicator.classList.add('hidden');
                if (!isSpeaking) {
                    micButton.querySelector('div').classList.remove('speaking-animation');
                }
            }
        }

        function scrollToBottom() {
            const container = document.getElementById('conversationContainer');
            container.scrollTop = container.scrollHeight;
        }

        function createMessageElement(content, isUser = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `w-full flex justify-center message-enter`;
            
            // Properly escape content
            const escapedContent = content
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r');
            
            messageDiv.innerHTML = `
                <div class="w-full max-w-xl p-5 rounded-2xl ${isUser ? 'user-message' : 'ai-message'}">
                    <div class="flex items-start gap-4">
                        <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                            isUser 
                            ? 'bg-slate-700' 
                            : 'bg-gradient-to-br from-purple-500 to-indigo-600 glow'
                        }">
                            ${
                                isUser
                                ? '<i class="fas fa-user text-white text-sm"></i>'
                                : `<img src="https://i.pinimg.com/736x/fe/4d/23/fe4d23e351d1fec9e404a812f4b30d8c.jpg" alt="NAMI AI" class="w-8 h-8 rounded-full">`
                            }
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium ${
                                isUser ? 'text-slate-300' : 'text-purple-300'
                            } mb-2">${isUser ? 'You' : 'NAMI AI'}</p>
                            <p class="text-slate-100 text-sm leading-relaxed">${content}</p>
                            ${!isUser ? `
                            <div class="mt-3 flex gap-3">
                                <button onclick="speakText('${escapedContent}')" 
                                    class="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-700/50">
                                    <i class="fas fa-volume-up text-xs"></i>
                                </button>
                                <button onclick="copyToClipboard('${escapedContent}')" 
                                    class="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-700/50">
                                    <i class="fas fa-copy text-xs"></i>
                                </button>
                                <button onclick="regenerateResponse(this)" 
                                    class="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-700/50">
                                    <i class="fas fa-sync-alt text-xs"></i>
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
                        model: "llama-3.3-70b-versatile",
                        messages: [{ role: "user", content: question }],
                        temperature: 0.3,
                        max_tokens: 1024,
                        top_p: 0.9
                    }),
                    signal: abortController.signal
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                const answer = data.choices[0]?.message?.content;
                
                if (!answer) throw new Error('No answer received from the API');
                
                document.getElementById('conversationContainer').appendChild(
                    createMessageElement(answer, false)
                );
                scrollToBottom();
                speakText(answer);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error:', error);
                    showError(error.message || 'Failed to get response. Please try again.');
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
                document.getElementById('pauseButton').innerHTML = '<i class="fas fa-pause text-slate-300"></i>';
                isPaused = false;
                document.getElementById('statusText').textContent = "Speaking...";
            } else {
                synthesis.pause();
                document.getElementById('pauseButton').innerHTML = '<i class="fas fa-play text-slate-300"></i>';
                isPaused = true;
                document.getElementById('statusText').textContent = "Paused";
            }
        }

        function stopSpeaking() {
            if (synthesis && isSpeaking) {
                synthesis.cancel();
                isSpeaking = false;
                isPaused = false;
                document.getElementById('pauseButton').innerHTML = '<i class="fas fa-pause text-slate-300"></i>';
                document.getElementById('statusText').textContent = "Ready";
                document.getElementById('micButton').querySelector('div').classList.remove('speaking-animation');
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
            document.getElementById('micButton').querySelector('div').classList.add('speaking-animation');
        }

        function stopListening() {
            if (recognition) {
                recognition.stop();
            }
            isListening = false;
            document.getElementById('statusText').textContent = "Ready";
            document.getElementById('micButton').querySelector('div').classList.remove('speaking-animation');
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
            errorDiv.className = 'w-full flex justify-center animate-fade-in-up';
            errorDiv.innerHTML = `
                <div class="w-full max-w-xl p-4 bg-red-900/50 rounded-2xl backdrop-blur-sm border border-red-800/50">
                    <div class="flex items-center gap-3 text-red-300">
                        <i class="fas fa-exclamation-circle"></i>
                        <p class="text-sm">${message}</p>
                    </div>
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
            
            // Add visual feedback
            const stopButton = document.getElementById('stopButton');
            stopButton.innerHTML = '<i class="fas fa-check text-green-400"></i>';
            setTimeout(() => {
                stopButton.innerHTML = '<i class="fas fa-stop text-slate-300"></i>';
            }, 1000);
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                const alert = document.createElement('div');
                alert.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 text-white rounded-full text-sm backdrop-blur-sm animate-fade-in flex items-center gap-2';
                alert.innerHTML = '<i class="fas fa-check"></i> Copied to clipboard!';
                document.body.appendChild(alert);
                setTimeout(() => {
                    alert.classList.add('opacity-0', 'transition-opacity', 'duration-300');
                    setTimeout(() => alert.remove(), 300);
                }, 2000);
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
                document.getElementById('micButton').querySelector('div').classList.add('speaking-animation');
            };

            utterance.onend = () => {
                isSpeaking = false;
                isPaused = false;
                document.getElementById('statusText').textContent = "Ready";
                document.getElementById('micButton').querySelector('div').classList.remove('speaking-animation');
            };

            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                isSpeaking = false;
                isPaused = false;
                document.getElementById('statusText').textContent = "Ready";
                document.getElementById('micButton').querySelector('div').classList.remove('speaking-animation');
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

        // New UI Functions
        function clearConversation() {
            const container = document.getElementById('conversationContainer');
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            
            // Add back the welcome message
            container.innerHTML = `
                <div class="w-full flex justify-center animate-fade-in-up">
                    <div class="w-full max-w-xl p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50">
                        <div class="flex items-start gap-4">
                            <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 glow">
                                <img src="https://i.pinimg.com/736x/fe/4d/23/fe4d23e351d1fec9e404a812f4b30d8c.jpg" alt="NAMI AI" class="w-8 h-8 rounded-full">
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-purple-300 mb-2">NAMI AI</p>
                                <p class="text-slate-100 text-sm leading-relaxed typewriter">
                                    Hello! I'm NAMI, your AI assistant. How can I help you today? Just tap the microphone button and speak.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add visual feedback
            const buttons = document.querySelectorAll('button');
            buttons.forEach(btn => {
                if (btn.onclick && btn.onclick.toString().includes('clearConversation')) {
                    btn.innerHTML = '<i class="fas fa-check mr-2"></i> Cleared!';
                    setTimeout(() => {
                        btn.innerHTML = '<i class="fas fa-trash-alt text-xs mr-2"></i> Clear Chat';
                    }, 2000);
                }
            });
        }

        function toggleDarkMode() {
            isDarkMode = !isDarkMode;
            if (isDarkMode) {
                document.body.classList.remove('bg-white', 'text-gray-900');
                document.body.classList.add('bg-gradient-to-br', 'from-slate-900', 'to-slate-800', 'text-white');
                document.querySelectorAll('.ai-message').forEach(el => {
                    el.classList.remove('bg-blue-100', 'text-gray-800');
                    el.classList.add('bg-gradient-to-br', 'from-purple-600', 'to-indigo-600');
                });
                document.querySelectorAll('.user-message').forEach(el => {
                    el.classList.remove('bg-gray-200', 'text-gray-800');
                    el.classList.add('bg-gradient-to-br', 'from-slate-800', 'to-slate-700');
                });
                document.getElementById('pauseButton').innerHTML = '<i class="fas fa-pause text-slate-300"></i>';
                document.getElementById('stopButton').innerHTML = '<i class="fas fa-stop text-slate-300"></i>';
            } else {
                document.body.classList.remove('bg-gradient-to-br', 'from-slate-900', 'to-slate-800', 'text-white');
                document.body.classList.add('bg-white', 'text-gray-900');
                document.querySelectorAll('.ai-message').forEach(el => {
                    el.classList.remove('bg-gradient-to-br', 'from-purple-600', 'to-indigo-600');
                    el.classList.add('bg-blue-100', 'text-gray-800');
                });
                document.querySelectorAll('.user-message').forEach(el => {
                    el.classList.remove('bg-gradient-to-br', 'from-slate-800', 'to-slate-700');
                    el.classList.add('bg-gray-200', 'text-gray-800');
                });
                document.getElementById('pauseButton').innerHTML = '<i class="fas fa-pause text-gray-700"></i>';
                document.getElementById('stopButton').innerHTML = '<i class="fas fa-stop text-gray-700"></i>';
            }
            
            // Update button text
            const darkModeButton = document.querySelector('button[onclick="toggleDarkMode()"]');
            darkModeButton.innerHTML = isDarkMode 
                ? '<i class="fas fa-sun text-xs mr-2"></i> Light Mode' 
                : '<i class="fas fa-moon text-xs mr-2"></i> Dark Mode';
        }

        function regenerateResponse(button) {
            const messages = document.getElementById('conversationContainer').children;
            if (messages.length < 2) return;
            
            const lastUserMessage = messages[messages.length - 2].querySelector('p.text-slate-100').textContent;
            
            // Show loading on the button
            button.innerHTML = '<i class="fas fa-spinner animate-spin text-xs"></i>';
            
            // Remove the last AI message
            messages[messages.length - 1].remove();
            
            // Fetch new response
            fetchAnswer(lastUserMessage);
        }

        // Add ripple effects to buttons
        function addRippleEffects() {
            const buttons = document.querySelectorAll('button');
            buttons.forEach(button => {
                button.addEventListener('click', createRipple);
            });
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
            
            // Initialize status
            document.getElementById('statusText').textContent = "Ready";
            
            // Add ripple effects
            addRippleEffects();
            
            // Initialize particles
            initParticles();
            
            // Add glow hover effect
            const glowButtons = document.querySelectorAll('.glow-hover');
            glowButtons.forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.classList.add('glow');
                });
                btn.addEventListener('mouseleave', () => {
                    btn.classList.remove('glow');
                });
            });
        });
