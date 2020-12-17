import React, { FunctionComponent, useEffect, useState } from "react"
import { render } from "react-dom"

import { offerer, answerer } from "./rtc"
import { firestore, pendingUID, documentId } from "./firebase"

const { log } = console
const { random, ceil, sqrt } = Math
const { keys, entries } = Object
const { stringify, parse } = JSON

const roomID = encodeURIComponent(location.pathname)

// const useFirestoreRoom = (roomID: string, uid: string) => {
//   const [users, setUsers] = useState({ [uid]: {} })

//   const usersRef = firestore.collection("rooms").doc(roomID).collection("users")

//   const handleRoom = async () => {
//     usersRef.doc(uid).set({})

//     usersRef.where(documentId(), "!=", uid).onSnapshot(snapshot => {
//       for (const change of snapshot.docChanges()) {
//         if (change.type === "added") {
//           setUsers(u => ({ ...u, [change.doc.id]: change.doc.data() }))
//         }
//       }
//     })
//   }

//   useEffect(() => void handleRoom(), [])

//   return { users }
// }

type Connections = { [uid: string]: boolean }
type Connect = (answer: string) => Promise<void>
type Offers = string[]
type Answers = { [offer: string]: string }
type Connects = { [offer: string]: Connect }
type Streams = { [offer: string]: MediaStream }
type Channels = { [offer: string]: RTCDataChannel }

type RootProps = {
  uid: string
}

const Root: FunctionComponent<RootProps> = ({ uid }) => {
  // const { users } = useFirestoreRoom(roomID, uid)
  const [connections, setConnections] = useState<Connections>({})
  const [streams, setStreams] = useState<Streams>({})
  const stream = streams[uid]
  const streamList = entries(streams)
  const squareSize = ceil(sqrt(streamList.length))
  const [connecting, setConnecting] = useState<string>()
  const [incomingOffer, setIncomingOffer] = useState<string>()
  const [incomingAnswer, setIncomingAnswer] = useState<Answers>()

  const [connects, setConnects] = useState<Connects>({})
  const [channels, setChannels] = useState<Channels>({})

  const offer = async () => {
    const o = await offerer(stream)
    const offer = o.offer
    const oenc = btoa(offer)

    setChannels(c => ({ ...c, [oenc]: o.chan }))
    setStreams(s => ({ ...s, [oenc]: o.incoming }))
    setConnects(c => ({ ...c, [oenc]: o.connect }))

    return oenc
  }

  const answer = async (...offers: Offers) => {
    let answers: Answers = {}

    for (const oenc of offers) {
      const offer = atob(oenc)
      const a = await answerer(offer, stream)
      const answer = a.answer
      const aenc = btoa(answer)

      setChannels(c => ({ ...c, [oenc]: a.chan }))
      setStreams(s => ({ ...s, [oenc]: a.incoming }))

      answers = { ...answers, [oenc]: aenc }
    }

    return answers
  }

  const connect = async (answers: Answers) => {
    for (const oenc in answers) {
      const aenc = answers[oenc]
      const answer = atob(aenc)
      const connect = connects[oenc]
      await connect(answer)
    }
  }

  const setMyStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    setStreams(s => ({ ...s, [uid]: stream }))
  }

  // const printRoomUsers = () => {
  //   log(`room: ${keys(users)}`)
  // }

  // const connectToNewRoomUsers = async () => {
  //   if (!stream) {
  //     return
  //   }

  //   for (const id in users) {
  //     if (id === uid) {
  //       continue
  //     }
  //     if (id in connections) {
  //       continue
  //     }

  //     setConnecting(id)

  //     const weOffer = uid < id
  //     log(`weOffer ${weOffer}`)

  //     const both = [uid, id].sort().join(":")
  //     const offerRef = firestore.collection("connecting").doc(`offer:${both}`)
  //     const answerRef = firestore.collection("connecting").doc(`answer:${both}`)

  //     if (weOffer) {
  //       const unsub = answerRef.onSnapshot(doc => {
  //         if (!doc.exists) {
  //           return
  //         }
  //         unsub()
  //         answerRef.delete()
  //         const { a, o } = doc.data()
  //         setIncomingAnswer({ [o]: a })
  //       })

  //       const o = await offer()

  //       const offerMsg = { o }
  //       // log(`offerMsg ${stringify(offerMsg, null, 2)}`)
  //       await offerRef.set(offerMsg)
  //       log(`o sent ${!!o}`)
  //     } else {
  //       const unsub = offerRef.onSnapshot(doc => {
  //         if (!doc.exists) {
  //           return
  //         }
  //         unsub()
  //         offerRef.delete()
  //         const { o } = doc.data()
  //         setIncomingOffer(o)
  //       })
  //     }
  //   }
  // }

  // const handleOffer = async () => {
  //   if (!incomingOffer) {
  //     return
  //   }
  //   if (!connecting) {
  //     return
  //   }

  //   const o = incomingOffer
  //   const a = (await answer(o))[o]

  //   const both = [uid, connecting].sort().join(":")
  //   const answerRef = firestore.collection("connecting").doc(`answer:${both}`)

  //   const answerMsg = { a, o }
  //   // log(`answerMsg ${stringify(answerMsg, null, 2)}`)
  //   await answerRef.set(answerMsg)
  // }

  // const handleAnswer = async () => {
  //   if (!incomingAnswer) {
  //     return
  //   }
  //   if (!connecting) {
  //     return
  //   }

  //   await connect(incomingAnswer)
  // }

  useEffect(() => void setMyStream(), [])
  // useEffect(() => void printRoomUsers(), [users])
  // useEffect(() => void handleOffer(), [incomingOffer, connecting])
  // useEffect(() => void handleAnswer(), [incomingAnswer, connecting, connects])
  // useEffect(() => void connectToNewRoomUsers(), [users, stream])
  ;(window as any).offer = offer
  ;(window as any).answer = answer
  ;(window as any).connect = connect
  ;(window as any).streams = streams
  ;(window as any).channels = channels

  return (
    <div
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        display: "grid",
        justifyContent: "center",
        alignContent: "center",
      }}
    >
      <div
        style={{
          display: "grid",
          rowGap: "8px",
          columnGap: "8px",
          gridTemplateColumns: `repeat(${squareSize}, 1fr)`,
          gridTemplateRows: `repeat(${squareSize}, 1fr)`,
        }}
      >
        {streamList.map(([id, stream]) => (
          <div
            key={id}
            style={{
              width: `${64}px`,
              height: `${88}px`,
              overflow: "hidden",
              borderRadius: "999px",
              display: "inline-block",
              WebkitMaskImage: "-webkit-radial-gradient(white, black)", // safari fix (https://gist.github.com/ayamflow/b602ab436ac9f05660d9c15190f4fd7b)
              // outline: "1px dashed black",
            }}
          >
            <video
              ref={video => {
                if (!video) {
                  return
                }
                video.srcObject = stream
              }}
              autoPlay
              playsInline
              style={{
                position: "relative",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%) scale(-2, 2)",
                height: "100%",
                filter: "brightness(1.25) saturate(1.25)",
              }}
              muted={id === uid}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

;(window as any).stringify = stringify
;(window as any).parse = parse
;(window as any).firestore = firestore

const RootWrapper = () => {
  const [uid, setUID] = useState<string>()

  useEffect(() => {
    pendingUID.then(setUID)
  }, [])
  ;(window as any).uid = uid

  return uid ? <Root uid={uid} /> : null
}

render(<RootWrapper />, document.getElementById("root"))
