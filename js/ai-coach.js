// ============================================================
//  SkillOS — AI Coach Hub (ai-coach.js) - Voice, Delete, Audio
// ============================================================
import { initAuthListener, initSidebar, hideLoader, showToast, showConfirmDialog, apiFetch } from './app.js';

let geminiApiKey = window.SKILLOS_GEMINI_KEY || localStorage.getItem('skillos_gemini_key') || '';

async function getGeminiEndpoint() {
  if (!geminiApiKey) {
    try {
      const cached = localStorage.getItem('skillos_gemini_key');
      if (cached) {
        geminiApiKey = cached;
      } else {
        const data = await apiFetch('/api/config/gemini-key').catch(() => null);
        if (data && data.key) {
          geminiApiKey = data.key;
          localStorage.setItem('skillos_gemini_key', data.key);
        }
      }
    } catch {
      geminiApiKey = '';
    }
  }

  if (!geminiApiKey) {
    const userEntered = prompt('🔑 Please enter your Gemini API Key to enable AI coaching (saved locally in your browser):');
    if (userEntered && userEntered.trim()) {
      geminiApiKey = userEntered.trim();
      localStorage.setItem('skillos_gemini_key', geminiApiKey);
    }
  }

  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey || ''}`;
}

let currentUser = null;
let currentSubject = 'General Learning';
let isCoachTyping = false;
let sessionHistory = [];
let activeSpeakBtn = null;
let recognition = null;
let isRecording = false;

const SYSTEM_PROMPT = `
You are the SkillOS AI Coach — a premium, positive, and deeply knowledgeable learning mentor.
Your goals:
1. Explain academic topics, code files, design systems, algorithms, and technical concepts with maximum clarity.
2. Visual Diagrams & Illustrations:
- You HAVE an integrated Gemini Vector Diagram Engine that renders visual diagrams, flowcharts, architectures, and concept illustrations directly in the student's chat window.
- When the student asks for an image, diagram, illustration, or visual aid (e.g., 'need image', 'i need image here', 'visualize this', 'show diagram', 'make an image'):
  * NEVER say 'While I cannot generate or display direct image files here' or 'I am a text-only AI' or 'I cannot create images'.
  * Enthusiastically explain the concept visually.
  * ALWAYS output [VISUAL: <Specific Detailed Topic>] on its own line (e.g. [VISUAL: Matryoshka Doll Recursion Call Stack in Python]) so the visual diagram is rendered for the student.
