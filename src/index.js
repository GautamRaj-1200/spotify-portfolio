import express from "express";
import config from "./config.js";
import cors from "cors";
import querystring from "querystring";
import axios from "axios";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ message: "ok" });
});

const CLIENT_ID = config.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = config.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = config.REDIRECT_URI;

let access_token = "";
let refresh_token = "";

function generateRandomString(length) {
  return [...Array(length)].map(() => Math.random().toString(36)[2]).join("");
}

// 1. Login route
app.get("/login", (req, res) => {
  const state = generateRandomString(16);
  const scope =
    "user-follow-read user-modify-playback-state user-read-playback-state user-top-read streaming app-remote-control";

  const authUrl =
    "https://accounts.spotify.com/authorize?" +
    querystring.stringify({
      response_type: "code",
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
      state: state,
    });

  res.redirect(authUrl);
});

// 2. Callback route
app.get("/spotify/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    access_token = response.data.access_token;
    refresh_token = response.data.refresh_token;

    res.send("Authorization successful. You can now use the API endpoints.");
  } catch (err) {
    res.status(500).json({ error: "Failed to get tokens", details: err });
  }
});

// 3. Get followed artists
app.get("/me/following", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.spotify.com/v1/me/following?type=artist&limit=20",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const artistNames = response.data.artists.items.map(
      (artist) => artist.name
    );
    res.json({ followed_artists: artistNames });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch followed artists",
      details: err.response?.data || err.message,
    });
  }
});

// 4. Pause playback
app.put("/pause", async (req, res) => {
  try {
    await axios.put("https://api.spotify.com/v1/me/player/pause", null, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    res.json({ message: "Playback paused." });
  } catch (err) {
    res
      .status(500)
      .json({
        error: "Failed to pause playback",
        details: err.response?.data || err.message,
      });
  }
});

// 5. Get top 10 tracks for an artist
app.get("/top-tracks/:artist_id", async (req, res) => {
  const { artist_id } = req.params;

  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/artists/${artist_id}/top-tracks?market=US`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const topTracks = response.data.tracks.slice(0, 10).map((track) => ({
      name: track.name,
      uri: track.uri,
    }));

    res.json({ top_tracks: topTracks });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch top tracks",
      details: err.response?.data || err.message,
    });
  }
});

// 6. Play a track by URI
app.put("/play", async (req, res) => {
  const { uri } = req.body;

  if (!uri) {
    return res.status(400).json({ error: "URI is required" });
  }

  try {
    await axios.put(
      "https://api.spotify.com/v1/me/player/play",
      {
        uris: [uri],
      },
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    res.json({ message: `Started playing track: ${uri}` });
  } catch (err) {
    res
      .status(500)
      .json({
        error: "Failed to play track",
        details: err.response?.data || err.message,
      });
  }
});

// 7. Get user's top tracks
app.get("/me/top-tracks", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=short_term",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const topTracks = response.data.items.map((track) => ({
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      uri: track.uri,
    }));

    res.json({ top_tracks: topTracks });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch your top tracks",
      details: err.response?.data || err.message,
    });
  }
});

// 8. Get currently playing track
app.get("/me/now-playing", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    // If no track is playing
    if (response.status === 204) {
      return res.json({
        now_playing: null,
        message: "No track currently playing",
      });
    }

    const track = response.data.item;

    res.json({
      now_playing: {
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        uri: track.uri,
        progress_ms: response.data.progress_ms,
        duration_ms: track.duration_ms,
      },
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch currently playing track",
      details: err.response?.data || err.message,
    });
  }
});

// 9. Main /spotify route that aggregates data
app.get("/spotify", async (req, res) => {
  if (!access_token) {
    return res.status(401).json({
      error: "Not authenticated with Spotify",
      login_url: "/login",
    });
  }

  try {
    // Get followed artists
    const followingResponse = await axios.get(
      "https://api.spotify.com/v1/me/following?type=artist&limit=20",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const following = followingResponse.data.artists.items.map((artist) => ({
      name: artist.name,
      id: artist.id,
    }));

    // Get top tracks
    const topTracksResponse = await axios.get(
      "https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=short_term",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const topTracks = topTracksResponse.data.items.map((track) => ({
      name: track.name,
      artist: track.artists[0].name,
      uri: track.uri,
      play_url: `/play?uri=${encodeURIComponent(track.uri)}`,
    }));

    // Get now playing
    let nowPlaying = null;
    try {
      const nowPlayingResponse = await axios.get(
        "https://api.spotify.com/v1/me/player/currently-playing",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      if (nowPlayingResponse.status !== 204 && nowPlayingResponse.data.item) {
        const track = nowPlayingResponse.data.item;
        nowPlaying = {
          name: track.name,
          artist: track.artists[0].name,
          album: track.album.name,
          uri: track.uri,
          progress_ms: nowPlayingResponse.data.progress_ms,
          duration_ms: track.duration_ms,
        };
      }
    } catch (err) {
      // Don't fail the entire request if now_playing fails
      console.error("Error fetching now playing:", err.message);
    }

    // Return combined data
    res.json({
      now_playing: nowPlaying,
      stop_playback_url: "/pause",
      followed_artists: following,
      top_tracks: topTracks,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch Spotify data",
      details: err.response?.data || err.message,
    });
  }
});

// 10. Token refresh endpoint
app.get("/refresh_token", async (req, res) => {
  if (!refresh_token) {
    return res.status(400).json({ error: "No refresh token available" });
  }

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        refresh_token: refresh_token,
        grant_type: "refresh_token",
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    access_token = response.data.access_token;

    // If a new refresh token is provided, update it
    if (response.data.refresh_token) {
      refresh_token = response.data.refresh_token;
    }

    res.json({ message: "Token refreshed successfully" });
  } catch (err) {
    res.status(500).json({
      error: "Failed to refresh token",
      details: err.response?.data || err.message,
    });
  }
});

// Helper endpoint to play a track using GET (for easy links in the JSON response)
app.get("/play", async (req, res) => {
  const { uri } = req.query;

  if (!uri) {
    return res.status(400).json({ error: "URI is required" });
  }

  try {
    await axios.put(
      "https://api.spotify.com/v1/me/player/play",
      {
        uris: [uri],
      },
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    res.json({ message: `Started playing track: ${uri}` });
  } catch (err) {
    res
      .status(500)
      .json({
        error: "Failed to play track",
        details: err.response?.data || err.message,
      });
  }
});

app.listen(config.PORT, () => {
  console.log(`Server started at ${config.PORT}`);
});
