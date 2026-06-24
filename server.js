import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { setupSocket } from "./socket/socketHandler.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const isVercel = Boolean(process.env.VERCEL);

const defaultClientUrls = ["http://localhost:5173"];
const clientUrls = (process.env.CLIENT_URL || defaultClientUrls.join(","))
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || clientUrls.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true
};

app.set("io", null);

app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const requireDatabase = async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    res.status(503).json({ message: "Database connection failed" });
  }
};

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    app: "soket-io-chat",
    health: "/api/health"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "soket-io-chat" });
});

app.use("/api", requireDatabase);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

app.use((error, _req, res, _next) => {
  console.error("Request failed:", error.message);
  res.status(error.status || 500).json({ message: error.message || "Internal server error" });
});

if (!isVercel) {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: clientUrls,
      credentials: true
    }
  });
  app.set("io", io);
  setupSocket(io);

  const port = process.env.PORT || 5000;
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Stop the existing server or set a different PORT.`);
      process.exit(1);
    }

    console.error("Server failed to start:", error.message);
    process.exit(1);
  });

  connectDB()
    .then(() => {
      server.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    })
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
      process.exit(1);
    });
}

export default app;