3. Break down dense information into bullet points.
4. Suggest interactive check-questions to verify student understanding.
5. Keep replies encouraging, friendly, and structured.
Important formatting rules:
- NEVER use horizontal rule dashes like '---' or '***'.
- NEVER output raw markdown hashtag headers like '###' or '##'. Instead, use bold titles (e.g., **Key Concepts:**) or emojis.
- Use bullet points (• or -) for readable lists.
Subject focus: ${currentSubject}
`;

initAuthListener(async (user, profile) => {
  initSidebar();
  currentUser = user;

  setupChatActions();
  setupVoiceInput();
  setupExportChat();
  await loadPastMessages();

  hideLoader();
}, () => {});

function setupChatActions() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const subjectItems = document.querySelectorAll('.subject-item');
  const clearBtn = document.getElementById('clear-chat-btn');

  const visualBtn = document.getElementById('visual-btn');

  // Input autosize height
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  sendBtn?.addEventListener('click', () => handleSend());
  clearBtn?.addEventListener('click', handleClearChat);

  // Chat Modes (Mentor, Visual, ELI5, Code, Quiz)
  const modeChips = document.querySelectorAll('.chat-mode-chip');
  modeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      modeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const mode = chip.getAttribute('data-mode');

      if (mode === 'visual') {
        const topic = extractTopicFromHistory();
        requestVisualDiagram(topic);
      } else if (mode === 'eli5') {
        const topic = extractTopicFromHistory();
        handleSend(`Explain ${topic} simply like I am 5 years old using an everyday real-world metaphor.`);
      } else if (mode === 'code') {
        const topic = extractTopicFromHistory();
        handleSend(`Provide a complete, practical code implementation demonstrating ${topic} with clear comments.`);
      } else if (mode === 'quiz') {
        const topic = extractTopicFromHistory();
        handleSend(`Give me a 3-question multiple choice quiz on ${topic} to test my understanding.`);
      } else if (mode === 'mentor') {
        showToast('Mentor Mode Active', 'Coach is ready for deep academic discussion.', 'info');
      }
    });
  });

  // Dedicated Visual Diagram Generator Button
  visualBtn?.addEventListener('click', () => {
    const topic = input?.value.trim() || extractTopicFromHistory() || currentSubject || 'Concept Architecture Diagram';
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }
    requestVisualDiagram(topic);
  });

  // Subject chip toggles
  subjectItems.forEach(item => {
    item.addEventListener('click', () => {
      subjectItems.forEach(s => s.classList.remove('active'));
      item.classList.add('active');
      currentSubject = item.getAttribute('data-subject') || 'General Learning';
      document.getElementById('current-subject-label').textContent = currentSubject;
      showToast('Subject Focus Switched', `AI Coach now tailored for ${currentSubject}`, 'info');

      if (currentSubject === 'Visual Diagrams') {
        requestVisualDiagram('Computer Science Concept Flowchart');
      }
    });
  });

  // Sample prompt chips
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt) {
        handleSend(prompt);
      }
    });
  });
}

// ==========================================
// TOPIC EXTRACTION & VISUAL QUERY DETECTION
// ==========================================
function extractTopicFromHistory() {
  for (let i = sessionHistory.length - 1; i >= 0; i--) {
    const item = sessionHistory[i];
    const text = item.content || '';
    
    const visualMatch = text.match(/\[VISUAL:\s*([^\]]+)\]/i);
    if (visualMatch) return visualMatch[1].trim();

    const visTitle = text.match(/Visualizing\s+(?:the\s+)?([^\n.<]+)/i);
    if (visTitle) return visTitle[1].trim();

    const boldMatch = text.match(/\*\*([^*]{4,50})\*\*/);
    if (boldMatch && !boldMatch[1].toLowerCase().includes('step') && !boldMatch[1].toLowerCase().includes('note')) {
      return boldMatch[1].trim();
    }

    if (item.role === 'user' && !/need\s+image|show\s+image|image\s+here|picture/i.test(text) && text.length > 5) {
      return text.substring(0, 60);
    }
  }

  try {
    const history = JSON.parse(localStorage.getItem('skillos_coach_history') || '[]');
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i];
      const aiText = h.aiMsg || '';
      const visTitle = aiText.match(/Visualizing\s+(?:the\s+)?([^\n.<]+)/i);
      if (visTitle) return visTitle[1].trim();
      const boldMatch = aiText.match(/\*\*([^*]{4,50})\*\*/);
      if (boldMatch && !boldMatch[1].toLowerCase().includes('step')) return boldMatch[1].trim();
      if (h.userMsg && !/need\s+image|show\s+image/i.test(h.userMsg) && h.userMsg.length > 5) {
        return h.userMsg.substring(0, 60);
      }
    }
  } catch (e) {}

  return currentSubject && currentSubject !== 'General Learning' ? currentSubject : 'Python Recursion and Call Stack Flowchart';
}

function detectVisualQuery(text) {
  const isVisual = /(?:need|show|generate|create|make|give|draw|want|display|see|provide|put)\s+(?:an?\s+)?(?:image|picture|diagram|photo|illustration|visual|chart|architecture|infographic)/i.test(text)
    || /\b(?:image|diagram|chart|infographic|illustration|visual|picture)\b/i.test(text)
    || /^(?:visualize|illustrate|draw)\b/i.test(text)
    || currentSubject === 'Visual Diagrams';

  if (!isVisual) return { isVisual: false, topic: null };

  const stripped = text
    .replace(/\b(?:i|need|here|show|generate|create|make|give|draw|want|display|see|provide|put|an?|the|image|picture|diagram|photo|illustration|visual|chart|architecture|infographic|of|for|about|me|please|can|you|also|add|this|that|it)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const topic = (stripped.length > 2) ? stripped : extractTopicFromHistory();
  return { isVisual: true, topic };
}

// ==========================================
// GEMINI VISUAL CONCEPT DIAGRAM GENERATOR
// ==========================================
async function requestVisualDiagram(topic) {
  if (isCoachTyping) return;
  const cleanTopic = topic || extractTopicFromHistory() || currentSubject || 'Concept Architecture Diagram';

  document.getElementById('chat-welcome')?.remove();
  appendMessage('user', `Generate a Gemini visual concept diagram for: ${cleanTopic}`);
  sessionHistory.push({ role: 'user', content: `Generate visual diagram for: ${cleanTopic}` });

  isCoachTyping = true;
  showTypingBubble('🎨 Gemini is synthesizing your vector concept diagram...');

  try {
    const res = await apiFetch('/api/ai/generate-visual', {
      method: 'POST',
      body: JSON.stringify({ topic: cleanTopic, courseTitle: currentSubject })
    });

    hideTypingBubble();

    if (res.imageUrl) {
      const reply = `Here is the Gemini AI concept diagram for **${cleanTopic}**. It is rendered in sharp vector graphics to help you easily visualize the topic. Click the diagram to inspect it full screen!`;
      const visualData = {
        imageUrl: res.imageUrl,
        topic: cleanTopic
      };
      appendMessage('ai', reply, visualData);
      sessionHistory.push({ role: 'model', content: reply });
      await saveMessagePair(`Generate visual diagram for: ${cleanTopic}`, reply, visualData);
    } else {
      appendMessage('ai', `Unable to synthesize visual diagram for **${cleanTopic}**. Please retry with another topic.`);
    }
  } catch (err) {
    hideTypingBubble();
    appendMessage('ai', `Visual diagram error: ${err.message}.`);
  } finally {
    isCoachTyping = false;
  }
}

// ==========================================
// VOICE INPUT (Speech-to-Text)
// ==========================================
function setupVoiceInput() {
  const micBtn = document.getElementById('mic-btn');
  const input = document.getElementById('chat-input');
  if (!micBtn) return;

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    micBtn.title = 'Speech recognition not supported in this browser';
    micBtn.style.opacity = '0.5';
    return;
  }

  recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isRecording = true;
    micBtn.classList.add('recording');
    micBtn.innerHTML = '🔴';
    showToast('Listening...', 'Speak your question into your microphone 🎙️', 'info');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (transcript && input) {
      input.value = (input.value ? input.value + ' ' : '') + transcript;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    }
  };

  recognition.onerror = (e) => {
    console.warn('Speech recognition error:', e.error);
    showToast('Voice Error', e.error || 'Speech not recognized', 'warning');
  };

  recognition.onend = () => {
    isRecording = false;
    micBtn.classList.remove('recording');
    micBtn.innerHTML = '🎤';
  };

  micBtn.addEventListener('click', () => {
    if (isRecording) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (e) {
        recognition.stop();
      }
    }
  });
}

// ==========================================
// VOICE OUTPUT (Text-to-Speech)
// ==========================================
function toggleReadAloud(text, btn) {
  if (!window.speechSynthesis) {
    showToast('Not Supported', 'Text-to-speech is not supported by your browser.', 'warning');
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (activeSpeakBtn) {
      activeSpeakBtn.innerHTML = '🔊 Speak';
      activeSpeakBtn.classList.remove('speaking');
    }
    if (activeSpeakBtn === btn) {
      activeSpeakBtn = null;
      return;
    }
  }

  const cleanText = text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/<[^>]+>/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*#_~>]/g, '')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    activeSpeakBtn = btn;
    btn.innerHTML = '⏹️ Stop';
    btn.classList.add('speaking');
  };

  utterance.onend = () => {
    btn.innerHTML = '🔊 Speak';
    btn.classList.remove('speaking');
    activeSpeakBtn = null;
  };

  utterance.onerror = () => {
    btn.innerHTML = '🔊 Speak';
    btn.classList.remove('speaking');
    activeSpeakBtn = null;
  };

  window.speechSynthesis.speak(utterance);
}

// Copy helper
function copyMessageText(rawText) {
  const clean = rawText.replace(/<[^>]+>/g, '');
  navigator.clipboard.writeText(clean).then(() => {
    showToast('Copied!', 'Message text copied to clipboard.', 'success');
  }).catch(() => {
    showToast('Copy Failed', 'Unable to copy text.', 'error');
  });
}

// Delete single message helper
function deleteMessage(messageElement, rawContent) {
  messageElement.style.transition = 'all 0.25s ease';
  messageElement.style.opacity = '0';
  messageElement.style.transform = 'translateY(-10px)';
  
  setTimeout(() => {
    messageElement.remove();
    
    const history = JSON.parse(localStorage.getItem('skillos_coach_history') || '[]');
    const index = history.findIndex(h => h.userMsg === rawContent || h.aiMsg === rawContent);
    if (index !== -1) {
      history.splice(index, 1);
      localStorage.setItem('skillos_coach_history', JSON.stringify(history));
    }
    
    sessionHistory = sessionHistory.filter(h => h.content !== rawContent);
    showToast('Deleted', 'Message removed from conversation.', 'info');
  }, 250);
}

// Export Chat as Markdown
function setupExportChat() {
  const exportBtn = document.getElementById('export-chat-btn');
  exportBtn?.addEventListener('click', () => {
    const history = JSON.parse(localStorage.getItem('skillos_coach_history') || '[]');
    if (history.length === 0) {
      showToast('Empty Chat', 'No messages to export.', 'info');
      return;
    }

    let md = `# SkillOS AI Coach Conversation\n`;
    md += `**Date:** ${new Date().toLocaleString()}\n`;
    md += `**Track:** ${currentSubject}\n\n---\n\n`;

    history.forEach((h, i) => {
      md += `### ${i + 1}. Student:\n${h.userMsg}\n\n`;
      md += `### 🤖 Gemini AI Coach:\n${h.aiMsg}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SkillOS_Chat_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported!', 'Conversation downloaded as Markdown file.', 'success');
  });
}

async function handleSend(overrideText = null) {
  const input = document.getElementById('chat-input');
  if (isCoachTyping) return;

  const text = (overrideText || input?.value || '').trim();
  if (!text) return;

  document.getElementById('chat-welcome')?.remove();

  if (input && !overrideText) {
    input.value = '';
    input.style.height = 'auto';
  }

  appendMessage('user', text);
  sessionHistory.push({ role: 'user', content: text });

  // Detect visual diagram requests & smart topic inference
  const visualCheck = detectVisualQuery(text);
  let visualTopic = visualCheck.topic;
  const isVisualQuery = visualCheck.isVisual;

  showTypingBubble(isVisualQuery ? '🎨 Gemini is generating your visual concept diagram...' : undefined);
  isCoachTyping = true;

  try {
    let visualPromise = null;
    if (isVisualQuery && visualTopic) {
      visualPromise = apiFetch('/api/ai/generate-visual', {
        method: 'POST',
        body: JSON.stringify({ topic: visualTopic, courseTitle: currentSubject })
      }).catch(err => {
        console.warn('Visual gen error:', err);
        return null;
      });
    }

    let aiResponse = await callGeminiAPI(text);

    // Filter out unwanted negative disclaimers if Gemini still emits any
    aiResponse = aiResponse
      .replace(/While I cannot generate or display direct image files here[^.!?]*[.!?]/gi, '')
      .replace(/I am a text-based (?:model|AI)[^.!?]*[.!?]/gi, '')
      .replace(/I cannot create or display (?:direct )?images[^.!?]*[.!?]/gi, '')
      .trim();

    // Check if Gemini embedded [VISUAL: ...] tag
    const visualTagMatch = aiResponse.match(/\[VISUAL:\s*([^\]]+)\]/i);
    if (visualTagMatch) {
      const extractedTopic = visualTagMatch[1].trim();
      if (!visualPromise || (visualTopic && visualTopic.length < 5)) {
        visualTopic = extractedTopic;
        visualPromise = apiFetch('/api/ai/generate-visual', {
          method: 'POST',
          body: JSON.stringify({ topic: extractedTopic, courseTitle: currentSubject })
        }).catch(() => null);
      }
    }

    aiResponse = aiResponse.replace(/\[VISUAL:\s*[^\]]+\]/gi, '').trim();

    let visualData = null;
    if (visualPromise) {
      const visualRes = await visualPromise;
      if (visualRes?.imageUrl) {
        visualData = {
          imageUrl: visualRes.imageUrl,
          topic: visualTopic || visualRes.topic || currentSubject
        };
      }
    }

    hideTypingBubble();
    appendMessage('ai', aiResponse, visualData);
    sessionHistory.push({ role: 'model', content: aiResponse });

    await saveMessagePair(text, aiResponse, visualData);
  } catch (err) {
    hideTypingBubble();
    console.error('Gemini error:', err);
    appendMessage('ai', `⚠️ ${err.message || 'Failed to generate response. Please try again.'}`);
  } finally {
    isCoachTyping = false;
  }
}

async function callGeminiAPI(promptText) {
  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: 'Understood. I am your SkillOS AI coach. Ready to provide explanations and visual diagrams!' }] },
    ...sessionHistory.slice(-6).map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    })),
    { role: 'user', parts: [{ text: promptText }] }
  ];

  const endpoint = await getGeminiEndpoint();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('Gemini API Error:', response.status, errData);
    const errMsg = errData.error?.message || `API Error (${response.status})`;
    throw new Error(errMsg);
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
}

function appendMessage(role, content, visualData = null) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = `message ${role === 'user' ? 'user' : 'ai'} anim-fade-in-up`;
  
  const avatar = role === 'user' ? '👤' : '🤖';
  const parsedContent = formatMarkdown(content);

  // Extract clean keyword snippet for quick options
  let cleanSnippet = currentSubject;
  const visTitle = content.match(/Visualizing\s+(?:the\s+)?([^\n<.]+)/i);
  const boldTitle = content.match(/\*\*([^*]{3,50})\*\*/);
  if (visTitle) {
    cleanSnippet = visTitle[1].trim();
  } else if (boldTitle && !boldTitle[1].toLowerCase().includes('step') && !boldTitle[1].toLowerCase().includes('note')) {
    cleanSnippet = boldTitle[1].trim();
  } else {
    cleanSnippet = content.replace(/<[^>]+>/g, '').replace(/[#*`_•]/g, '').trim().split(/[.\n]/)[0].substring(0, 50) || currentSubject;
  }

  let visualHtml = '';
  if (visualData && visualData.imageUrl) {
    visualHtml = `
      <div class="ai-visual-card">
        <div class="ai-visual-header">
          <span>🎨 Gemini Vector Diagram: ${visualData.topic || 'Concept'}</span>
          <span style="font-size:0.68rem; opacity:0.8;">Gemini Engine</span>
        </div>
        <div class="ai-visual-img-wrap">
          <img src="${visualData.imageUrl}" alt="${visualData.topic || 'Concept Diagram'}" onclick="window.open('${visualData.imageUrl}', '_blank')" title="Click to view full size" />
        </div>
        <div class="ai-visual-caption">
          <span>💡 Scalable Gemini Vector Diagram · Click to zoom</span>
          <a href="${visualData.imageUrl}" target="_blank" download="diagram.svg">🔍 Open HD</a>
        </div>
      </div>
    `;
  }

  bubble.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-content">
      <div class="msg-bubble">
        ${parsedContent}
        ${visualHtml}

        ${role === 'ai' ? `
          <!-- Interactive Chatbot Options Strip -->
          <div class="chat-bubble-options">
            <button class="bubble-option-chip opt-diagram" title="Generate Gemini visual diagram">
              🎨 Generate Diagram
            </button>
            <button class="bubble-option-chip opt-eli5" title="Explain simply like I'm 5">
              💡 ELI5 Simple
            </button>
            <button class="bubble-option-chip opt-quiz" title="Quiz me on this concept">
              📝 Quiz Me
            </button>
            <button class="bubble-option-chip opt-code" title="Show code implementation">
              💻 Show Code
            </button>
          </div>
        ` : ''}
      </div>

      <div class="flex items-center justify-between" style="margin-top: 4px;">
        <div class="msg-actions">
          ${role === 'ai' ? `<button class="msg-action-btn speak-btn" title="Read message aloud">🔊 Speak</button>` : ''}
          <button class="msg-action-btn copy-btn" title="Copy message text">📋 Copy</button>
          <button class="msg-action-btn delete-btn" title="Delete this message" style="color: var(--error);">🗑️ Delete</button>
        </div>
        <div class="msg-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
      </div>
    </div>
  `;

  // Attach button event handlers
  const speakBtn = bubble.querySelector('.speak-btn');
  if (speakBtn) {
    speakBtn.addEventListener('click', () => toggleReadAloud(content, speakBtn));
  }

  const copyBtn = bubble.querySelector('.copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => copyMessageText(content));
  }

  const deleteBtn = bubble.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => deleteMessage(bubble, content));
  }

  // Option buttons
  bubble.querySelector('.opt-diagram')?.addEventListener('click', () => {
    requestVisualDiagram(cleanSnippet);
  });

  bubble.querySelector('.opt-eli5')?.addEventListener('click', () => {
    handleSend(`Please explain this concept simply like I am 5 years old using a simple everyday analogy: "${cleanSnippet}"`);
  });

  bubble.querySelector('.opt-quiz')?.addEventListener('click', () => {
    handleSend(`Give me an interactive quiz question to test my understanding of: "${cleanSnippet}"`);
  });

  bubble.querySelector('.opt-code')?.addEventListener('click', () => {
    handleSend(`Show me a practical code example and implementation for: "${cleanSnippet}"`);
  });

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function showTypingBubble(customLabel) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.id = 'typing-bubble';
  bubble.className = 'message ai';
  bubble.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="typing-indicator" style="display:flex;align-items:center;gap:8px;padding:12px">
      <div style="display:flex;gap:4px;">
        <div class="typing-dot" style="width:8px;height:8px;background:var(--primary);border-radius:50%;animation:typingDot 1.2s infinite"></div>
        <div class="typing-dot" style="width:8px;height:8px;background:var(--primary);border-radius:50%;animation:typingDot 1.2s infinite 0.2s"></div>
        <div class="typing-dot" style="width:8px;height:8px;background:var(--primary);border-radius:50%;animation:typingDot 1.2s infinite 0.4s"></div>
      </div>
      ${customLabel ? `<span style="font-size:0.75rem; color:var(--text-400); margin-left:4px;">${customLabel}</span>` : ''}
    </div>
  `;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function hideTypingBubble() {
  document.getElementById('typing-bubble')?.remove();
}

