# Playlist to Piped Music Converter

## About

This project allows you to convert both YouTube and Spotify playlists into the [Piped Music](https://git.codespace.cz/PipedMusic/PipedMusic) JSON format. It is designed for easy backup and migration of your playlists to the Piped Music app.

### Features
- ✅ **YouTube Playlists**: Paste YouTube playlist URLs for direct conversion
- ✅ **Spotify Playlists**: Convert Spotify playlists using manual input method
- ✅ **Smart Search**: Automatically finds YouTube videos for Spotify tracks
- ✅ **Multiple Playlists**: Process multiple YouTube playlists at once
- ✅ **Piped Music Compatible**: Perfect JSON structure for Piped Music app

**Live App:** [https://yt2pm-playlist.lovable.app/](https://yt2pm-playlist.lovable.app/)

## How to Use

### YouTube Playlists
1. Click the "YouTube" tab
2. Paste your YouTube playlist URLs (one per line)
3. Click "Convert YouTube Playlists"
4. Download the generated JSON file

### Spotify Playlists
1. Click the "Spotify" tab
2. Format your playlist data as:
   ```
   Playlist Name
   Artist 1 - Song Title 1
   Artist 2 - Song Title 2
   ```
3. Paste the formatted data
4. Click "Convert Spotify Playlist"
5. Wait for YouTube search to complete
6. Download the generated JSON file

For detailed Spotify instructions, see [SPOTIFY_SUPPORT.md](SPOTIFY_SUPPORT.md).

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
