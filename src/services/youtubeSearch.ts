import axios from 'axios';

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
}

/**
 * Search for YouTube videos using song title and artist
 * This uses a simplified approach without requiring YouTube API key
 */
export const searchYouTubeVideo = async (songTitle: string, artist: string): Promise<string | null> => {
  try {
    const searchQuery = `${artist} ${songTitle}`;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Use YouTube search URL that we can scrape
    const searchUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;
    
    // Try multiple CORS proxy services
    const corsProxies = [
      `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(searchUrl)}`,
      `https://cors-anywhere.herokuapp.com/${searchUrl}`
    ];
    
    for (const proxyUrl of corsProxies) {
      try {
        console.log(`Searching YouTube for: "${searchQuery}"`);
        const response = await axios.get(proxyUrl, {
          timeout: 10000,
        });
        
        if (response.data) {
          const videoId = extractVideoIdFromSearchResults(response.data);
          if (videoId) {
            console.log(`Found video ID: ${videoId} for "${searchQuery}"`);
            return videoId;
          }
        }
      } catch (error) {
        console.log('YouTube search proxy failed, trying next...');
      }
    }
    
    console.warn(`No video found for: "${searchQuery}"`);
    return null;
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return null;
  }
};

/**
 * Extract video ID from YouTube search results HTML
 */
const extractVideoIdFromSearchResults = (html: string): string | null => {
  try {
    // Look for video IDs in the search results
    // YouTube search results contain video IDs in various formats
    const patterns = [
      /"videoId":"([a-zA-Z0-9_-]{11})"/,
      /watch\?v=([a-zA-Z0-9_-]{11})/,
      /"url":"\/watch\?v=([a-zA-Z0-9_-]{11})"/,
      /\/watch\?v=([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        // Verify it's a valid video ID format (11 characters)
        if (match[1].length === 11) {
          return match[1];
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting video ID:', error);
    return null;
  }
};

/**
 * Search for multiple songs and return their video IDs
 */
export const searchMultipleSongs = async (
  songs: Array<{ title: string; artist: string }>
): Promise<Array<{ title: string; artist: string; videoId: string | null }>> => {
  const results = [];
  
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    console.log(`Searching ${i + 1}/${songs.length}: ${song.artist} - ${song.title}`);
    
    const videoId = await searchYouTubeVideo(song.title, song.artist);
    results.push({
      title: song.title,
      artist: song.artist,
      videoId
    });
    
    // Add a small delay to avoid overwhelming the service
    if (i < songs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
};

/**
 * Alternative approach using YouTube Data API (requires API key)
 * This would be more reliable but requires API key configuration
 */
export const searchYouTubeWithAPI = async (
  songTitle: string, 
  artist: string, 
  apiKey: string
): Promise<string | null> => {
  try {
    const searchQuery = `${artist} ${songTitle}`;
    const apiUrl = `https://www.googleapis.com/youtube/v3/search`;
    
    const response = await axios.get(apiUrl, {
      params: {
        part: 'snippet',
        q: searchQuery,
        type: 'video',
        maxResults: 1,
        key: apiKey
      }
    });
    
    if (response.data.items && response.data.items.length > 0) {
      return response.data.items[0].id.videoId;
    }
    
    return null;
  } catch (error) {
    console.error('YouTube API search error:', error);
    return null;
  }
};
