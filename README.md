# YouTube & Spotify to Piped Music Converter

## About

This project allows you to convert multiple YouTube and Spotify playlists into the [Piped Music](https://git.codespace.cz/PipedMusic/PipedMusic) JSON format. It is designed for easy backup and migration of your playlists to the Piped Music app. Simply paste your YouTube and Spotify playlist URLs, and the app will generate a compatible JSON file for download or import.

### Features

- **Multi-Platform Support**: Convert both YouTube and Spotify playlists
- **Batch Processing**: Handle multiple playlists at once
- **Organized Export**: Each playlist maintains its name and organization
- **Piped Music Format**: Perfect JSON structure for Piped Music app

### Supported URL Formats

**YouTube:**
- `https://www.youtube.com/playlist?list=PLAYLIST_ID`
- `https://youtube.com/playlist?list=PLAYLIST_ID`

**Spotify:**
- `https://open.spotify.com/playlist/PLAYLIST_ID`
- `spotify:playlist:PLAYLIST_ID`

### Spotify Web API Integration

This application supports **full Spotify playlist conversion** via the official Spotify Web API.

#### Setup

1. **Get Spotify API Credentials**:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app to get your Client ID and Client Secret

2. **Configure Environment Variables**:
   - Copy `.env.example` to `.env`
   - Add your Spotify credentials to the `.env` file:
     ```
     VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
     VITE_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
     ```

#### How it works

1. **Spotify Playlist Processing**: The app uses Spotify Web API to extract track metadata from playlists
2. **YouTube Search**: Each track is automatically searched on YouTube to find matching videos
3. **Video ID Extraction**: YouTube video IDs are collected and added to the Piped Music JSON
4. **Complete Integration**: No manual steps required - just paste Spotify URLs alongside YouTube URLs

#### Authentication

The application uses Spotify's Client Credentials flow for authentication, which allows access to public playlists without requiring user login.

**Live App:** [https://yt2pm-playlist.lovable.app/](https://yt2pm-playlist.lovable.app/)

## Project info

**URL**: https://lovable.dev/projects/53cdc0d9-1432-4ac9-a513-5f6a69ff7fb3

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/53cdc0d9-1432-4ac9-a513-5f6a69ff7fb3) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/53cdc0d9-1432-4ac9-a513-5f6a69ff7fb3) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
