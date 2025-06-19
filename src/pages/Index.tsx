import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Download, Music, Youtube, Copy, Check, Disc3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


const Index = () => {
  const [playlistUrls, setPlaylistUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [jsonOutput, setJsonOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const extractPlaylistId = (url: string) => {
    const regex = /[?&]list=([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const extractPlaylistName = (html: string) => {
    // Try to extract playlist name from various possible locations in the HTML
    const patterns = [
      /<meta property="og:title" content="([^"]+)"/,
      /<title>([^<]+)<\/title>/,
      /"title":"([^"]+)","description"/,
      /"playlistTitle":"([^"]+)"/
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        // Clean up the title (remove " - YouTube" suffix if present)
        return match[1].replace(/ - YouTube$/, '').trim();
      }
    }
    
    return 'Untitled Playlist';
  };

  const parseVideoIdsFromHtml = (html: string) => {
    // Extract video IDs from the HTML using regex
    const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    const videoIds = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = videoIdRegex.exec(html)) !== null) {
      videoIds.add(match[1]);
    }

    return Array.from(videoIds);
  };

  const extractSpotifyPlaylistId = (url: string) => {
    // Updated regex to handle more characters in Spotify playlist IDs and ignore query parameters
    const regex = /playlist\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Spotify Web API credentials from environment variables
  const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

  // Validate environment variables
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error('Missing Spotify API credentials. Please check your .env file.');
  }

  const getSpotifyAccessToken = async () => {
    try {
      if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        throw new Error('Spotify API credentials are not configured. Please check your .env file.');
      }

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
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

  const fetchSpotifyPlaylist = async (playlistId: string) => {
    try {
      const accessToken = await getSpotifyAccessToken();

      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Spotify playlist');
      }

      const data = await response.json();
      return {
        name: data.name,
        tracks: data.tracks.items.map((item: any) => ({
          title: item.track.name,
          artist: item.track.artists.map((a: any) => a.name).join(', ')
        }))
      };
    } catch (error) {
      console.error('Error fetching Spotify playlist:', error);
      throw error;
    }
  };

  const searchYouTube = async (query: string) => {
    try {
      // Using a CORS proxy to access YouTube search
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
      )}`;
      
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Failed to search YouTube');
      }
      
      const html = await response.text();
      
      // Extract first video ID from search results
      const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/;
      const match = html.match(videoIdRegex);
      
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error searching YouTube:', error);
      return null;
    }
  };

  const isSpotifyUrl = (url: string) => {
    return url.includes('spotify.com/playlist/');
  };

  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com/playlist') || url.includes('youtu.be/playlist');
  };

  const generatePipedJson = async () => {
    const urls = playlistUrls.trim().split('\n').filter(url => url.trim());

    if (urls.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one playlist URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const playlists = [];
      const allSongs = [];
      let songCounter = 1;

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i].trim();

        if (isSpotifyUrl(url)) {
          // Handle Spotify playlist
          const playlistId = extractSpotifyPlaylistId(url);

          if (!playlistId) {
            console.warn(`Invalid Spotify URL skipped: ${url}`);
            continue;
          }

          console.log(`Fetching Spotify playlist ${i + 1}:`, playlistId);

          try {
            const spotifyPlaylist = await fetchSpotifyPlaylist(playlistId);

            // Add playlist info
            playlists.push({
              id: playlistId,
              name: spotifyPlaylist.name,
              n: i + 1
            });

            // Search YouTube for each track and add to songs
            for (const track of spotifyPlaylist.tracks) {
              const searchQuery = `${track.title} ${track.artist}`;
              const videoId = await searchYouTube(searchQuery);

              if (videoId) {
                allSongs.push({
                  id: videoId,
                  timestamp: new Date().toISOString(),
                  list: playlistId,
                  n: songCounter++
                });
              }
            }
          } catch (error) {
            console.error(`Error processing Spotify playlist ${playlistId}:`, error);
          }
        } else if (isYouTubeUrl(url)) {
          // Handle YouTube playlist
          const playlistId = extractPlaylistId(url);

          if (!playlistId) {
            console.warn(`Invalid YouTube URL skipped: ${url}`);
            continue;
          }

          console.log(`Fetching YouTube playlist ${i + 1}:`, playlistId);

          // Try multiple CORS proxy services for better reliability
          const proxies = [
            `https://corsproxy.io/?${encodeURIComponent(url)}`,
            `https://cors-anywhere.herokuapp.com/${url}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
          ];

          let response: Response | undefined;

          for (const proxyUrl of proxies) {
            try {
              console.log('Trying proxy:', proxyUrl);
              response = await fetch(proxyUrl);
              if (response.ok) break;
            } catch (e) {
              console.log('Proxy failed, trying next...');
            }
          }

          if (!response || !response.ok) {
            console.error(`Failed to fetch playlist ${playlistId}:`, response?.status || 'Network error');
            continue;
          }

          const data = await response.text();

          console.log(`HTML fetched for playlist ${i + 1}, parsing...`);

          const playlistName = extractPlaylistName(data);
          const videoIds = parseVideoIdsFromHtml(data);

          console.log(`Found ${videoIds.length} video IDs in "${playlistName}":`, videoIds);

          if (videoIds.length === 0) {
            console.warn(`No videos found in playlist: ${playlistName}`);
            continue;
          }

          // Add playlist info
          playlists.push({
            id: playlistId,
            name: playlistName,
            n: i + 1
          });

          // Add songs from this playlist
          const playlistSongs = videoIds.map((id) => ({
            id: id,
            timestamp: new Date().toISOString(),
            list: playlistId,
            n: songCounter++
          }));

          allSongs.push(...playlistSongs);
        } else {
          console.warn(`Unsupported URL format skipped: ${url}`);
        }
      }

      if (playlists.length === 0) {
        throw new Error('No valid playlists were processed');
      }

      const pipedFormat = {
        playlists: playlists,
        songs: allSongs
      };

      setJsonOutput(JSON.stringify(pipedFormat, null, 2));

      toast({
        title: "Success!",
        description: `Converted ${playlists.length} playlists with ${allSongs.length} total songs`,
      });
    } catch (error) {
      console.error('Error converting playlists:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert playlists",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  const downloadJson = () => {
    if (!jsonOutput) return;
    
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'piped-music-playlists.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "JSON file has been downloaded",
    });
  };

  const copyToClipboard = async () => {
    if (!jsonOutput) return;
    
    try {
      await navigator.clipboard.writeText(jsonOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Copied!",
        description: "JSON copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* GitHub Fork Link */}
        <div className="flex justify-end mb-2">
          <a
            href="https://github.com/borixo/yt2pm-playlist"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1 rounded bg-black/30 hover:bg-black/50 text-gray-200 text-sm font-medium border border-white/10 transition"
            title="Fork on GitHub"
          >
            <svg  height="18" width="18"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><g fill="#181616"><path fill-rule="evenodd" clip-rule="evenodd" d="M64 5.103c-33.347 0-60.388 27.035-60.388 60.388 0 26.682 17.303 49.317 41.297 57.303 3.017.56 4.125-1.31 4.125-2.905 0-1.44-.056-6.197-.082-11.243-16.8 3.653-20.345-7.125-20.345-7.125-2.747-6.98-6.705-8.836-6.705-8.836-5.48-3.748.413-3.67.413-3.67 6.063.425 9.257 6.223 9.257 6.223 5.386 9.23 14.127 6.562 17.573 5.02.542-3.903 2.107-6.568 3.834-8.076-13.413-1.525-27.514-6.704-27.514-29.843 0-6.593 2.36-11.98 6.223-16.21-.628-1.52-2.695-7.662.584-15.98 0 0 5.07-1.623 16.61 6.19C53.7 35 58.867 34.327 64 34.304c5.13.023 10.3.694 15.127 2.033 11.526-7.813 16.59-6.19 16.59-6.19 3.287 8.317 1.22 14.46.593 15.98 3.872 4.23 6.215 9.617 6.215 16.21 0 23.194-14.127 28.3-27.574 29.796 2.167 1.874 4.097 5.55 4.097 11.183 0 8.08-.07 14.583-.07 16.572 0 1.607 1.088 3.49 4.148 2.897 23.98-7.994 41.263-30.622 41.263-57.294C124.388 32.14 97.35 5.104 64 5.104z"/><path d="M26.484 91.806c-.133.3-.605.39-1.035.185-.44-.196-.685-.605-.543-.906.13-.31.603-.395 1.04-.188.44.197.69.61.537.91zm2.446 2.729c-.287.267-.85.143-1.232-.28-.396-.42-.47-.983-.177-1.254.298-.266.844-.14 1.24.28.394.426.472.984.17 1.255zM31.312 98.012c-.37.258-.976.017-1.35-.52-.37-.538-.37-1.183.01-1.44.373-.258.97-.025 1.35.507.368.545.368 1.19-.01 1.452zm3.261 3.361c-.33.365-1.036.267-1.552-.23-.527-.487-.674-1.18-.343-1.544.336-.366 1.045-.264 1.564.23.527.486.686 1.18.333 1.543zm4.5 1.951c-.147.473-.825.688-1.51.486-.683-.207-1.13-.76-.99-1.238.14-.477.823-.7 1.512-.485.683.206 1.13.756.988 1.237zm4.943.361c.017.498-.563.91-1.28.92-.723.017-1.308-.387-1.315-.877 0-.503.568-.91 1.29-.924.717-.013 1.306.387 1.306.88zm4.598-.782c.086.485-.413.984-1.126 1.117-.7.13-1.35-.172-1.44-.653-.086-.498.422-.997 1.122-1.126.714-.123 1.354.17 1.444.663zm0 0"/></g></svg>

            Fork on GitHub
          </a>
        </div>
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Youtube className="w-10 h-10 text-red-500" />
            <Disc3 className="w-10 h-10 text-green-500" />
            <div className="text-4xl font-bold">→</div>
            <Music className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Playlists to Piped Music
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Convert YouTube or Spotify playlists to{' '}
            <a
              href="https://git.codespace.cz/PipedMusic/PipedMusic"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-pink-300 hover:text-pink-400"
            >
              Piped Music
            </a>{' '}
            JSON format for easy backup and migration
          </p>
        </div>

        {/* Main Converter Card with Tabs */}
        <Card className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <Music className="w-6 h-6" />
              Playlist Converter
            </CardTitle>
            <CardDescription className="text-gray-300">
              Convert your music playlists to Piped Music format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Unified URL Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">
                Playlist URLs (YouTube or Spotify - one per line)
              </label>
              <div className="space-y-2">
                <Textarea
                  placeholder={`https://www.youtube.com/playlist?list=...
