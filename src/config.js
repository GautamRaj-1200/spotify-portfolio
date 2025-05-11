import dotenv from "dotenv";
dotenv.config();

const config = {
  PORT: process.env.PORT,
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
  REDIRECT_URI: process.env.REDIRECT_URI,
};

export default config;
