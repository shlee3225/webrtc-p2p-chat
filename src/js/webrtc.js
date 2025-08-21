// src/js/webrtc.js

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

let peerConnection;
let dataChannel;
let nickname;

let onConnectionStateChangeCallback;
let onDataChannelOpenCallback;
let onMessageReceivedCallback;

/**
 * Initializes the WebRTC module.
 * @param {string} userNickname - The nickname of the local user.
 * @param {object} callbacks - Callbacks for UI updates.
 * @param {function} callbacks.onConnectionStateChange - Called when the peer connection state changes.
 * @param {function} callbacks.onDataChannelOpen - Called when the data channel is successfully opened.
 * @param {function} callbacks.onMessageReceived - Called when a message is received.
 */
export function initialize(userNickname, callbacks) {
  nickname = userNickname;
  onConnectionStateChangeCallback = callbacks.onConnectionStateChange;
  onDataChannelOpenCallback = callbacks.onDataChannelOpen;
  onMessageReceivedCallback = callbacks.onMessageReceived;
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(STUN_SERVERS);

  peerConnection.onicecandidate = (event) => {
    // This event is fired when a new ICE candidate is found.
    // In this implementation, we wait for all candidates to be gathered
    // before creating the connection code, so this handler can be left empty.
  };

  peerConnection.onicegatheringstatechange = () => {
    console.log(`ICE Gathering State: ${peerConnection.iceGatheringState}`);
  };

  peerConnection.onconnectionstatechange = () => {
    onConnectionStateChangeCallback(peerConnection.connectionState);
  };

  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupDataChannelEvents();
  };
}

function setupDataChannelEvents() {
  dataChannel.onopen = () => {
    onDataChannelOpenCallback();
  };

  dataChannel.onmessage = (event) => {
    const message = JSON.parse(event.data);
    onMessageReceivedCallback(message, 'received');
  };

  dataChannel.onclose = () => {
    console.log('Data channel closed');
  };
}

/**
 * Creates a connection offer and returns the connection code.
 * @returns {Promise<string>} A promise that resolves with the Base64 encoded connection code.
 */
export async function createOfferAndGetCode() {
  createPeerConnection();
  dataChannel = peerConnection.createDataChannel('chat');
  setupDataChannelEvents();

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // Wait for ICE gathering to complete
  await new Promise((resolve) => {
    if (peerConnection.iceGatheringState === 'complete') {
      resolve();
    } else {
      const checkState = () => {
        if (peerConnection.iceGatheringState === 'complete') {
          peerConnection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };
      peerConnection.addEventListener('icegatheringstatechange', checkState);
    }
  });

  return btoa(JSON.stringify(peerConnection.localDescription));
}

/**
 * Receives an offer code, creates an answer, and returns the answer code.
 * @param {string} offerCode - The Base64 encoded offer code from the peer.
 * @returns {Promise<string>} A promise that resolves with the Base64 encoded answer code.
 */
export async function receiveOfferAndCreateAnswerCode(offerCode) {
  createPeerConnection();
  
  const offer = JSON.parse(atob(offerCode));
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  // Wait for ICE gathering to complete
  await new Promise((resolve) => {
    if (peerConnection.iceGatheringState === 'complete') {
      resolve();
    } else {
      const checkState = () => {
        if (peerConnection.iceGatheringState === 'complete') {
          peerConnection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };
      peerConnection.addEventListener('icegatheringstatechange', checkState);
    }
  });

  return btoa(JSON.stringify(peerConnection.localDescription));
}

/**
 * Receives an answer code to complete the connection.
 * @param {string} answerCode - The Base64 encoded answer code from the peer.
 * @returns {Promise<void>}
 */
export async function receiveAnswer(answerCode) {
  const answer = JSON.parse(atob(answerCode));
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

/**
 * Sends a message through the data channel.
 * @param {string} content - The text content of the message.
 */
export function sendMessage(content) {
  if (dataChannel && dataChannel.readyState === 'open') {
    const message = {
      type: 'MESSAGE',
      payload: {
        nickname: nickname,
        content: content,
        timestamp: Date.now(),
      },
    };
    const jsonMessage = JSON.stringify(message);
    dataChannel.send(jsonMessage);
    onMessageReceivedCallback(message, 'sent');
  } else {
    console.error('Data channel is not open.');
  }
}

/**
 * Closes the peer connection.
 */
export function closeConnection() {
    if (dataChannel) {
        dataChannel.close();
    }
    if (peerConnection) {
        peerConnection.close();
    }
    peerConnection = null;
    dataChannel = null;
}
