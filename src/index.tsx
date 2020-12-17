import React, { FunctionComponent, useEffect, useState } from "react"
import { render } from "react-dom"

import { offerer, answerer } from "./rtc"
import { anonymousUID, waitForDocument, UseCollection } from "./firebase"
import firebase from "firebase/app"
import "firebase/firestore"
import { useCollection } from "react-firebase-hooks/firestore"

const { log } = console
const { random, ceil, sqrt } = Math
const { keys, entries } = Object
const { stringify, parse } = JSON

const roomID = encodeURIComponent(location.pathname)

type Connections = { [uid: string]: boolean }
type Connect = (answer: string) => Promise<void>
type Offers = string[]
type Answers = { [offer: string]: string }
type Connects = { [offer: string]: Connect }
type Streams = { [uid: string]: MediaStream }
type Sockets = { [uid: string]: RTCDataChannel }

type RootProps = {
  uid: string
}

const Root: FunctionComponent<RootProps> = ({ uid }) => {
  const [connections, setConnections] = useState<Connections>({})
  const [streams, setStreams] = useState<Streams>({})
  const stream = streams[uid]
  const streamList = entries(streams)
  const squareSize = ceil(sqrt(streamList.length))

  const [connects, setConnects] = useState<Connects>({})
  ;(window as any).connects = connects
  const [sockets, setSockets] = useState<Sockets>({})

  const [roomUsersQuery] = useCollection(
    firebase.firestore().collection("rooms").doc(roomID).collection("users"),
  ) as UseCollection

  const roomUserIds = roomUsersQuery?.docs?.map(doc => doc.id) ?? []

  useEffect(() => {
    if (!stream) {
      return
    }
    firebase.firestore().collection("rooms").doc(roomID).collection("users").doc(uid).set({})
  }, [stream])

  const makeConnections = async () => {
    if (!stream) {
      return
    }

    for (const id of roomUserIds) {
      const alreadyConnected = id in connections
      const ourId = id === uid

      if (alreadyConnected || ourId) {
        continue
      }

      setConnections(c => ({ ...c, [id]: true }))
      log(`connect(${uid}, ${id})`)

      const weOffer = uid < id

      if (weOffer) {
        const o = await offerer(stream)
        const offer = o.offer
        const oenc = btoa(offer)
        setSockets(c => ({ ...c, [id]: o.chan }))
        setStreams(s => ({ ...s, [id]: o.incoming }))

        await firebase.firestore().collection("rooms").doc(roomID).collection(`${id}:${uid}`).add({ oenc })
        log(`weOffer: oenc sent! ${!!oenc}`)

        const { aenc } = await waitForDocument(
          firebase.firestore().collection("rooms").doc(roomID).collection(`${uid}:${id}`),
        )
        log(`weOffer: aenc arrived! ${!!aenc}`)

        const answer = atob(aenc)
        await o.connect(answer)
        log(`weOffer: connected`)
      } else {
        const { oenc } = await waitForDocument(
          firebase.firestore().collection("rooms").doc(roomID).collection(`${uid}:${id}`),
        )
        log(`weOffer: oenc arrived! ${!!oenc}`)

        const offer = atob(oenc)
        const a = await answerer(offer, stream)
        const answer = a.answer
        const aenc = btoa(answer)

        setSockets(c => ({ ...c, [id]: a.chan }))
        setStreams(s => ({ ...s, [id]: a.incoming }))

        await firebase.firestore().collection("rooms").doc(roomID).collection(`${id}:${uid}`).add({ aenc })
        log(`weOffer: aenc sent! ${!!aenc}`)
      }
    }
  }

  const setMyStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    setStreams(s => ({ ...s, [uid]: stream }))
  }

  useEffect(() => void setMyStream(), [])
  useEffect(() => void makeConnections(), [roomUsersQuery, connections, stream])
  ;(window as any).streams = streams
  ;(window as any).sockets = sockets

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

const RootWrapper = () => {
  const [uid, setUID] = useState<string>()

  useEffect(() => {
    anonymousUID.then(setUID)
  }, [])
  ;(window as any).uid = uid

  return uid ? <Root uid={uid} /> : null
}

render(<RootWrapper />, document.getElementById("root"))
