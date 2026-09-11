const mongoose = require("mongoose");

let isConnected = false;

async function connectMongo() {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return mongoose;
  }

  try {
    const MONGO_URI =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/";

    await mongoose.connect(MONGO_URI);

    isConnected = true;
    console.log("✅ Connected to MongoDB:", MONGO_URI);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }

  return mongoose;
}

module.exports = { connectMongo, mongoose };