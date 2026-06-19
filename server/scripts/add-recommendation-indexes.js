/**
 * Database Index Migration Script
 *
 * Run: node scripts/add-recommendation-indexes.js
 *
 * Adds missing indexes for recommendation performance:
 * - Users: role, membership.plan, membership.active, membership.expiresAt
 * - RecommendationHistory: userId, jobId, emailSentAt
 * - RecommendationClicks: userId, jobId, clickedAt
 */

const mongoose = require("mongoose");

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/maven-naukri";
  await mongoose.connect(uri);
  console.log(`[indexes] Connected to ${uri}`);

  const db = mongoose.connection.db;

  // Users indexes
  const usersCollection = db.collection("users");
  const existingUserIndexes = await usersCollection.indexes();
  const userIndexNames = existingUserIndexes.map((i) => i.name);

  const desiredUserIndexes = [
    { key: { role: 1, "membership.plan": 1, "membership.active": 1, "membership.expiresAt": 1 }, name: "recommendations_lookup" },
    { key: { "membership.expiresAt": 1 }, name: "membership_expiry" },
  ];

  for (const idx of desiredUserIndexes) {
    if (!userIndexNames.includes(idx.name)) {
      await usersCollection.createIndex(idx.key, { name: idx.name });
      console.log(`[indexes] Created index "${idx.name}" on users collection`);
    } else {
      console.log(`[indexes] Index "${idx.name}" already exists on users collection`);
    }
  }

  // RecommendationHistory indexes
  const histCollection = db.collection("recommendationhistories");
  const existingHistIndexes = await histCollection.indexes();
  const histIndexNames = existingHistIndexes.map((i) => i.name);

  const desiredHistIndexes = [
    { key: { userId: 1, emailSentAt: -1 }, name: "user_email_sent" },
    { key: { jobId: 1 }, name: "job_lookup" },
  ];

  for (const idx of desiredHistIndexes) {
    if (!histIndexNames.includes(idx.name)) {
      await histCollection.createIndex(idx.key, { name: idx.name });
      console.log(`[indexes] Created index "${idx.name}" on recommendationhistories collection`);
    } else {
      console.log(`[indexes] Index "${idx.name}" already exists on recommendationhistories collection`);
    }
  }

  // RecommendationClick indexes
  const clickCollection = db.collection("recommendationclicks");
  const existingClickIndexes = await clickCollection.indexes();
  const clickIndexNames = existingClickIndexes.map((i) => i.name);

  const desiredClickIndexes = [
    { key: { clickedAt: -1 }, name: "click_time_lookup" },
  ];

  for (const idx of desiredClickIndexes) {
    if (!clickIndexNames.includes(idx.name)) {
      await clickCollection.createIndex(idx.key, { name: idx.name });
      console.log(`[indexes] Created index "${idx.name}" on recommendationclicks collection`);
    } else {
      console.log(`[indexes] Index "${idx.name}" already exists on recommendationclicks collection`);
    }
  }

  console.log("[indexes] Migration complete");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("[indexes] Migration failed:", err);
  process.exit(1);
});
