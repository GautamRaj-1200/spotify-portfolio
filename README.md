# Spotify API Wrapper

A Node.js Express server that provides simplified access to the Spotify Web API, making it easy to integrate Spotify features into your applications.

> I accidentally committed .env and node_modules as initial commit, But i removed those and also the client id and client secret which got committed, thier access have been revoked from spotify.

## Features

- OAuth 2.0 authentication flow with Spotify
- Automatic token refresh mechanism
- Endpoints for common Spotify operations:
  - View followed artists
  - Get user's top tracks
  - Control playback (play/pause)
  - View currently playing track
  - Get top tracks for artists

## Prerequisites

- Node.js and npm installed
- Spotify Developer account with registered application
- Client ID and Client Secret from Spotify Developer Dashboard

## Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd spotify-portfolio
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Add env variables

4. Start the server:
   ```bash
   npm start
   ```

## Authentication Flow

1. Navigate to `/spotify/login` to initiate the Spotify authorization
2. After successful authorization, you'll be redirected back to your application
3. The server will store access and refresh tokens in memory
4. Tokens will be automatically refreshed when needed

## API Endpoints

### Health Check
```
GET /health
```
Returns a simple status to confirm the server is running.

### Authentication
```
GET /spotify/login
```
Redirects to Spotify's authorization page.

```
GET /spotify/callback
```
Spotify redirects here after user authorizes the application.

```
GET /spotify/refresh_token
```
Manually refresh the access token.

### User Data
```
GET /spotify
```
Fetches aggregated user data including:
- Currently playing track
- Followed artists
- User's top tracks
- Links to control playback

```
GET /spotify/me/following
```
Returns a list of artists the user follows.

```
GET /spotify/me/top-tracks
```
Returns the user's top 10 tracks.

```
GET /spotify/me/now-playing
```
Returns information about the currently playing track.

### Playback Control
```
PUT /spotify/play
```
Plays a track specified by URI in the request body:
```json
{
  "uri": "spotify:track:track_id"
}
```

```
PUT /spotify/pause
```
Pauses the current playback.

### Artist Data
```
GET /spotify/top-tracks/:artist_id
```
Returns the top 10 tracks for a specified artist.

## Usage Example

1. Start the server
2. Navigate to `http://localhost:3000/spotify/login` in your browser
3. After authentication, you can access all other endpoints
4. To get a summary of your Spotify data, visit `http://localhost:3000/spotify`
