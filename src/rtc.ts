import tests from "./rtc.test"

const { log } = console

const newrtc = (props?: {
  onICEConnectionStateChange?: (ev: Event) => any
  onOpen?: (ev: Event) => any
  onMessage?: (ev: MessageEvent<any>) => any
}) => {
  const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.1.google.com:19302" }] })
  peer.oniceconnectionstatechange = props?.onICEConnectionStateChange

  const chan = peer.createDataChannel("chat", { negotiated: true, id: 0 })
  chan.onopen = props?.onOpen
  chan.onmessage = props?.onMessage

  return { peer, chan }
}

const newoffer = async (peer: RTCPeerConnection) => {
  await peer.setLocalDescription(await peer.createOffer())

  const offer = await new Promise<string>(resolve => {
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        return
      }
      resolve(peer.localDescription.sdp)
    }
  })

  return offer
}

const newanswer = async (peer: RTCPeerConnection, offer: string) => {
  if (peer.signalingState !== "stable") {
    throw new Error(`TODO: handle unstable signaling states (signalingState=${peer.signalingState})`)
  }
  await peer.setRemoteDescription({ type: "offer", sdp: offer })
  await peer.setLocalDescription(await peer.createAnswer())
  const answer = await new Promise<string>(resolve => {
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        return
      }
      resolve(peer.localDescription.sdp)
    }
  })
  return answer
}

const connectrtc = async (peer: RTCPeerConnection, answer: string) => {
  if (peer.signalingState !== "have-local-offer") {
    throw new Error(`TODO: handle signaling states without local offer (signalingState=${peer.signalingState})`)
  }
  await peer.setRemoteDescription({ type: "answer", sdp: answer })
}

const offerer = async (outgoing?: MediaStream) => {
  const { peer, chan } = newrtc({
    onICEConnectionStateChange() {
      log(`connection ${peer.connectionState}`)
    },
    onOpen() {
      log(`open`)
    },
    onMessage(e) {
      log(`> ${e.data}`)
    },
  })
  const incoming = new MediaStream()
  peer.ontrack = ({ track }) => incoming.addTrack(track)
  for (const track of outgoing?.getTracks() ?? []) {
    peer.addTrack(track)
  }
  const offer = await newoffer(peer)
  const connect = (answer: string) => connectrtc(peer, answer)
  return { peer, chan, incoming, offer, connect }
}

const answerer = async (offer: string, outgoing?: MediaStream) => {
  const { peer, chan } = newrtc({
    onICEConnectionStateChange() {
      log(`connection ${peer.connectionState}`)
    },
    onOpen() {
      log(`open`)
    },
    onMessage(e) {
      log(`> ${e.data}`)
    },
  })
  const incoming = new MediaStream()
  peer.ontrack = ({ track }) => incoming.addTrack(track)
  for (const track of outgoing?.getTracks() ?? []) {
    peer.addTrack(track)
  }
  const answer = await newanswer(peer, offer)
  return { peer, chan, incoming, answer }
}

location.pathname === "/tests" && tests()

export { offerer, answerer }
