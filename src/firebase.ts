import firebase from "firebase/app"
import "firebase/auth"
import "firebase/firestore"

;(window as any).firebase = firebase
require("../init-firebase")

const { documentId } = firebase.firestore.FieldPath

const { log } = console

const pendingUID = firebase
  .auth()
  .signInAnonymously()
  .then(cred => cred.user.uid)

const firestore = firebase.firestore()

export { pendingUID, firestore, documentId }
