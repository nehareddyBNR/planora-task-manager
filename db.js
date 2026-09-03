const mongoose = require("mongoose");

// Fail fast instead of hanging forever if MongoDB is unreachable
// (wrong credentials, IP not in Atlas Network Access list, etc.)
mongoose.set("bufferTimeoutMS", 10000);

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set in the environment");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("MongoDB connected ✅");
};

module.exports = connectDB;