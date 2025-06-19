const getSpotifyAccessToken = async () => {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Failed to get Spotify access token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Spotify access token:', error);
    throw error;
  }
};

const extractSpotifyPlaylistId = (url) => {
  const regex = /playlist\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const fetchSpotifyPlaylist = async (playlistId) => {
  try {
    const accessToken = await getSpotifyAccessToken();
    
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Spotify playlist: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      name: data.name,
      tracks: data.tracks.items.map((item) => ({
        title: item.track.name,
        artist: item.track.artists.map((a) => a.name).join(', ')
      }))
    };
  } catch (error) {
    console.error('Error fetching Spotify playlist:', error);
    throw error;
  }
};

// Test with the provided playlist URL
const testPlaylistUrl = 'https://open.spotify.com/playlist/5jzdgLICTPytquCAYmcHuC?si=FPWHEcnZReicptFDNUeSsQ';

async function testSpotifyIntegration() {
  console.log('Testing Spotify Web API integration...');
  console.log('Playlist URL:', testPlaylistUrl);
  
  try {
    const playlistId = extractSpotifyPlaylistId(testPlaylistUrl);
    console.log('Extracted Playlist ID:', playlistId);
    
    if (!playlistId) {
      throw new Error('Failed to extract playlist ID from URL');
    }
    
    console.log('Fetching playlist data...');
    const playlist = await fetchSpotifyPlaylist(playlistId);
    
    console.log('\n✅ SUCCESS! Playlist fetched successfully:');
    console.log('Playlist Name:', playlist.name);
    console.log('Number of tracks:', playlist.tracks.length);
    console.log('\nFirst 5 tracks:');
    
    playlist.tracks.slice(0, 5).forEach((track, index) => {
      console.log(`${index + 1}. ${track.title} - ${track.artist}`);
    });
    
    if (playlist.tracks.length > 5) {
      console.log(`... and ${playlist.tracks.length - 5} more tracks`);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

testSpotifyIntegration();
