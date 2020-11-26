// https://stackoverflow.com/a/54985729

import React, {
  useRef,
  useState,
  useEffect,
  FunctionComponent,
  Dispatch,
  SetStateAction,
  MutableRefObject,
} from "react"
import { useParams } from "react-router-dom"
import { firestore, serverTimestamp } from "./firebase"

import "./PersonalRoom.scss"

const { log } = console
const { keys, values, entries } = Object

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

/**
 * @typedef PersonalRoomProps
 * @property {string} uid
 * @property {(roomID: string, userID: string) => void} onConnectionError
 */

/** @type {FunctionComponent<PersonalRoomProps>} */
const PersonalRoom = ({ uid, onConnectionError }) => {
  log("<PersonalRoom>")

  const { roomID } = useParams()
  const yourRoom = uid === roomID
  const initiator = !yourRoom

  const usersCollection = firestore.collection("rooms").doc(roomID).collection("users")
  const yourDoc = usersCollection.doc(uid)
  const hostDoc = usersCollection.doc(roomID)

  /** @type {MutableRefObject<HTMLButtonElement>]} */
  const createOfferRef = useRef()

  /** @type {MutableRefObject<HTMLInputElement>]} */
  const offerRef = useRef()

  /** @type {MutableRefObject<HTMLInputElement>]} */
  const answerRef = useRef()

  /** @type {MutableRefObject<HTMLInputElement>]} */
  const chatRef = useRef()

  const [erasedRoomFirestore, setErasedRoomFirestore] = useState(false)
  window.erasedRoomFirestore = erasedRoomFirestore

  /** @type {[RTCPeerConnection, Dispatch<SetStateAction<RTCPeerConnection>>]} */
  const [peerConnection, setPeerConnection] = useState()

  /** @type {[RTCDataChannel, Dispatch<SetStateAction<RTCDataChannel>>]} */
  const [dataChannel, setDataChannel] = useState()

  /** @type {[RTCIceConnectionState[], Dispatch<SetStateAction<RTCIceConnectionState[]>>]} */
  const [stateChanges, setStateChanges] = useState([])

  /** @type {[string[], Dispatch<SetStateAction<string[]>>]} */
  const [chatMessages, setChatMessages] = useState([])

  /** @type {[{[key: string]: MediaStream}, Dispatch<SetStateAction<{[key: string]: MediaStream}>>]} */
  const [streams, setStreams] = useState({})
  window.streams = streams

  const videoReady = keys(streams).length > 0

  const [fixSafariDisabled, setFixSafariDisabled] = useState(!isSafari)

  const [offer, setOffer] = useState("")
  const [offerFrom, setOfferFrom] = useState("")
  const [answer, setAnswer] = useState("")

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
    const peerConnection = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.1.google.com:19302" }] })
    const dataChannel = peerConnection.createDataChannel("chat", { negotiated: true, id: 0 })

    dataChannel.onopen = params.onOpen
    dataChannel.onmessage = params.onMessage
    peerConnection.oniceconnectionstatechange = params.onIceConnectionStateChange

    return {
      peerConnection,
      dataChannel,
    }
  }

  const pasteOffer = value => {
    const offer = offerRef.current
    offer.focus()
    offer.value = value
    offer.select()
  }

  const pasteAnswer = value => {
    const answer = answerRef.current
    answer.focus()
    answer.value = value
    answer.select()
  }

  const clickOfferButton = async () => {
    await peerConnection.setLocalDescription(await peerConnection.createOffer())

    peerConnection.onicecandidate = ({ candidate }) => {
      if (candidate) {
        return
      }
      const offer = offerRef.current
      const answer = answerRef.current
      pasteOffer(encodeURIComponent(btoa(peerConnection.localDescription.sdp)))
      setOffer(offer.value)
      answer.placeholder = "Paste answer here"
    }
  }

  const submitOffer = async () => {
    if (peerConnection.signalingState !== "stable") {
      return
    }

    const offer = offerRef.current

    const sdp = atob(decodeURIComponent(offer.value))
    setOffer(sdp)

    await peerConnection.setRemoteDescription({ type: "offer", sdp })
    await peerConnection.setLocalDescription(await peerConnection.createAnswer())

    peerConnection.onicecandidate = ({ candidate }) => {
      if (candidate) {
        return
      }
      const answer = answerRef.current
      pasteAnswer(encodeURIComponent(btoa(peerConnection.localDescription.sdp)))
      setAnswer(answer.value)
    }
  }

  const submitAnswer = () => {
    if (peerConnection.signalingState !== "have-local-offer") {
      return
    }
    const answer = answerRef.current
    const sdp = atob(decodeURIComponent(answer.value))
    setAnswer(sdp)
    peerConnection.setRemoteDescription({ type: "answer", sdp })
  }

  const eraseRoomFirestore = async () => {
    const query = await firestore.collection("rooms").doc(roomID).collection("users").get()

    let promises = []
    query.docs.forEach(doc => {
      promises.push(doc.ref.delete())
    })

    await Promise.all(promises)
    setErasedRoomFirestore(true)
  }

  useEffect(() => void log(`erasedRoomFirestore: ${erasedRoomFirestore}`), [erasedRoomFirestore])

  useEffect(() => {
    ;(async () => {
      log(
        `[videoReady, peerConnection, initiator, offer, offerFrom, answer, erasedRoomFirestore]\n[${!!videoReady}, ${!!peerConnection}, ${!!initiator}, ${!!offer}, ${!!offerFrom}, ${!!answer}, ${!!erasedRoomFirestore}]`,
      )

      if (!videoReady || !peerConnection || !erasedRoomFirestore) {
        return
      }

      const generateOffer = initiator && !offer
      const waitForRemoteAnswer = initiator && offer

      const waitForRemoteOffer = !initiator && !offer
      const answerGenerated = !initiator && offerFrom && answer

      if (generateOffer) {
        log(`generateOffer()`)
        clickOfferButton()
      } else if (waitForRemoteAnswer) {
        log(`waitForRemoteAnswer()...`)
        const remotePaste = new Promise(resolve =>
          yourDoc.onSnapshot(snapshot => {
            const data = snapshot.data()
            if (!data) {
              log("waitForRemoteAnswer()... !data")
              return
            }
            if (!data.answer) {
              log("waitForRemoteAnswer()... !data.answer")
              return
            }
            log("waitForRemoteAnswer()... data.answer [SUCCESS]")
            resolve(data)
          }),
        )
        hostDoc.set({
          from: uid,
          offer,
        })
        const remotelyPasted = await remotePaste
        log(`waitForRemoteAnswer()!!!`)
        pasteAnswer(remotelyPasted.answer)
        submitAnswer()
      }

      if (waitForRemoteOffer) {
        log(`waitForRemoteOffer()...`)
        const remotelyPasted = await new Promise(resolve =>
          yourDoc.onSnapshot(snapshot => {
            const data = snapshot.data()
            if (!data) {
              log("waitForRemoteOffer()... !data")
              return
            }
            if (!data.offer) {
              log("waitForRemoteOffer()... !data.offer")
              return
            }
            log("waitForRemoteOffer()... data.offer [SUCCESS]")
            resolve(data)
          }),
        )
        log(`waitForRemoteOffer()!!!`)
        pasteOffer(remotelyPasted.offer)
        setOfferFrom(remotelyPasted.from)
        submitOffer()
      } else if (answerGenerated) {
        log(`answerGenerated()`)
        usersCollection.doc(offerFrom).set({
          from: uid,
          answer,
        })
      }
    })()
  }, [videoReady, peerConnection, initiator, offer, offerFrom, answer, erasedRoomFirestore])

  useEffect(() => {
    if (!roomID) {
      return
    }

    eraseRoomFirestore()

    if (yourRoom) {
      log(`you (${uid}) have entered your own room`)
    } else {
      log(`you (${uid}) have entered room ${roomID}`)
    }
  }, [roomID])

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
      setStreams(streams => {
        const stream = streams["them"] || new MediaStream()
        stream.addTrack(e.track)
        return { ...streams, ["them"]: stream }
      })
    }

    setPeerConnection(peerConnection)
    setDataChannel(dataChannel)
  }, [])

  useEffect(() => {
    if (!peerConnection) {
      return
    }
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      setStreams(srcObjects => ({ ...srcObjects, ["us"]: stream }))
      for (const track of stream.getTracks()) {
        peerConnection.addTrack(track)
      }
    })
  }, [peerConnection])

  useEffect(() => {
    for (const change of stateChanges) {
      const err = change === "failed" || change === "disconnected" || change === "closed"

      if (err) {
        const userID = yourRoom ? offerFrom : uid
        onConnectionError(roomID, userID)
        return
      }
    }
  }, [stateChanges])

  return (
    <div className={`personalRoom`}>
      <div style={{ position: "fixed", opacity: 0.5 }}>
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
          <button ref={createOfferRef} onClick={clickOfferButton}>
            Offer:
          </button>

          <textarea
            ref={offerRef}
            placeholder="Paste offer here"
            onKeyPress={e => {
              if (e.key !== "Enter") {
                return
              }
              submitOffer()
            }}
          />
        </div>

        <div>
          <label htmlFor="answer">Answer:</label>
          <textarea
            ref={answerRef}
            name="answer"
            onKeyPress={e => {
              if (e.key !== "Enter") {
                return
              }
              submitAnswer()
            }}
          />
        </div>

        <div>
          {stateChanges.map((state, i) => (
            <div key={i}>{state}</div>
          ))}
        </div>

        <div>
          <label htmlFor="chat">Chat:</label>
          <input
            ref={chatRef}
            name="chat"
            onKeyPress={e => {
              if (e.key !== "Enter") {
                return
              }

              const chat = chatRef.current
              const msg = chat.value

              dataChannel.send(msg)
              log(msg)
              setChatMessages(msgs => [...msgs, msg])

              chat.value = ""
            }}
          />
        </div>

        <div>
          {chatMessages.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      </div>

      <div className={`dummyzoomRoot`}>
        <div className={`dummyzoomCenterGrow`}>
          {entries(streams).map(([id, stream]) => {
            return (
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
                muted={id === "us"}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PersonalRoom
