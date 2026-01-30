// --- CONFIGURATION ---
const CONFIG = {
  broker: "broker.emqx.io",
  port: 8084,
  baseTopic: "termos/v3/",
  aiKey: "YOUR_ZAI_API_KEY",
  rooms: {
    "lobby": { topic: "lobby", color: "#00ff00" },
    "lounge": { topic: "lounge", color: "#00ffff" },
    "radio": { topic: "radio", color: "#ff00ff" }
  }
};
let currentRoom = "lobby";
let client, isConnected = false;
const USER_ID = "USR_" + Math.random().toString(36).substr(2, 6);

// --- GAMIFICATION ---
const GAMIFICATION = {
  xp: 0,
  level: 1,
  addXP: (amount) => {
    GAMIFICATION.xp += amount;
    log(`XP GAINED: +${amount} (TOTAL: ${GAMIFICATION.xp})`, 'system');
    localStorage.setItem('termos_xp', GAMIFICATION.xp);
    checkLevelUp();
  }
};
const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 1000];
function checkLevelUp() {
  let newLevel = GAMIFICATION.level;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (GAMIFICATION.xp >= LEVEL_THRESHOLDS[i]) {
      newLevel = i + 1;
      break;
    }
  }
  if (newLevel > GAMIFICATION.level) {
    GAMIFICATION.level = newLevel;
    log(`🎉 LEVEL UP! You are now Level ${GAMIFICATION.level}`, 'system');
    // TODO: Unlock avatars, fire animation, etc.
  }
}
// Load XP from localStorage
if (localStorage.getItem('termos_xp')) {
  GAMIFICATION.xp = parseInt(localStorage.getItem('termos_xp'), 10);
  checkLevelUp();
}

// --- UI ELEMENTS ---
const screen = document.getElementById('screen');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const micBtn = document.getElementById('mic');
const roomLabel = document.getElementById('room-label');

// --- LOGGING ---
function log(msg, type = 'chat') {
  const div = document.createElement('div');
  div.className = type;
  div.innerHTML = msg;
  screen.appendChild(div);
  screen.scrollTop = screen.scrollHeight;
}

// --- MQTT CONNECTION ---
function initMQTT() {
  client = new Paho.MQTT.Client(CONFIG.broker, CONFIG.port, USER_ID);
  client.onConnectionLost = () => {
    isConnected = false;
    log('MQTT disconnected. Retrying...', 'system');
    setTimeout(initMQTT, 2000);
  };
  client.onMessageArrived = (msg) => {
    const data = safeParse(msg.payloadString);
    if (data && data.msg) {
      log(`<b>${data.id}</b>: ${data.msg}`, data.type || 'chat');
    }
  };
  client.connect({
    useSSL: true,
    onSuccess: () => {
      isConnected = true;
      client.subscribe(CONFIG.baseTopic + currentRoom);
      log('Connected to MQTT!', 'system');
      GAMIFICATION.addXP(5);
    }
  });
}
function safeParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}
initMQTT();

// --- ROOM SWITCHING ---
function joinRoom(roomName) {
  if (client && isConnected && CONFIG.rooms[roomName]) {
    client.unsubscribe(CONFIG.baseTopic + currentRoom);
    currentRoom = roomName;
    client.subscribe(CONFIG.baseTopic + currentRoom);
    log(`ENTERING ROOM: ${roomName.toUpperCase()}`, 'system');
    screen.innerHTML = '';
    roomLabel.textContent = `[${roomName.toUpperCase()}]`;
    document.body.style.background = CONFIG.rooms[roomName].color + "22";
    GAMIFICATION.addXP(5);
  } else {
    log('Room does not exist.', 'system');
  }
}
// URL Routing
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('room')) joinRoom(params.get('room'));
});

// --- INPUT HANDLING ---
function processInput(text) {
  if (!text.trim()) return;
  if (text.startsWith('/ai ')) {
    const instruction = text.substring(4);
    processAIRequest(instruction);
    return;
  }
  if (text.startsWith('/join ')) {
    const roomName = text.split(' ')[1];
    joinRoom(roomName);
    return;
  }
  // ...add more commands here
  // Default: Chat
  sendMessage(text);
  GAMIFICATION.addXP(1);
}
sendBtn.onclick = () => { processInput(input.value); input.value = ''; };
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') { processInput(input.value); input.value = ''; }
});

// --- SEND MESSAGE ---
function sendMessage(text) {
  if (!client || !isConnected) return log('Not connected.', 'system');
  const msg = new Paho.MQTT.Message(JSON.stringify({
    id: USER_ID,
    msg: text,
    type: 'chat'
  }));
  msg.destinationName = CONFIG.baseTopic + currentRoom;
  client.send(msg);
}

// --- AI INTEGRATION ---
function processAIRequest(instruction) {
  log(`<i>AI processing: ${instruction}</i>`, 'ai-msg');
  // Simulate AI response
  setTimeout(() => {
    const aiResponse = `AI (${currentRoom}): [Simulated] ${instruction}`;
    log(aiResponse, 'ai-msg');
    // Optionally: executeAIAction({type: 'music'}) etc.
  }, 1000);
}
function executeAIAction(action) {
  switch(action.type) {
    case 'music':
      playRadio();
      log("AI INITIALIZED RADIO STREAM", "ai-msg");
      break;
    case 'color':
      document.documentElement.style.setProperty('--term-green', action.value);
      break;
    case 'mqtt':
      sendMessage(action.text);
      break;
    // Add more as needed
  }
}
function playRadio() {
  log("🎵 Playing radio... [Not implemented]", "system");
}

// --- VOICE INTERFACE ---
let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.onresult = (event) => {
    input.value = event.results[0][0].transcript;
  };
  micBtn.onclick = () => recognition.start();
} else {
  micBtn.style.display = 'none';
}

// --- OPTIONAL: AI Speech Output ---
// function speak(text) {
//   if ('speechSynthesis' in window) {
//     const utter = new SpeechSynthesisUtterance(text);
//     window.speechSynthesis.speak(utter);
//   }
// }
