import { offerer, answerer } from "./rtc"

const { log, assert } = console

const testRTC01 = async () => {
  log(`${testRTC01.name}(): start\t--------------------------------`)

  const o = await offerer()
  const fromA = new Promise<string>(resolve => (o.chan.onmessage = e => resolve(e.data)))
  const openO = new Promise(resolve => (o.chan.onopen = resolve))

  const a = await answerer(o.offer)
  const fromO = new Promise<string>(resolve => (a.chan.onmessage = e => resolve(e.data)))
  const openA = new Promise(resolve => (a.chan.onopen = resolve))

  await o.connect(a.answer)

  await openA
  await openO

  a.chan.send("howdy~!")
  const howdy = await fromA
  assert(howdy === "howdy~!", "message from answerer failed")

  o.chan.send("partner?")
  const partner = await fromO
  assert(partner === "partner?", "message from offerer failed")

  log(`${testRTC01.name}(): done\t--------------------------------`)
}

export default async () => {
  await testRTC01()
}
