import { newrtc, newoffer, newanswer, connectrtc } from "./rtc"

// Safari fix begin
// Safari fix begin
// Safari fix begin
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
const fixSafariBtn = document.getElementById("fix-safari")
fixSafariBtn.hidden = !isSafari
async function fixSafari() {
  await navigator.mediaDevices.getUserMedia({ audio: true })
  fixSafariBtn.hidden = true
}
window.fixSafari = fixSafari
// Safari fix end
// Safari fix end
// Safari fix end

// ----------------------------------------------------------------

// Manual signaling code starts here
// Manual signaling code starts here
// Manual signaling code starts here

const log = msg => (div.innerHTML += `<br>${msg}`)

const { peer: pc, chan: dc } = newrtc({
  onICEConnectionStateChange(e) {
    console.log(`newrtc: onICEConnectionStateChange`)
    log(pc.iceConnectionState)
  },
  onOpen() {
    console.log(`newrtc: onOpen`)
    chat.select()
  },
  onMessage(e) {
    console.log(`newrtc: onMessage`)
    log(`> ${e.data}`)
  },
})

async function createOffer() {
  button.disabled = true
  const o = await newoffer(pc)
  offer.value = o
  offer.select()
  answer.placeholder = "Paste answer here"
}
window.createOffer = createOffer

offer.onkeypress = async function (e) {
  if (e.keyCode != 13) return
  button.disabled = offer.disabled = true
  const a = await newanswer(pc, offer.value)
  answer.focus()
  answer.value = a
  answer.select()
}

answer.onkeypress = async function (e) {
  if (e.keyCode != 13) return
  answer.disabled = true
  await connectrtc(pc, answer.value)
}

chat.onkeypress = function (e) {
  if (e.keyCode != 13) return
  dc.send(chat.value)
  log(chat.value)
  chat.value = ""
}
