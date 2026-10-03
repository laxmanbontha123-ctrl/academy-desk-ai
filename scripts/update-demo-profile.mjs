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

const user = await auth.getUserByPhoneNumber("+919000000001");
await db.collection("users").doc(user.uid).update({
  name: "Bontha Laxman",
  email: "laxman.bontha123@gmail.com",
  updatedAt: new Date(),
});

console.log("Demo student profile updated with name and profile email.");
