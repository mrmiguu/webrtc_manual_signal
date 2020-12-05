import React, { FunctionComponent, useEffect, useState, Dispatch, SetStateAction } from "react"
import { render } from "react-dom"

import { offerer, answerer } from "./rtc"

const { log } = console
const { random, ceil, sqrt } = Math
const { entries } = Object
const { stringify, parse } = JSON

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
isSafari && navigator.mediaDevices.getUserMedia({ audio: true })

const uid = Date.now() * random()

type Connect = (answer: string) => Promise<void>
type Offers = string[]
type Answers = { [offer: string]: string }
type Connects = { [offer: string]: Connect }
type Streams = { [offer: string]: MediaStream }
type Channels = { [offer: string]: RTCDataChannel }

const Demo: FunctionComponent<{}> = () => {
  const [streams, setStreams] = useState<Streams>({})
  const stream = streams[uid]
  const streamList = entries(streams)
  const squareSize = ceil(sqrt(streamList.length))

  const [connects, setConnects] = useState<Connects>({})
  const [channels, setChannels] = useState<Channels>({})

  const offer = async () => {
    const o = await offerer()
    const offer = o.offer
    const oenc = btoa(offer)

    o.peer.ontrack = ({ track }) => {
      setStreams(s => {
        const theirs = s[oenc] ?? new MediaStream()
        theirs.addTrack(track)
        return { ...s, [oenc]: theirs }
      })
    }

    for (const track of stream.getTracks()) {
      o.peer.addTrack(track)
    }

    setConnects(c => ({ ...c, [oenc]: o.connect }))
    setChannels(c => ({ ...c, [oenc]: o.chan }))

    return oenc
  }

  const answer = async (...offers: Offers) => {
    let answers: Answers = {}

    for (const oenc of offers) {
      const offer = atob(oenc)
      const a = await answerer(offer)
      const answer = a.answer
      const aenc = btoa(answer)

      a.peer.ontrack = ({ track }) => {
        setStreams(s => {
          const theirs = s[oenc] ?? new MediaStream()
          theirs.addTrack(track)
          return { ...s, [oenc]: theirs }
        })
      }

      for (const track of stream.getTracks()) {
        a.peer.addTrack(track)
      }

      setChannels(c => ({ ...c, [oenc]: a.chan }))

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

  useEffect(() => void setMyStream(), [])

  window.offer = offer
  window.answer = answer
  window.connect = connect
  window.streams = streams
  window.channels = channels

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
              style={{
                position: "relative",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%) scale(-2, 2)",
                height: "100%",
                filter: "brightness(1.25) saturate(1.25)",
              }}
              autoPlay
              playsInline
              muted
            />
          </div>
        ))}
      </div>
    </div>
  )
}

declare global {
  interface Window {
    offer: () => Promise<string>
    answer: (...offers: Offers) => Promise<Answers>
    connect: (answers: Answers) => Promise<void>
    stringify: typeof stringify
    parse: typeof parse
    uid: typeof uid
    streams: Streams
    channels: Channels
  }
}

window.stringify = stringify
window.parse = parse

render(<Demo />, document.getElementById("root"))
