import mongoose from "mongoose";

let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required. Set it in your environment before starting the server.");
  }

  connectionPromise ??= mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    })
    .then((connection) => {
      console.log("MongoDB connected");
      return connection;
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
};

export default connectDB;
