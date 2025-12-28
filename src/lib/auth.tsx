import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user; // uid/email/displayName/photoURL
}

export async function logout() {
  await signOut(auth);
}
