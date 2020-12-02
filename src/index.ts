import { offerer, answerer } from "./rtc"

const { log } = console

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
isSafari && navigator.mediaDevices.getUserMedia({ audio: true })

declare global {
  interface Window {
    offerer: typeof offerer
    answerer: typeof answerer
  }
}

window.offerer = offerer
window.answerer = answerer
