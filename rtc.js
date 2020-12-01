/**
 * @typedef Props
 * @property {(ev: Event) => any} onICEConnectionStateChange
 * @property {(ev: Event) => any} onOpen
 * @property {(ev: MessageEvent<any>) => any} onMessage
 */

/**
 * @param {Props}
 */
const newrtc = ({ onICEConnectionStateChange, onOpen, onMessage }) => {
  const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.1.google.com:19302" }] })
  peer.oniceconnectionstatechange = onICEConnectionStateChange

  const chan = peer.createDataChannel("chat", { negotiated: true, id: 0 })
  chan.onopen = onOpen
  chan.onmessage = onMessage

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

export { newrtc, newoffer, newanswer, connectrtc }
