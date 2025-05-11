import express from "express";
import cors from "cors";
import config from "./config.js";
import { configureSpotifyRouter } from "./routes/spotify.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ message: "ok" });
});

// Mount Spotify routes
app.use("/spotify", configureSpotifyRouter(config));

// Start the server
app.listen(config.PORT, () => {
  console.log(`Server started on port ${config.PORT}`);
});
