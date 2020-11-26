const { log, warn } = console

const init = () => {
  const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.1.google.com:19302" }] })

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

  return peer
}

const offerer = async () => {
  log(`offerer()`)

  const peer = init()
  await peer.setLocalDescription(await peer.createOffer())
  log(`offerer(): generated`)

  /** @type {string} */
  const offer = await new Promise(resolve => {
    peer.onicecandidate = ({ candidate }) => {
      log(`onicecandidate(): ${!!candidate}`)

      if (candidate) {
        return
      }

      resolve(peer.localDescription.sdp)
    }
  })
  log(`offerer(): ICE candidate (not?) found`)

  const connect = answer => {
    if (peer.signalingState !== "have-local-offer") {
      throw new Error(`connect(): signalingState=${peer.signalingState}`)
    }

    peer.setRemoteDescription({ type: "answer", sdp: answer })
  }

  return { peer, offer, connect }
}

/**
 * @param {string} offer
 */
const answerer = async offer => {
  log(`answerer()`)

  const peer = init()

  if (peer.signalingState !== "stable") {
    throw new Error(`answerer(): signalingState=${peer.signalingState}`)
  }

  await peer.setRemoteDescription({ type: "offer", sdp: offer })
  log(`answerer(): set offer`)
  await peer.setLocalDescription(await peer.createAnswer())
  log(`answerer(): generated`)

  /** @type {string} */
  const answer = await new Promise(resolve => {
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        return
      }
      resolve(peer.localDescription.sdp)
    }
  })
  log(`answerer(): ICE candidate (not?) found`)

  return { peer, answer }
}

export { offerer, answerer }
