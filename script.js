import "babel-polyfill"

// Safari fix begin
// Safari fix begin
// Safari fix begin
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
const fixSafariBtn = document.getElementById("fix-safari")
fixSafariBtn.hidden = !isSafari
async function fixSafari() {
  await navigator.mediaDevices.getUserMedia({ audio: true })
  fixSafariBtn.hidden = true
}
window.fixSafari = fixSafari
// Safari fix end
// Safari fix end
// Safari fix end

// ----------------------------------------------------------------

/**
 * @typedef Props
 * @property {(ev: Event) => any} onOpen
 * @property {(ev: MessageEvent<any>) => any} onMessage
 * @property {(ev: Event) => any} onICEConnectionStateChange
 */

/**
 * @param {Props}
 */
const newrtc = ({ onOpen, onMessage, onICEConnectionStateChange }) => {
  const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.1.google.com:19302" }] })
  const chan = peer.createDataChannel("chat", { negotiated: true, id: 0 })
  chan.onopen = onOpen
  chan.onmessage = onMessage
  peer.oniceconnectionstatechange = onICEConnectionStateChange
  return { peer, chan }
}

/**
 * @param {RTCPeerConnection} peer
 */
const newoffer = async peer => {
  await peer.setLocalDescription(await peer.createOffer())
  /** @type {string} */
  const offer = await new Promise(resolve => {
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        return
      }
      resolve(peer.localDescription.sdp)
    }
  })
  return offer
}

/**
 *
 * @param {RTCPeerConnection} peer
 * @param {string} offer
 */
const newanswer = async (peer, offer) => {
  if (peer.signalingState !== "stable") {
    throw new Error(`TODO: handle unstable signaling states (signalingState=${peer.signalingState})`)
  }
  await peer.setRemoteDescription({ type: "offer", sdp: offer })
  await peer.setLocalDescription(await peer.createAnswer())
  /** @type {string} */
  const answer = await new Promise(resolve => {
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        return
      }
      resolve(peer.localDescription.sdp)
    }
  })
  return answer
}

/**
 * @param {RTCPeerConnection} peer
 * @param {string} answer
 */
const connectrtc = async (peer, answer) => {
  if (peer.signalingState !== "have-local-offer") {
    throw new Error(`TODO: handle signaling states without local offer (signalingState=${peer.signalingState})`)
  }
  await peer.setRemoteDescription({ type: "answer", sdp: answer })
}

// Manual signaling code starts here
// Manual signaling code starts here
// Manual signaling code starts here

const log = msg => (div.innerHTML += `<br>${msg}`)

const { peer: pc, chan: dc } = newrtc({
  onOpen() {
    console.log(`newrtc: onOpen`)
    chat.select()
  },
  onMessage(e) {
    console.log(`newrtc: onMessage`)
    log(`> ${e.data}`)
  },
  onICEConnectionStateChange(e) {
    console.log(`newrtc: onICEConnectionStateChange`)
    log(pc.iceConnectionState)
  },
})

async function createOffer() {
  button.disabled = true
  const o = await newoffer(pc)
  offer.value = o
  offer.select()
  answer.placeholder = "Paste answer here"
}
window.createOffer = createOffer

offer.onkeypress = async function (e) {
  if (e.keyCode != 13) return
  button.disabled = offer.disabled = true
  const a = await newanswer(pc, offer.value)
  answer.focus()
  answer.value = a
  answer.select()
}

answer.onkeypress = async function (e) {
  if (e.keyCode != 13) return
  answer.disabled = true
  await connectrtc(pc, answer.value)
}

chat.onkeypress = function (e) {
  if (e.keyCode != 13) return
  dc.send(chat.value)
  log(chat.value)
  chat.value = ""
}