https://open.spotify.com/playlist/...
https://www.youtube.com/playlist?list=...`}
                  value={playlistUrls}
                  onChange={(e) => setPlaylistUrls(e.target.value)}
                  className="min-h-[120px] bg-white/10 border-white/30 text-white placeholder:text-gray-400"
                  rows={6}
                />
                <Button
                  onClick={generatePipedJson}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Converting Playlists...
                    </div>
                  ) : (
                    'Convert Playlists'
                  )}
                </Button>
              </div>
            </div>

            {/* Examples */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
                <div className="text-sm text-blue-200 mb-2">YouTube Example URLs:</div>
                <code className="text-blue-100 text-sm block">
                  https://www.youtube.com/playlist?list=PL3-sRm8xAzY9gpXTMGVHJWy_FMD67NBed<br/>
                  https://www.youtube.com/playlist?list=PLP32wGpgzmIlInfgKVFfCwVsxgGqZNIiS<br/>
                </code>
              </div>

              <div className="p-4 bg-green-500/20 rounded-lg border border-green-400/30">
                <div className="text-sm text-green-200 mb-2">Spotify Example URLs:</div>
                <code className="text-green-100 text-sm block">
                  https://open.spotify.com/playlist/6bylhv1iSmMylVzgeWTtkb<br/>
                  https://open.spotify.com/playlist/2e3dcRuo9uDH6qD3NOGKAL<br/>
                </code>
                <div className="text-xs text-green-300 mt-2 italic">
                  Note: Spotify-generated playlists (Discover Weekly, Daily Mix, by Spotify, etc.) are not supported. Only user-created playlists work.
                </div>
              </div>
            </div>

            {/* JSON Output */}
            {jsonOutput && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Generated JSON</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={downloadJson}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
                
                <Textarea
                  value={jsonOutput}
                  readOnly
                  className="min-h-[300px] bg-black/30 border-white/30 text-gray-100 font-mono text-sm"
                  placeholder="Your converted JSON will appear here..."
                />
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-400/30">
                    Ready for download
                  </Badge>
                  <span className="text-sm text-gray-400">
                    {jsonOutput ? (() => {
                      const parsed = JSON.parse(jsonOutput);
                      return `${parsed.playlists.length} playlists, ${parsed.songs.length} total songs`;
                    })() : '0 playlists converted'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-center">
            <CardContent className="pt-6">
              <div className="flex justify-center gap-2 mb-4">
                <Youtube className="w-8 h-8 text-red-500" />
                <Disc3 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Multiple Sources</h3>
              <p className="text-gray-300 text-sm">
                Convert from YouTube or Spotify playlists
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-center">
            <CardContent className="pt-6">
              <Download className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Organized Export</h3>
              <p className="text-gray-300 text-sm">
                Each playlist maintains its name and organization
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-center">
            <CardContent className="pt-6">
              <Music className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Piped Music Format</h3>
              <p className="text-gray-300 text-sm">
                Perfect JSON structure for Piped Music app
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