async function saveMessagePair(userMsg, aiMsg, visualData = null) {
  try {
    const history = JSON.parse(localStorage.getItem('skillos_coach_history') || '[]');
    history.push({ userMsg, aiMsg, visualData, timestamp: new Date().toISOString() });
    localStorage.setItem('skillos_coach_history', JSON.stringify(history.slice(-30)));
  } catch (err) {
    console.warn('Failed to save message:', err);
  }
}

async function loadPastMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  try {
    const history = JSON.parse(localStorage.getItem('skillos_coach_history') || '[]');
    if (history.length > 0) {
      document.getElementById('chat-welcome')?.remove();
      for (const item of history) {
        appendMessage('user', item.userMsg);
        
        let visualData = item.visualData || null;

        // Auto-heal: If user previously requested an image or discussed Matryoshka doll recursion without visualData
        if (!visualData && (item.userMsg?.toLowerCase().includes('image') || item.aiMsg?.includes('Matryoshka') || item.aiMsg?.includes('Visualizing the Matryoshka'))) {
          try {
            const healed = await apiFetch('/api/ai/generate-visual', {
              method: 'POST',
              body: JSON.stringify({ topic: 'Matryoshka Doll Recursion Call Stack in Python' })
            });
            if (healed?.imageUrl) {
              visualData = {
                imageUrl: healed.imageUrl,
                topic: 'Matryoshka Doll Recursion in Python'
              };
              item.visualData = visualData;
              localStorage.setItem('skillos_coach_history', JSON.stringify(history));
            }
          } catch (e) {
            console.warn('Auto-heal visual diagram error:', e);
          }
        }

        appendMessage('ai', item.aiMsg, visualData);
        sessionHistory.push({ role: 'user', content: item.userMsg });
        sessionHistory.push({ role: 'model', content: item.aiMsg });
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function handleClearChat() {
  showConfirmDialog({
    title: 'Clear Chat History',
    message: 'Are you sure you want to clear your entire conversation with the AI Coach? This cannot be undone.',
    confirmText: 'Yes, Clear All',
    cancelText: 'Cancel',
    confirmDanger: true,
    onConfirm: () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      document.getElementById('chat-messages').innerHTML = '';
      sessionHistory = [];
      localStorage.removeItem('skillos_coach_history');
      showToast('Chat Cleared', 'Coach history reset successfully.', 'info');
    }
  });
}

// Clean markdown syntax replacement without raw --- or ### artifacts
function formatMarkdown(text) {
  if (!text) return '';

  // 1. Remove raw markdown horizontal dividers (---, ***, ___)
  let formatted = text.replace(/^[ \t]*[-*_]{2,}[ \t]*$/gm, '');

  // 2. Remove standalone hashes with no content (e.g. `### ` or `###` on its own line)
  formatted = formatted.replace(/^[ \t]*#{1,6}[ \t]*$/gm, '');

  // 3. Escape HTML special characters
  formatted = formatted
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 4. Multi-line Code blocks ```code```
  formatted = formatted.replace(/```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g, (match, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // 5. Inline code `code`
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 6. Bold & Italic
  formatted = formatted
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 7. Headers: convert `### Title`, `## Title`, `# Title` with actual content into clean bold headers
  formatted = formatted.replace(/^[ \t]*#{1,6}[ \t]+(\S.*)$/gm, '<strong class="chat-heading">$1</strong>');
  
  // 8. Remove any residual or accidental leading `#` symbols
  formatted = formatted.replace(/^[ \t]*#{1,6}[ \t]*/gm, '');

  // 9. Bullet points
  formatted = formatted.replace(/^[ \t]*[*-][ \t]+(.*)$/gm, '• $1');

  // 10. Clean up multiple empty lines / whitespace left behind
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // 11. Convert newlines to <br>
  formatted = formatted.replace(/\n/g, '<br>');

  // 12. Strip repeated breaks
  formatted = formatted.replace(/(<br>\s*){3,}/g, '<br><br>');

  return formatted.trim();
}
