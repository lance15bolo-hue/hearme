// Pure URL parser shared by the cleanup trigger and its local checks.
const RECORDING_BUCKET = "hearme-d7bd1.firebasestorage.app";
function recordingPath(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    const prefix = `/v0/b/${RECORDING_BUCKET}/o/`;
    if (url.protocol !== "https:" || url.hostname !== "firebasestorage.googleapis.com"
      || !url.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    // Only the recording names produced by the current RecordingContext.
    return /^recordings\/hearme_\d+\.webm$/.test(path) ? path : null;
  } catch (_) { return null; }
}

// Read every remaining recording reference, including other users' sessions.
// Compare paths rather than URLs, since download tokens/query order can differ.
async function cleanupRecording({ recordingUrl, database, bucket }) {
  const path = recordingPath(recordingUrl);
  if (!path) return "no-managed-recording";
  const remaining = await database.collection("academicSessions").select("recordingUrl").get();
  if (remaining.docs.some((item) => recordingPath(item.data().recordingUrl) === path)) return "still-referenced";
  await bucket.file(path).delete({ ignoreNotFound: true });
  return "removed";
}
module.exports = { RECORDING_BUCKET, recordingPath, cleanupRecording };
