/**
 * seedLibrary.js
 *
 * One-time seed script for the KineticIQ meal + workout library.
 * Writes meals_seed.json and workouts_seed.json into Firestore
 * at meals/{mealId} and workouts/{workoutId}.
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const serviceAccount = require("./serviceAccountKey.json");
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function seedCollection(collectionName, fileName) {
  const filePath = path.join(__dirname, fileName);
  const items = JSON.parse(fs.readFileSync(filePath, "utf8"));

  console.log(`Seeding ${items.length} docs into "${collectionName}"...`);

  const chunkSize = 400;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = db.batch();

    for (const item of chunk) {
      const { id, ...data } = item;
      const docRef = db.collection(collectionName).doc(id);
      batch.set(docRef, {
        ...data,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    console.log(`  Committed ${chunk.length} docs (${i + chunk.length}/${items.length})`);
  }
}

async function main() {
  try {
    await seedCollection("meals", "meals_seed.json");
    await seedCollection("workouts", "workouts_seed.json");
    console.log("Seed complete.");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  }
}

main();