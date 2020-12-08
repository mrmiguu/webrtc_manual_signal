import firebase from "firebase/app"
import "firebase/auth"
import "firebase/firestore"

const { documentId } = firebase.firestore.FieldPath

const { log } = console

firebase.initializeApp({
  apiKey: "AIzaSyAQ0uLJKROQdSkQxfgVuK1gdVKqOpM08I8",
  authDomain: "dummyzoom-2020.firebaseapp.com",
  databaseURL: "https://dummyzoom-2020.firebaseio.com",
  projectId: "dummyzoom-2020",
  storageBucket: "dummyzoom-2020.appspot.com",
  messagingSenderId: "500171578320",
  appId: "1:500171578320:web:d960e6664f1f4af55c77d5",
  measurementId: "G-2KZ7XPKVQT",
})

const pendingUID = firebase
  .auth()
  .signInAnonymously()
  .then(cred => cred.user.uid)

const firestore = firebase.firestore()

export { pendingUID, firestore, documentId }
