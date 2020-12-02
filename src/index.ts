import { offerer, answerer } from "./rtc"

const { log } = console

// Safari fix begin
// Safari fix begin
// Safari fix begin

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

isSafari && navigator.mediaDevices.getUserMedia({ audio: true })

// Safari fix end
// Safari fix end
// Safari fix end

// ----------------------------------------------------------------

// Manual signaling code starts here
// Manual signaling code starts here
// Manual signaling code starts here

declare global {
  interface Window {
    offerer: typeof offerer
    answerer: typeof answerer
  }
}

window.offerer = offerer
window.answerer = answerer
