import firebase from "firebase/app"
import "firebase/auth"
import "firebase/database"
import "firebase/firestore"

const { log, warn, error } = console

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

const auth = firebase.auth()
const realtime = firebase.database()
const firestore = firebase.firestore()
const { TIMESTAMP } = firebase.database.ServerValue
const { serverTimestamp } = firebase.firestore.FieldValue

/**
 * @param {string} uid
 */
const forcePresence = (uid) => {
  // Create a reference to this user's specific status node.
  // This is where we will store data about being online/offline.
  const realtimeOnlineRef = realtime.ref(`/online/${uid}`)

  // We'll create two constants which we will write to
  // the Realtime database when this device is offline
  // or online.
  const isOfflineForDatabase = {
    state: "offline",
    last_changed: TIMESTAMP,
  }

  const isOnlineForDatabase = {
    state: "online",
    last_changed: TIMESTAMP,
  }

  var firestoreOnlineRef = firestore.doc(`/online/${uid}`)

  // Firestore uses a different server timestamp value, so we'll
  // create two more constants for Firestore state.
  var isOfflineForFirestore = {
    state: "offline",
    last_changed: serverTimestamp(),
  }

  var isOnlineForFirestore = {
    state: "online",
    last_changed: serverTimestamp(),
  }

  const connectedRef = realtime.ref(".info/connected")

  /**
   * @param {firebase.database.DataSnapshot} snapshot
   */
  const onConnected = async (snapshot) => {
    const online = Boolean(snapshot.val())

    if (!online) {
      // Instead of simply returning, we'll also set Firestore's state
      // to 'offline'. This ensures that our Firestore cache is aware
      // of the switch to 'offline.'
      firestoreOnlineRef.set(isOfflineForFirestore)
      return
    }

    await realtimeOnlineRef.onDisconnect().set(isOfflineForDatabase)

    realtimeOnlineRef.set(isOnlineForDatabase)

    // We'll also add Firestore set here for when we come online.
    firestoreOnlineRef.set(isOnlineForFirestore)
  }

  connectedRef.on("value", onConnected)
  return () => connectedRef.off("value", onConnected)
}

export { firebase, auth, firestore, serverTimestamp, forcePresence }
