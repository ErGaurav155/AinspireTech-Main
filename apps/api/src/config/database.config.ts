import mongoose from "mongoose";

let isConnected = false;

/* -------------------- CONNECTION -------------------- */
export async function connectToDatabase(): Promise<void> {
  const MONGODB_URL = process.env.MONGODB_URL;

  if (!MONGODB_URL) {
    throw new Error("❌ MONGODB_URL is not defined");
  }

  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }

  try {
    console.log("🔗 Connecting to MongoDB...");

    await mongoose.connect(MONGODB_URL, {
      maxPoolSize: process.env.NODE_ENV === "production" ? 50 : 10,
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      retryWrites: true,
      w: "majority",
    });

    isConnected = true;

    console.log(
      `✅ MongoDB connected → ${mongoose.connection.db?.databaseName}`,
    );
  } catch (err) {
    isConnected = false;
    console.error("❌ MongoDB connection failed");
    throw err;
  }
}

/* -------------------- LIFECYCLE -------------------- */
mongoose.connection.on("connected", () => {
  console.log("🟢 MongoDB connection established");
});

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("🟡 MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("🔴 MongoDB error:", err.message);
});

/* -------------------- HEALTH CHECK -------------------- */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (mongoose.connection.readyState !== 1) return false;
    await mongoose.connection.db?.admin().ping();
    return true;
  } catch {
    return false;
  }
}

export { mongoose };
