import firebase from "firebase/app"
;(window as any).firebase = firebase
require("../init-firebase")

import "firebase/auth"
import "firebase/firestore"

import { useCollection, useCollectionData, useDocument, useDocumentData } from "react-firebase-hooks/firestore"

const anonymousUID = firebase
  .auth()
  .signInAnonymously()
  .then(cred => cred.user.uid)

type UseCollection = [firebase.firestore.QuerySnapshot, boolean, Error]
type UseCollectionData<T> = [T[], boolean, Error]
type UseDocument = [firebase.firestore.DocumentSnapshot, boolean, Error]
type UseDocumentData<T> = [T, boolean, Error]

const waitForDocument = async (
  collectionRef: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>,
) => {
  const data = await new Promise<firebase.firestore.DocumentData>(resolve => {
    const unsub = collectionRef.onSnapshot(querySnapshot => {
      querySnapshot.docChanges().forEach(async docChange => {
        if (docChange.type !== "added") {
          return
        }
        unsub()
        const { doc } = docChange
        const data = doc.data()
        await doc.ref.delete()
        resolve(data)
      })
    })
  })

  return data
}

export { anonymousUID, waitForDocument, UseCollection, UseCollectionData, UseDocument, UseDocumentData }
