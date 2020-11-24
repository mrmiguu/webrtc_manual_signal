import React, {
  useRef,
  useState,
  useEffect,
  FunctionComponent,
  Dispatch,
  SetStateAction,
  MutableRefObject,
} from "react"
import { BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom"
import ShareIcon from "@material-ui/icons/Share"
import HomeIcon from "@material-ui/icons/Home"
import DeleteForeverIcon from "@material-ui/icons/DeleteForever"

import "./clipboard"
import "./Demo.scss"
import { auth, firestore } from "./firebase"
import DialMenu from "./DialMenu"
import PersonalRoom from "./PersonalRoom"

const { log } = console
const { keys, values, entries } = Object

/** @type {FunctionComponent<void>} */
const Demo = () => {
  log("<Demo>")

  /** @type {[string, Dispatch<SetStateAction<string>>]} */
  const [uid, setUID] = useState()
  window.uid = uid

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        const { uid } = user
        log(`you signed in @ ${uid}`)
        setUID(uid)
      } else {
        log("you signed out")
        setUID()
      }
    })
    auth.signInAnonymously()
    return unsub
  }, [])

  return (
    <div className={`demo`}>
      <Router>
        {uid && (
          <>
            <Switch>
              <Redirect exact from="/" to={`/${uid}`} />

              <Route path={`/:roomID`}>
                <PersonalRoom uid={uid} />
              </Route>
            </Switch>

            <DialMenu
              menu={{
                [uid]: {
                  icon: <ShareIcon />,
                  onClick() {
                    Clipboard.copy(location.href)
                  },
                },
                Home: {
                  icon: <HomeIcon />,
                  onClick() {
                    const url = new URL(location.href)
                    location.href = url.origin
                  },
                },
                clean_your_room: {
                  icon: <DeleteForeverIcon />,
                  onClick() {
                    alert("cleaning your room...")
                    firestore
                      .collection("rooms")
                      .doc(uid)
                      .collection("users")
                      .get()
                      .then(query => {
                        query.docs.forEach(doc => {
                          doc.ref.delete()
                        })
                        location.reload()
                      })
                  },
                },
              }}
            />
          </>
        )}
      </Router>
    </div>
  )
}

export default Demo
