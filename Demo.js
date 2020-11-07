// https://stackoverflow.com/a/54985729

import React, {
  useRef,
  useState,
  useEffect,
  FunctionComponent,
  Dispatch,
  SetStateAction,
  MutableRefObject,
} from 'react'

import './Demo.scss'

const {
  log,
} = console

const {
  keys,
  values,
  entries,
} = Object

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

const url = new URL(location.href)
const base64Description = url.pathname.slice(1)
log(base64Description)

/** @type {FunctionComponent<void>} */
const Demo = () => {

  /** @type {MutableRefObject<HTMLButtonElement>]} */
  const createOfferRef = useRef()

  /** @type {MutableRefObject<HTMLInputElement>]} */
  const offerRef = useRef()

  /** @type {MutableRefObject<HTMLInputElement>]} */
  const answerRef = useRef()

  /** @type {MutableRefObject<HTMLInputElement>]} */
  const chatRef = useRef()

  /** @type {[RTCPeerConnection, Dispatch<SetStateAction<RTCPeerConnection>>]} */
  const [peerConnection, setPeerConnection] = useState()

  /** @type {[RTCDataChannel, Dispatch<SetStateAction<RTCDataChannel>>]} */
  const [dataChannel, setDataChannel] = useState()

  /** @type {[string[], Dispatch<SetStateAction<string[]>>]} */
  const [stateChanges, setStateChanges] = useState([])

  /** @type {[string[], Dispatch<SetStateAction<string[]>>]} */
  const [chatMessages, setChatMessages] = useState([])

  /** @type {[Object.<string, MediaStream>, Dispatch<SetStateAction<Object.<string, MediaStream>>>]} */
  const [videoSrcObjects, setVideoSrcObjects] = useState({})

  const [fixSafariDisabled, setFixSafariDisabled] = useState(!isSafari)

  /**
   * @typedef SetupWebRTCParameters
   * @property {(this: RTCDataChannel, ev: Event) => any} [onOpen]
   * @property {(this: RTCDataChannel, ev: MessageEvent<any>) => any} [onMessage]
   * @property {(this: RTCPeerConnection, ev: Event) => any} [onIceConnectionStateChange]
   */

  /**
   * @param {SetupWebRTCParameters} params
   */
  const setupWebRTC = params => {

    const peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.1.google.com:19302' }] })
    const dataChannel = peerConnection.createDataChannel('chat', { negotiated: true, id: 0 })

    dataChannel.onopen = params.onOpen
    dataChannel.onmessage = params.onMessage
    peerConnection.oniceconnectionstatechange = params.onIceConnectionStateChange

    return {
      peerConnection,
      dataChannel,
    }
  }

  useEffect(() => {
    const chat = chatRef.current

    const { peerConnection, dataChannel } = setupWebRTC({
      onOpen() {
        chat.select()
      },

      onMessage(e) {
        const msg = `> ${e.data}`
        log(msg)
        setChatMessages(msgs => [...msgs, msg])
      },

      onIceConnectionStateChange() {
        const state = peerConnection.iceConnectionState
        log(state)
        setStateChanges(states => [...states, state])
      },
    })

    peerConnection.ontrack = e => {
      log(`ontrack`)
      const stream = e.streams && e.streams[0] || new MediaStream([e.track])
      setVideoSrcObjects(srcObjects => ({ ...srcObjects, ['them']: stream }))
    }

    setPeerConnection(peerConnection)
    setDataChannel(dataChannel)
  }, [])

  useEffect(() => {
    if (!peerConnection) {
      return
    }
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      setVideoSrcObjects(srcObjects => ({ ...srcObjects, ['us']: stream }))
      for (const track of stream.getTracks().slice(0, 1)) {
        peerConnection.addTrack(track)
      }
    })
  }, [peerConnection])

  return (
    <div className={`Demo`}>

      {entries(videoSrcObjects).map(([id, stream]) =>
        <video
          key={id}
          ref={video => {
            if (!video || video.srcObject === stream) {
              return
            }
            video.srcObject = stream
          }}
          playsInline
          autoPlay
          muted
        />
      )}

      <div hidden={!isSafari}>
        <button
          disabled={fixSafariDisabled}
          onClick={async () => {
            await navigator.mediaDevices.getUserMedia({ audio: true })
            setFixSafariDisabled(true)
          }}
        >
          Fix Safari
        </button>
      </div>

      <div>
        <button
          ref={createOfferRef}

          onClick={async () => {
            await peerConnection.setLocalDescription(await peerConnection.createOffer())

            peerConnection.onicecandidate = ({ candidate }) => {
              if (candidate) {
                return
              }

              const offer = offerRef.current
              const answer = answerRef.current

              const offerB64URIEnc = btoa(peerConnection.localDescription.sdp)
              log(`offerB64URIEnc:\n${offerB64URIEnc}`)

              offer.value = encodeURIComponent(offerB64URIEnc)
              offer.select()

              answer.placeholder = 'Paste answer here'
            }
          }}
        >
          Offer:
        </button>

        <textarea
          ref={offerRef}
          placeholder="Paste offer here"

          onKeyPress={async e => {
            if (e.key !== 'Enter' || peerConnection.signalingState !== 'stable') {
              return
            }

            const offer = offerRef.current

            await peerConnection.setRemoteDescription({ type: 'offer', sdp: atob(decodeURIComponent(offer.value)) })
            await peerConnection.setLocalDescription(await peerConnection.createAnswer())

            peerConnection.onicecandidate = ({ candidate }) => {
              if (candidate) {
                return
              }

              const answer = answerRef.current

              const answerB64URIEnc = btoa(peerConnection.localDescription.sdp)
              log(`answerB64URIEnc:\n${answerB64URIEnc}`)

              answer.focus()
              answer.value = encodeURIComponent(answerB64URIEnc)
              answer.select()
            }
          }}
        />
      </div>

      <div>
        <label htmlFor="answer">Answer:</label>
        <textarea
          ref={answerRef}
          name="answer"
          onKeyPress={e => {
            if (e.key !== 'Enter' || peerConnection.signalingState !== 'have-local-offer') {
              return
            }

            const answer = answerRef.current
            peerConnection.setRemoteDescription({ type: 'answer', sdp: atob(decodeURIComponent(answer.value)) })
          }}
        />
      </div>

      <div>
        {stateChanges.map((state, i) =>
          <div key={i}>{state}</div>
        )}
      </div>

      <div>
        <label htmlFor="chat">Chat:</label>
        <input
          ref={chatRef}
          name="chat"
          onKeyPress={e => {
            if (e.key !== 'Enter') {
              return
            }

            const chat = chatRef.current
            const msg = chat.value

            dataChannel.send(msg)
            log(msg)
            setChatMessages(msgs => [...msgs, msg])

            chat.value = ''
          }}
        />
      </div>

      <div>
        {chatMessages.map((msg, i) =>
          <div key={i}>{msg}</div>
        )}
      </div>
    </div>
  )
}



export default Demo
