/**
 * CareOps AI - Database Connection Manager
 * 
 * Handles resilient Mongoose connection to MongoDB.
 */

const mongoose = require("mongoose");
const dns = require("dns");

// Configure resilient public DNS resolvers to handle SRV records on Windows
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (dnsErr) {
  // Ignore in environments where custom DNS servers cannot be set
}

let isConnected = false;

async function connectDB(customUri = null) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri =
    customUri ||
    process.env.DATABASE_URL ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/careops";

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    isConnected = true;
    console.log(`[CareOps DB] Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error(`[CareOps DB Error] Failed to connect to MongoDB: ${error.message}`);
    // Do not crash outright if in test mode or local sandbox
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
    throw error;
  }
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

module.exports = {
  connectDB,
  disconnectDB,
};
