// src/js/ui.js
import * as webrtc from './webrtc.js';

// DOM Elements
const views = {
  nickname: document.getElementById('nickname-view'),
  initial: document.getElementById('initial-view'),
  codeExchange: document.getElementById('code-exchange-view'),
  chat: document.getElementById('chat-view'),
};
const nicknameInput = document.getElementById('nickname-input');
const startChatBtn = document.getElementById('start-chat-btn');
const nicknameDisplay = document.getElementById('nickname-display');
const createSessionBtn = document.getElementById('create-session-btn');
const joinSessionBtn = document.getElementById('join-session-btn');
const codeExchangeTitle = document.getElementById('code-exchange-title');
const codeExchangeInstructions = document.getElementById('code-exchange-instructions');
const codeOutput = document.getElementById('code-output');
const copyCodeBtn = document.getElementById('copy-code-btn');
const codeInput = document.getElementById('code-input');
const submitCodeBtn = document.getElementById('submit-code-btn');
const cancelBtn = document.getElementById('cancel-btn');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const connectionStatus = document.getElementById('connection-status');

let nickname = '';
let currentMode = ''; // 'create' or 'join'

function showView(viewName) {
  Object.values(views).forEach(view => view.classList.remove('active'));
  views[viewName].classList.add('active');
}

function addMessageToChat(message, type) {
  // Sanitize content to prevent XSS
  const contentDiv = document.createElement('div');
  contentDiv.textContent = message.payload.content;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  
  if (type !== 'system') {
    const nicknameSpan = document.createElement('span');
    nicknameSpan.className = 'nickname';
    nicknameSpan.textContent = message.payload.nickname;
    messageDiv.appendChild(nicknameSpan);
  }
  
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateConnectionStatus(state) {
    connectionStatus.textContent = state.charAt(0).toUpperCase() + state.slice(1);
}

function setupWebRTCCallbacks() {
  webrtc.initialize(nickname, {
    onConnectionStateChange: (state) => {
      updateConnectionStatus(state);
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        addMessageToChat({ payload: { content: `Connection ${state}. Please refresh to start a new chat.` } }, 'system');
      }
    },
    onDataChannelOpen: () => {
      showView('chat');
      addMessageToChat({ payload: { content: 'Connection established! You can now chat.' } }, 'system');
    },
    onMessageReceived: (message, type) => {
      addMessageToChat(message, type);
    },
  });
}

async function handleCreateSession() {
  currentMode = 'create';
  showView('codeExchange');
  codeExchangeTitle.textContent = 'Create New Chat';
  codeExchangeInstructions.textContent = 'Copy this code and send it to your peer.';
  submitCodeBtn.textContent = 'Connect';
  submitCodeBtn.disabled = false;
  codeInput.placeholder = 'Paste the response code from your peer here...';

  try {
    const offerCode = await webrtc.createOfferAndGetCode();
    codeOutput.value = offerCode;
  } catch (error) {
    console.error('Error creating offer:', error);
    addMessageToChat({ payload: { content: 'Failed to create session. See console for details.' } }, 'system');
    showView('initial');
  }
}

function handleJoinSession() {
  currentMode = 'join';
  showView('codeExchange');
  codeExchangeTitle.textContent = 'Join Existing Chat';
  codeExchangeInstructions.textContent = 'Paste the code from your peer below.';
  codeOutput.style.display = 'none';
  copyCodeBtn.style.display = 'none';
  codeInput.placeholder = 'Paste the connection code here...';
  submitCodeBtn.textContent = 'Generate Response Code';
  submitCodeBtn.disabled = false;
}

async function handleSubmitCode() {
  const code = codeInput.value.trim();
  if (!code) return;

  submitCodeBtn.disabled = true;
  submitCodeBtn.textContent = 'Processing...';

  try {
    if (currentMode === 'create') {
      await webrtc.receiveAnswer(code);
      // Connection will be established via onDataChannelOpen callback
    } else if (currentMode === 'join') {
      const answerCode = await webrtc.receiveOfferAndCreateAnswerCode(code);
      codeOutput.value = answerCode;
      codeOutput.style.display = 'block';
      copyCodeBtn.style.display = 'block';
      codeExchangeInstructions.textContent = 'Success! Copy this response code and send it back to your peer.';
      codeInput.value = '';
      codeInput.placeholder = 'Waiting for connection...';
      codeInput.disabled = true;
      submitCodeBtn.style.display = 'none';
    }
  } catch (error) {
    console.error('Error processing code:', error);
    alert('Invalid code or connection failed. Please try again.');
    resetToInitialView();
  }
}

function handleSendMessage() {
  const content = messageInput.value.trim();
  if (content) {
    webrtc.sendMessage(content);
    messageInput.value = '';
  }
}

function resetToInitialView() {
    webrtc.closeConnection();
    showView('initial');
    currentMode = '';
    codeOutput.value = '';
    codeInput.value = '';
    codeOutput.style.display = 'block';
    copyCodeBtn.style.display = 'block';
    submitCodeBtn.style.display = 'block';
    codeInput.disabled = false;
    submitCodeBtn.disabled = false;
    updateConnectionStatus('Idle');
}

export function initializeUI() {
  startChatBtn.addEventListener('click', () => {
    const enteredNickname = nicknameInput.value.trim();
    if (enteredNickname) {
      nickname = enteredNickname;
      nicknameDisplay.textContent = nickname;
      setupWebRTCCallbacks();
      showView('initial');
    } else {
      alert('Please enter a nickname.');
    }
  });

  createSessionBtn.addEventListener('click', handleCreateSession);
  joinSessionBtn.addEventListener('click', handleJoinSession);
  submitCodeBtn.addEventListener('click', handleSubmitCode);
  
  cancelBtn.addEventListener('click', resetToInitialView);

  copyCodeBtn.addEventListener('click', () => {
    codeOutput.select();
    document.execCommand('copy');
    alert('Code copied to clipboard!');
  });

  sendMessageBtn.addEventListener('click', handleSendMessage);
  messageInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  });
}
