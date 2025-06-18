# Spotify Playlist Support

This application now supports converting Spotify playlists to Piped Music format! Here's how to use the new feature:

## How It Works

1. **Manual Input Method**: Since Spotify's API requires authentication that's complex for client-side apps, we use a manual input approach where you provide the playlist data in a simple text format.

2. **YouTube Search**: The app automatically searches YouTube for each song from your Spotify playlist and finds matching video IDs.

3. **Piped Music Format**: The output is the same JSON format used for YouTube playlists, making it compatible with Piped Music.

## How to Use

### Step 1: Get Your Spotify Playlist Data

You can get your Spotify playlist data in several ways:

#### Option A: Manual Copy-Paste
1. Open your Spotify playlist
2. Copy the song titles and artists
3. Format them as: `Artist Name - Song Title`

#### Option B: Export Tools
Use third-party tools like:
- Spotify playlist exporters
- Browser extensions that can extract playlist data
- Spotify's own export features (if available)

### Step 2: Format the Data

The app expects this format:
```
Playlist Name
Artist 1 - Song Title 1
Artist 2 - Song Title 2
Artist 3 - Song Title 3
...
```

**Example:**
```
My Favorite Rock Songs
The Beatles - Hey Jude
Queen - Bohemian Rhapsody
Led Zeppelin - Stairway to Heaven
Pink Floyd - Wish You Were Here
```

### Step 3: Convert

1. Click the "Spotify" tab in the app
2. Paste your formatted playlist data
3. Click "Convert Spotify Playlist"
4. Wait for the app to search YouTube for each song
5. Download the generated JSON file

## Features

- ✅ **Smart Search**: Automatically finds YouTube videos for Spotify tracks
- ✅ **Error Handling**: Continues processing even if some songs aren't found
- ✅ **Progress Tracking**: Shows which songs are being processed
- ✅ **Same Output Format**: Compatible with existing Piped Music imports

## Limitations

- **Manual Input Required**: Due to Spotify API authentication complexity
- **Search Accuracy**: YouTube search results may not always match exactly
- **Rate Limiting**: Includes delays between searches to avoid overwhelming services
- **CORS Limitations**: Depends on proxy services for YouTube search

## Tips for Better Results

1. **Clean Song Titles**: Remove extra text like "(Remastered)" or "[Explicit]"
2. **Correct Artist Names**: Use the main artist name, avoid featuring artists
3. **Check Results**: Review the generated playlist to ensure accuracy
4. **Manual Fixes**: You can manually edit the JSON if needed

## Future Improvements

Potential enhancements for future versions:
- Backend service for direct Spotify API access
- YouTube Data API integration for better search accuracy
- Batch processing optimizations
- Support for Spotify playlist URLs (requires backend)

## Troubleshooting

**No songs found**: Check your input format and ensure artist/song names are correct
**Slow processing**: This is normal due to rate limiting between searches
**Proxy errors**: The app tries multiple proxy services automatically

## Example Output

The generated JSON will look like this:
```json
{
  "playlists": [
    {
      "id": "spotify_1234567890_0",
      "name": "My Favorite Rock Songs",
      "n": 1
    }
  ],
  "songs": [
    {
      "id": "A_MjCqQoLLA",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "list": "spotify_1234567890_0",
      "n": 1
    }
  ]
}
```

This format is identical to YouTube playlist exports and fully compatible with Piped Music!
