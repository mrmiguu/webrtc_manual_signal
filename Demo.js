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

const {
  log,
} = console

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

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
  const [chatMessages, setChatMessages] = useState([])

  const [fixSafariDisabled, setFixSafariDisabled] = useState(!isSafari)

  const setupWebRTC = () => {
    const chat = chatRef.current

    const peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.1.google.com:19302' }] })
    const dataChannel = peerConnection.createDataChannel('chat', { negotiated: true, id: 0 })

    dataChannel.onopen = () => {
      chat.select()
    }
    dataChannel.onmessage = e => {
      const msg = `> ${e.data}`
      log(msg)
      setChatMessages(msgs => [...msgs, msg])
    }
    peerConnection.oniceconnectionstatechange = e => {
      log(peerConnection.iceConnectionState)
    }

    return {
      peerConnection,
      dataChannel,
    }
  }

  useEffect(() => {
    const { peerConnection, dataChannel } = setupWebRTC()
    setPeerConnection(peerConnection)
    setDataChannel(dataChannel)
  }, [])

  return (
    <div>

      <div>
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

              offer.value = peerConnection.localDescription.sdp
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

            await peerConnection.setRemoteDescription({ type: 'offer', sdp: offer.value })
            await peerConnection.setLocalDescription(await peerConnection.createAnswer())

            peerConnection.onicecandidate = ({ candidate }) => {
              if (candidate) {
                return
              }

              const answer = answerRef.current

              answer.focus()
              answer.value = peerConnection.localDescription.sdp
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
            peerConnection.setRemoteDescription({ type: 'answer', sdp: answer.value })
          }}
        />
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
        {chatMessages.map(msg =>
          <div>{msg}</div>
        )}
      </div>
    </div>
  )
}



export default Demo
