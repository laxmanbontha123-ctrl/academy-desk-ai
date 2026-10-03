import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getAdminApp() {
  const existingApps = getApps();

  if (existingApps.length > 0) {
    return existingApps[0];
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin configuration. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.",
    );
  }

  return initializeApp({
    credential: cert({
      projectId: projectId.trim(),
      clientEmail: clientEmail.trim(),
      privateKey: privateKey
        .trim()
        .replace(/^['"]|['"]$/g, "")
        .replace(/\\r?\\n/g, "\n")
        .replace(/\r\n/g, "\n"),
    }),
  });
}

function createLazyService<T extends object>(
  getService: () => T,
): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const service = getService();
      const value = Reflect.get(service, property, service);

      return typeof value === "function"
        ? value.bind(service)
        : value;
    },
  });
}

export const adminAuth = createLazyService<Auth>(() => getAuth(getAdminApp()));
export const adminDb = createLazyService<Firestore>(() =>
  getFirestore(getAdminApp()),
);
