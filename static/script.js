// Material Recommendation Agent - Frontend JavaScript

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Session management
let sessionId = generateSessionId();

// DOM elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const resetBtn = document.getElementById('reset-btn');
const statusText = document.getElementById('status-text');
const statusIndicator = document.getElementById('status-indicator');

// n8n webhook config injected from template
const n8nConfig = window.N8N_CONFIG || {
    webhookUrl: 'https://materialrecommend.app.n8n.cloud/webhook/58c45b0a-08c7-42b7-a402-c7b865917b98/chat',
    route: 'general'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkHealth();
    adjustTextareaHeight();
});

function setupEventListeners() {
    // Send button click
    sendBtn.addEventListener('click', sendMessage);

    // Enter key to send (Shift+Enter for new line)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Reset button
    resetBtn.addEventListener('click', resetConversation);

    // Auto-resize textarea and enable/disable send button
    userInput.addEventListener('input', () => {
        adjustTextareaHeight();
        sendBtn.disabled = !userInput.value.trim();
    });
}

function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
}

async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) {
        return;
    }

    // Disable input while processing
    setInputState(false);
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;

    // Show typing indicator
    showTypingIndicator();

    // Update status
    setStatus('thinking', 'Thinking...');

    try {
        // Send to API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        
        const response = await fetch(n8nConfig.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatId: sessionId,
                message: message,
                route: n8nConfig.route
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator();

        // Add response from n8n workflow
        addMessage(data.output || data.response || 'Sorry, I could not understand that.', 'agent');

        setStatus('ready', 'Ready');

    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        
        let errorMessage = 'Sorry, I encountered an error. Please try again.';
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out. The server is taking too long to respond. Please try again.';
        }
        
        addMessage(errorMessage, 'agent');
        setStatus('error', 'Error occurred');
    } finally {
        // Re-enable input
        setInputState(true);
        userInput.focus();
    }
}

