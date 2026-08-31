import { signInWithPopup, signOut } from "firebase/auth";
import { firebaseAuth, googleProvider } from "./firebase";

export const firebaseGoogleIdToken = async (): Promise<string> => {
  const credential = await signInWithPopup(firebaseAuth, googleProvider);
  return credential.user.getIdToken();
};

export const signOutFirebase = (): Promise<void> => signOut(firebaseAuth);
