import React, { FunctionComponent, useEffect, useState } from "react"
import { render } from "react-dom"

import { offerer, answerer } from "./rtc"

const { log } = console
const { random, ceil, sqrt } = Math
const { entries } = Object

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
isSafari && navigator.mediaDevices.getUserMedia({ audio: true })

const uid = Date.now() * random()

const Demo: FunctionComponent<{}> = () => {
  const [streams, setStreams] = useState<{ [key: string]: MediaStream }>({})
  const streamList = entries(streams)
  const squareSize = ceil(sqrt(streamList.length))

  const setMyStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    setStreams(s => ({ ...s, [uid]: stream }))
  }

  useEffect(() => void setMyStream(), [])

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

render(<Demo />, document.getElementById("root"))
