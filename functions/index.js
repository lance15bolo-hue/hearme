const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const crypto = require("node:crypto");

initializeApp();
const db = getFirestore();
const WEB_API_KEY = defineString("HEARME_WEB_API_KEY");
const USERNAME_RE = /^[a-z0-9._]{3,20}$/;
const RESERVATION_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 8;

function normalizeUsername(value) {
  if (typeof value !== "string") throw new HttpsError("invalid-argument", "Invalid username.");
  const username = value.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) throw new HttpsError("invalid-argument", "Invalid username.");
  return username;
}

function hashKey(value) {
  return crypto.createHash("sha256").update(String(value || "unknown")).digest("hex");
}

async function enforceRateLimit(request, normalizedUsername) {
  const ip = request.rawRequest?.ip || "unknown-ip";
  const keys = [
    `ip_${hashKey(ip)}`,
    `username_${hashKey(normalizedUsername)}`,
  ];
  const refs = keys.map((key) => db.collection("_usernameLoginRateLimits").doc(key));
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
    for (const snap of snapshots) {
      const data = snap.exists ? snap.data() : {};
      const startedAt = Number(data.startedAt || 0);
      const count = now - startedAt > RATE_WINDOW_MS ? 0 : Number(data.count || 0);
      if (count >= RATE_LIMIT) {
        throw new HttpsError("resource-exhausted", "Too many attempts. Try again later.");
      }
    }
    snapshots.forEach((snap, index) => {
      const data = snap.exists ? snap.data() : {};
      const startedAt = Number(data.startedAt || 0);
      const expired = now - startedAt > RATE_WINDOW_MS;
      tx.set(refs[index], {
        startedAt: expired || !startedAt ? now : startedAt,
        count: expired || !startedAt ? 1 : Number(data.count || 0) + 1,
        updatedAt: Timestamp.fromMillis(now),
      });
    });
  });
}

exports.reserveUsername = onCall({ region: "asia-southeast1" }, async (request) => {
  const username = normalizeUsername(request.data?.username);
  await enforceRateLimit(request, username);
  const usernameRef = db.collection("usernames").doc(username);
  const reservationRef = db.collection("_usernameReservations").doc(username);
  const reservationToken = crypto.randomBytes(32).toString("hex");
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const [usernameSnap, reservationSnap] = await Promise.all([
      tx.get(usernameRef),
      tx.get(reservationRef),
    ]);
    if (usernameSnap.exists) throw new HttpsError("already-exists", "Username is unavailable.");
    if (reservationSnap.exists && Number(reservationSnap.data().expiresAtMs || 0) > now) {
      throw new HttpsError("already-exists", "Username is unavailable.");
    }
    tx.set(reservationRef, {
      reservationTokenHash: hashKey(reservationToken),
      expiresAtMs: now + RESERVATION_MS,
      createdAt: Timestamp.fromMillis(now),
    });
  });

  return { reservationToken };
});

exports.releaseUsernameReservation = onCall({ region: "asia-southeast1" }, async (request) => {
  const username = normalizeUsername(request.data?.username);
  const token = request.data?.reservationToken;
  if (typeof token !== "string" || token.length < 32) {
    throw new HttpsError("invalid-argument", "Invalid reservation.");
  }
  const ref = db.collection("_usernameReservations").doc(username);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data().reservationTokenHash === hashKey(token)) tx.delete(ref);
  });
  return { released: true };
});

exports.claimUsername = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in is required.");
  const username = normalizeUsername(request.data?.username);
  const token = request.data?.reservationToken;
  if (typeof token !== "string" || token.length < 32) {
    throw new HttpsError("invalid-argument", "Invalid reservation.");
  }

  const uid = request.auth.uid;
  const usernameRef = db.collection("usernames").doc(username);
  const reservationRef = db.collection("_usernameReservations").doc(username);
  const userRef = db.collection("users").doc(uid);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const [usernameSnap, reservationSnap, userSnap] = await Promise.all([
      tx.get(usernameRef), tx.get(reservationRef), tx.get(userRef),
    ]);
    if (!userSnap.exists) throw new HttpsError("failed-precondition", "User profile is missing.");
    const profile = userSnap.data();
    if (profile.usernameNormalized && profile.usernameNormalized !== username) {
      throw new HttpsError("failed-precondition", "A username is already assigned to this account.");
    }
    if (usernameSnap.exists && usernameSnap.data().uid !== uid) {
      throw new HttpsError("already-exists", "Username is unavailable.");
    }
    if (!reservationSnap.exists
      || reservationSnap.data().reservationTokenHash !== hashKey(token)
      || Number(reservationSnap.data().expiresAtMs || 0) < now) {
      throw new HttpsError("failed-precondition", "Username reservation expired. Please sign up again.");
    }

    tx.set(usernameRef, { uid, createdAt: Timestamp.fromMillis(now) });
    tx.set(userRef, { username, usernameNormalized: username }, { merge: true });
    tx.delete(reservationRef);
  });

  return { claimed: true };
});

exports.signInWithUsername = onCall({ region: "asia-southeast1" }, async (request) => {
  const username = normalizeUsername(request.data?.username);
  const password = request.data?.password;
  if (typeof password !== "string" || password.length < 1 || password.length > 4096) {
    throw new HttpsError("invalid-argument", "Invalid credentials.");
  }
  await enforceRateLimit(request, username);

  const usernameSnap = await db.collection("usernames").doc(username).get();
  if (!usernameSnap.exists) throw new HttpsError("unauthenticated", "Invalid credentials.");
  const uid = usernameSnap.data().uid;
  const userSnap = await db.collection("users").doc(uid).get();
  const email = userSnap.exists ? userSnap.data().email : null;
  if (typeof email !== "string" || !email.includes("@")) {
    throw new HttpsError("unauthenticated", "Invalid credentials.");
  }

  let authResponse;
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(WEB_API_KEY.value())}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    authResponse = await response.json();
    if (!response.ok || !authResponse.localId || authResponse.localId !== uid) {
      throw new Error("Invalid credentials");
    }
  } catch (error) {
    throw new HttpsError("unauthenticated", "Invalid credentials.");
  }

  // The email is never returned to the browser. Only return a custom token
  // after Firebase has verified the supplied password for this account.
  const customToken = await getAuth().createCustomToken(uid);
  return { customToken };
});
