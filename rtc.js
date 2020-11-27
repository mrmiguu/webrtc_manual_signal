const { log, warn } = console

const initRTC = () => {
  const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.1.google.com:19302" }] })
  const chan = peer.createDataChannel("chat", { negotiated: true, id: 0 })

  peer.oniceconnectionstatechange = () => {
    if (peer.iceConnectionState === "checking") {
      log(`oniceconnectionstatechange(): ${peer.iceConnectionState}`)
    }
    if (peer.iceConnectionState === "closed") {
      warn(`oniceconnectionstatechange(): ${peer.iceConnectionState}`)
    }
    if (peer.iceConnectionState === "completed") {
      log(`oniceconnectionstatechange(): ${peer.iceConnectionState}`)
    }
    if (peer.iceConnectionState === "connected") {
      log(`oniceconnectionstatechange(): ${peer.iceConnectionState}`)
    }
    if (peer.iceConnectionState === "disconnected") {
      warn(`oniceconnectionstatechange(): ${peer.iceConnectionState}`)
    }
    if (peer.iceConnectionState === "failed") {
      throw new Error(`oniceconnectionstatechange(): ${peer.iceConnectionState}`)
    }
    if (peer.iceConnectionState === "new") {
      log(`oniceconnectionstatechange(): ${peer.iceConnectionState}`)
    }
  }

  peer.ontrack = ({ track }) => {
    log(`ontrack(): ${!!track}`)
  }

  return { peer, chan }
}

const offerer = async () => {
  log(`offerer()`)

  const { peer } = initRTC()

  /** @type {string} */
  const offer = await new Promise(async resolve => {
    peer.onicecandidate = ({ candidate }) => {
      log(`offerer(): candidate arrived; empty=${!!candidate}`)
      if (candidate) {
        return
      }
      resolve(peer.localDescription.sdp)
    }

    log(`offerer(): generating offer...`)
    await peer.setLocalDescription(await peer.createOffer())
    log(`offerer(): offer generated!`)
    log(`offerer(): finding empty candidate...`)
  })
  log(`offerer(): empty candidate found!`)

  /**
   * @param {string} answer
   */
  const connect = async answer => {
    if (peer.signalingState !== "have-local-offer") {
      throw new Error(`connect(): missing local offer; signal=${peer.signalingState}`)
    }
    log(`connect(): setting remote answer...`)
    await peer.setRemoteDescription({ type: "answer", sdp: answer })
    log(`connect(): remote answer set!`)
  }

  return { offer, connect }
}

/**
 * @param {string} offer
 */
const answerer = async offer => {
  log(`answerer()`)

  const { peer } = initRTC()

  if (peer.signalingState !== "stable") {
    throw new Error(`answerer(): signalingState=${peer.signalingState}`)
  }

  /** @type {string} */
  const answer = await new Promise(async resolve => {
    peer.onicecandidate = ({ candidate }) => {
      log(`answerer(): candidate arrived; empty=${!!candidate}`)
      if (candidate) {
        return
      }
      resolve(peer.localDescription.sdp)
    }
    log(`answerer(): setting remote offer...`)
    await peer.setRemoteDescription({ type: "offer", sdp: offer })
    log(`answerer(): remote offer set!`)
    log(`answerer(): generating answer...`)
    await peer.setLocalDescription(await peer.createAnswer())
    log(`answerer(): answer generated!`)
    log(`answerer(): finding empty candidate...`)
  })
  log(`answerer(): empty candidate found!`)

  return answer
}

window.initRTC = initRTC
window.offerer = offerer
window.answerer = answerer

export { offerer, answerer }