function addMessage(content, type) {
    try {
        console.log('Adding message, type:', type, 'length:', content.length);
        const container = chatMessages.querySelector('.max-w-3xl');
        
        if (!container) {
            console.error('Container not found!');
            return;
        }
        
        // Create message wrapper
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex gap-4 message-enter';
        
        if (type === 'user') {
            // User message (right aligned, no avatar)
            messageDiv.className = 'flex gap-4 justify-end message-enter';
            messageDiv.innerHTML = `
                <div class="max-w-[80%] bg-blue-600 rounded-2xl px-4 py-3">
                    <div class="text-white leading-relaxed">${escapeHtml(content)}</div>
                </div>
            `;
        } else {
            // Agent message (left aligned with avatar)
            console.log('Formatting agent message...');
            console.log('Raw content:', content);
            let formattedContent = formatMessage(content);
            console.log('Message formatted, length:', formattedContent ? formattedContent.length : 0);
            console.log('Formatted HTML:', formattedContent.substring(0, 200));
            
            if (!formattedContent || formattedContent.trim() === '') {
                console.error('Formatted content is empty! Using fallback...');
                formattedContent = `<p class="text-gray-100 leading-relaxed">${escapeHtml(content)}</p>`;
            }
            
            console.log('Inserting into DOM...');
            messageDiv.innerHTML = `
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                </div>
                <div class="flex-1 space-y-2">
                    <div class="prose prose-invert max-w-none">
                        ${formattedContent}
                    </div>
                </div>
            `;
        }
    
    container.appendChild(messageDiv);
    console.log('Message added to DOM');
    
    // Scroll to bottom smoothly
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
    });
    console.log('Scrolled to bottom');
    } catch (error) {
        console.error('Error in addMessage:', error);
        // Try to add a simple error message
        alert('Error displaying message. Check console for details.');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMessage(text) {
    try {
        console.log('formatMessage called with text length:', text.length);
        
        // Enhanced formatting for structured material recommendations
        let formatted = text;
        
        // Check if this is a structured recommendation response
        if (formatted.includes('Selected Material:') || formatted.includes('Top Recommended Vendors')) {
            return formatStructuredRecommendation(formatted);
        }
        
        // Apply markdown-style formatting to HTML with Tailwind classes
        // Process line by line to handle different markdown elements
        
        const lines = formatted.split('\n');
        let result = [];
        let inList = false;
        let listType = '';
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const trimmed = line.trim();
            
            // Headers
            if (trimmed.match(/^### /)) {
                if (inList) {
                    result.push(listType === 'ul' ? '</ul>' : '</ol>');
                    inList = false;
                }
                const headerText = escapeHtml(trimmed.replace(/^### /, ''));
                result.push(`<h3 class="text-lg font-semibold text-gray-100 mt-4 mb-2">${headerText}</h3>`);
                continue;
            } else if (trimmed.match(/^## /)) {
                if (inList) {
                    result.push(listType === 'ul' ? '</ul>' : '</ol>');
                    inList = false;
                }
                const headerText = escapeHtml(trimmed.replace(/^## /, ''));
                result.push(`<h2 class="text-xl font-semibold text-gray-100 mt-4 mb-2">${headerText}</h2>`);
                continue;
            } else if (trimmed.match(/^# /)) {
                if (inList) {
                    result.push(listType === 'ul' ? '</ul>' : '</ol>');
                    inList = false;
                }
                const headerText = escapeHtml(trimmed.replace(/^# /, ''));
                result.push(`<h1 class="text-2xl font-bold text-gray-100 mt-4 mb-2">${headerText}</h1>`);
                continue;
            }
            
            // Lists
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                if (!inList || listType !== 'ul') {
                    if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>');
                    result.push('<ul class="list-disc list-inside space-y-2 my-3 text-gray-100">');
                    inList = true;
                    listType = 'ul';
                }
                let itemText = trimmed.substring(2);
                itemText = applyInlineFormatting(itemText);
                result.push(`<li class="leading-relaxed ml-2">${itemText}</li>`);
                continue;
            } else if (trimmed.match(/^\d+\.\s/)) {
                if (!inList || listType !== 'ol') {
                    if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>');
                    result.push('<ol class="list-decimal list-inside space-y-2 my-3 text-gray-100">');
                    inList = true;
                    listType = 'ol';
                }
                let itemText = trimmed.replace(/^\d+\.\s/, '');
                itemText = applyInlineFormatting(itemText);
                result.push(`<li class="leading-relaxed ml-2">${itemText}</li>`);
                continue;
            }
            
            // Close list if we're not in a list item anymore
            if (inList && trimmed) {
                result.push(listType === 'ul' ? '</ul>' : '</ol>');
                inList = false;
                listType = '';
            }
            
            // Regular text with inline formatting
            if (trimmed) {
                const formattedLine = applyInlineFormatting(line);
                result.push(`<p class="text-gray-100 leading-relaxed mb-2">${formattedLine}</p>`);
            } else if (!inList) {
                result.push('<br>');
            }
        }
        
        // Close any open list
        if (inList) {
            result.push(listType === 'ul' ? '</ul>' : '</ol>');
        }
        
        formatted = result.join('');
        console.log('formatMessage returning length:', formatted.length);
        return formatted;
        
    } catch (error) {
        console.error('Error formatting message:', error);
        // Fallback to simple text formatting
        const escaped = escapeHtml(text);
        return `<p class="text-gray-100 leading-relaxed">${escaped.replace(/\n/g, '<br>')}</p>`;
    }
}

// Helper function to apply inline formatting (bold, italic, code)
function applyInlineFormatting(text) {
    // Escape HTML first
    text = escapeHtml(text);
    
    // Bold **text**
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
    
    // Italic *text*
    text = text.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-200">$1</em>');
    
    // Code blocks `code`
    text = text.replace(/`([^`]+)`/g, '<code class="bg-dark-hover px-2 py-1 rounded text-blue-400 text-sm font-mono">$1</code>');
    
    return text;
}

function formatStructuredRecommendation(text) {
    try {
        console.log('Formatting structured recommendation');
        let html = '<div class="space-y-4">';
    
        const lines = text.split('\n');
        let currentSection = '';
        let inVendorCard = false;
        let vendorContent = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Main sections - handle both with and without markdown
            if (line.includes('Selected Material:') || line.match(/\*\*Selected Material:\*\*/)) {
                const material = line.replace(/\*\*Selected Material:\*\*/, '').replace('Selected Material:', '').trim();
                html += `
                    <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4">
                        <div class="flex items-center gap-2">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <h3 class="text-lg font-bold text-white">Selected Material</h3>
                        </div>
                        <p class="text-white text-xl font-semibold mt-2">${escapeHtml(material)}</p>
                    </div>`;
            }
            else if (line.includes('Description:') || line.match(/\*\*Description:\*\*/)) {
                const desc = line.replace(/\*\*Description:\*\*/, '').replace('Description:', '').trim();
                html += `<div class="bg-dark-hover rounded-lg p-4">
                            <p class="text-gray-300 leading-relaxed">${escapeHtml(desc)}</p>
                         </div>`;
            }
            else if (line.includes('Cost:') || line.match(/\*\*Cost:\*\*/)) {
                const cost = line.replace(/\*\*Cost:\*\*/, '').replace('Cost:', '').trim();
                html += `<div class="bg-dark-hover rounded-lg p-4 flex items-center justify-between">
                            <span class="text-gray-400">Cost per Unit</span>
                            <span class="text-green-400 text-xl font-bold">${escapeHtml(cost)}</span>
                         </div>`;
            }
            else if (line.includes('Features Matched:') || line.match(/\*\*Features Matched:\*\*/)) {
                html += `<div class="bg-dark-hover rounded-lg p-4">
                            <h4 class="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">Features Matched</h4>
                            <div class="flex flex-wrap gap-2">`;
                // Collect feature tags
                for (let j = i + 1; j < lines.length; j++) {
                    const featureLine = lines[j].trim();
                    if (featureLine.startsWith('#') || featureLine.startsWith('- #')) {
                        const tag = featureLine.replace(/^- /, '').trim();
                        html += `<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-900 text-blue-200 border border-blue-700">
                                    ${escapeHtml(tag)}
                                 </span>`;
                        i = j;
                    } else if (featureLine && !featureLine.startsWith('#') && !featureLine.startsWith('- #')) {
                        break;
                    }
                }
                html += `</div></div>`;
            }
            else if (line.includes('Technical Specifications:') || line.match(/\*\*Technical Specifications:\*\*/)) {
                html += `<div class="bg-dark-hover rounded-lg p-4">
                            <h4 class="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-3">Technical Specifications</h4>
                            <div class="grid grid-cols-2 gap-3">`;
                // Collect specs
                for (let j = i + 1; j < lines.length; j++) {
                    const specLine = lines[j].trim();
                    // Handle both regular and markdown list format
                    const cleanLine = specLine.replace(/^- /, '').trim();
                    if (cleanLine && cleanLine.includes(':') && !cleanLine.startsWith('Top') && !cleanLine.startsWith('##') && !cleanLine.match(/^\d+\./)) {
                        const colonIndex = cleanLine.indexOf(':');
                        const key = cleanLine.substring(0, colonIndex).trim();
                        const value = cleanLine.substring(colonIndex + 1).trim();
                        html += `<div class="bg-dark-bg rounded p-3">
                                    <div class="text-xs text-gray-500 mb-1">${escapeHtml(key)}</div>
                                    <div class="text-gray-100 font-medium">${escapeHtml(value)}</div>
                                 </div>`;
                        i = j;
                    } else if (cleanLine.startsWith('Top') || cleanLine.startsWith('##') || cleanLine.match(/^\d+\./) || cleanLine.match(/^###/)) {
                        i = j - 1;
                        break;
                    }
                }
                html += `</div></div>`;
            }
            else if (line.includes('Top Recommended Vendors') || line.match(/^## Top Recommended Vendors/)) {
                html += `<div class="mt-6">
                            <h3 class="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
                                <svg class="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                                </svg>
                                Top Recommended Vendors
                            </h3>
                            <div class="space-y-3">`;
            }
            else if (line.match(/^### \d+\./) || line.match(/^\d+\./)) {
                // Close previous vendor card if exists
                if (inVendorCard) {
                    html += vendorContent + '</div></div>';
                }
                
                const vendorName = line.replace(/^### \d+\.\s*/, '').replace(/^\d+\.\s*/, '').trim();
                vendorContent = `
                    <div class="bg-dark-hover border border-dark-border rounded-lg p-5 hover:border-blue-500 transition-colors">
                        <div class="flex items-start justify-between mb-4">
                            <h4 class="text-lg font-semibold text-white">${escapeHtml(vendorName)}</h4>
                            <span class="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">Recommended</span>
                        </div>
                        <div class="grid grid-cols-2 gap-3 text-sm">`;
                inVendorCard = true;
            }
            else if (inVendorCard && line.includes(':')) {
                // Handle both "- **Key:** Value" and "Key: Value" formats
                let cleanLine = line.replace(/^- /, '').replace(/\*\*/g, '').trim();
                const colonIndex = cleanLine.indexOf(':');
                if (colonIndex > 0) {
                    const key = cleanLine.substring(0, colonIndex).trim();
                    const value = cleanLine.substring(colonIndex + 1).trim();
                    
                    if (key === 'Final Price') {
                        vendorContent += `
                            <div class="col-span-2 bg-dark-bg rounded p-3 border border-green-700">
                                <div class="text-xs text-green-500 mb-1">${escapeHtml(key)}</div>
                                <div class="text-green-400 text-lg font-bold">${escapeHtml(value)}</div>
                            </div>`;
                    } else if (key === 'Contact') {
                        vendorContent += `
                            <div class="col-span-2 bg-dark-bg rounded p-3">
                                <div class="text-xs text-gray-500 mb-1">${escapeHtml(key)}</div>
                                <a href="mailto:${escapeHtml(value)}" class="text-blue-400 hover:text-blue-300 font-medium">${escapeHtml(value)}</a>
                            </div>`;
                    } else {
                        vendorContent += `
                            <div class="bg-dark-bg rounded p-3">
                                <div class="text-xs text-gray-500 mb-1">${escapeHtml(key)}</div>
                                <div class="text-gray-100 font-medium">${escapeHtml(value)}</div>
                            </div>`;
                    }
                }
            }
        }
    
    // Close last vendor card if exists
    if (inVendorCard) {
        html += vendorContent + '</div></div>';
    }
    
    html += '</div></div></div>';
    console.log('Structured recommendation formatted successfully');
    return html;
    } catch (error) {
        console.error('Error in formatStructuredRecommendation:', error);
        // Fallback to simple formatting
        return `<div class="bg-dark-hover rounded-lg p-4"><pre class="text-gray-100 whitespace-pre-wrap font-mono text-sm">${escapeHtml(text)}</pre></div>`;
    }
}

function showTypingIndicator() {
    const container = chatMessages.querySelector('.max-w-3xl');
    
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'flex gap-4 message-enter';
    typingDiv.innerHTML = `
        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
        </div>
        <div class="flex items-center gap-1 bg-dark-hover rounded-2xl px-4 py-3">
            <span class="w-2 h-2 bg-gray-400 rounded-full typing-indicator"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full typing-indicator"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full typing-indicator"></span>
        </div>
    `;
    
    container.appendChild(typingDiv);
    
    // Scroll to bottom
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
    });
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function setInputState(enabled) {
    userInput.disabled = !enabled;
    sendBtn.disabled = !enabled || !userInput.value.trim();
    
    if (enabled) {
        userInput.focus();
    }
}

function setStatus(state, text) {
    statusText.textContent = text;
    
    // Update status indicator color
    const dot = statusIndicator.querySelector('.w-2');
    if (dot) {
        dot.className = 'w-2 h-2 rounded-full';
        if (state === 'ready') {
            dot.classList.add('bg-green-500');
        } else if (state === 'thinking' || state === 'processing') {
            dot.classList.add('bg-yellow-500');
        } else if (state === 'error') {
            dot.classList.add('bg-red-500');
        } else {
            dot.classList.add('bg-blue-500');
        }
    }
}

async function resetConversation() {
    if (!confirm('Are you sure you want to start a new chat? This will clear all messages.')) {
        return;
    }

    try {
        // Generate new session ID
        sessionId = generateSessionId();

        // Clear chat
        const container = chatMessages.querySelector('.max-w-3xl');
        container.innerHTML = '';
        
        // Add initial message
        const initialMessage = document.createElement('div');
        initialMessage.className = 'flex gap-4 message-enter';
        initialMessage.innerHTML = `
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                </svg>
            </div>
            <div class="flex-1 space-y-2">
                <div class="prose prose-invert max-w-none">
                    <p class="text-gray-100 leading-relaxed">Hello! I'm your Architectural Materials Consultant. I'll help you find the perfect building material for your project.</p>
                    <p class="text-gray-100 leading-relaxed">Let's start by understanding what you need. What is the primary purpose of this material?</p>
                </div>
            </div>
        `;
        container.appendChild(initialMessage);

        // Reset status
        setStatus('ready', 'Ready');

    } catch (error) {
        console.error('Error resetting conversation:', error);
        alert('Failed to reset conversation. Please refresh the page.');
    }
}

async function checkHealth() {
    // For n8n webhook we assume availability; set ready state.
    setStatus('ready', 'Ready');
}
