
const mongoose = require("mongoose");

const connectDatabase = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error("MONGO_URI is missing in backend/.env");
    }

    // Display URI without exposing password
    const safeURI = mongoURI.replace(
      /\/\/([^:]+):([^@]+)@/,
      "//$1:****@"
    );

    console.log("Loaded MongoDB URI:", safeURI);
    console.log("Connecting to MongoDB...");

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("MongoDB Connected Successfully!");
    console.log("Database:", mongoose.connection.name);
    console.log("Host:", mongoose.connection.host);

    return mongoose.connection;

  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    throw error;
  }
};

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = {
  connectDatabase,
  isDbConnected,
};


