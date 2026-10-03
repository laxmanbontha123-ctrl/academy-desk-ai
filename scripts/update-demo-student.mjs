import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });

const auth = getAuth(app);
const db = getFirestore(app);

const phone = "+919000000001";
const user = await auth.getUserByPhoneNumber(phone);
const ref = db.collection("users").doc(user.uid);
const snapshot = await ref.get();

if (!snapshot.exists) {
  throw new Error("Demo student profile not found.");
}

await ref.update({
  name: "Bontha Laxman",
  updatedAt: new Date(),
});

await auth.updateUser(user.uid, {
  displayName: "Bontha Laxman",
});

console.log("Demo student profile updated: Bontha Laxman");
