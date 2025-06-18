import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Download, Music, Youtube, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parsePlaylistUrl, formatSongForSearch } from "@/utils/urlParsers";
import { searchMultipleSongs } from "@/services/youtubeSearch";

const Index = () => {
  const [playlistUrls, setPlaylistUrls] = useState('');
  const [spotifyData, setSpotifyData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [jsonOutput, setJsonOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'youtube' | 'spotify'>('youtube');
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
    let match;

    while ((match = videoIdRegex.exec(html)) !== null) {
      videoIds.add(match[1]);
    }

    return Array.from(videoIds);
  };

  const processSpotifyData = async (data: string): Promise<{ name: string; tracks: Array<{ title: string; artist: string }> }> => {
    try {
      // Try to parse as JSON first (if user exports from Spotify)
      const parsed = JSON.parse(data);
      if (parsed.name && parsed.tracks) {
        return {
          name: parsed.name,
          tracks: parsed.tracks.map((track: any) => ({
            title: track.name || track.title,
            artist: track.artists?.[0]?.name || track.artist || 'Unknown Artist'
          }))
        };
      }
    } catch {
      // If not JSON, try to parse as text format
      const lines = data.trim().split('\n');
      const tracks = [];
      let playlistName = 'Spotify Playlist';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check if it's a playlist name (first line or line starting with "Playlist:")
        if (trimmed.toLowerCase().startsWith('playlist:') || tracks.length === 0) {
          playlistName = trimmed.replace(/^playlist:\s*/i, '').trim() || playlistName;
          continue;
        }

        // Try to parse "Artist - Title" format
        const match = trimmed.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        if (match) {
          tracks.push({
            artist: match[1].trim(),
            title: match[2].trim()
          });
        } else {
          // If no separator found, treat as title with unknown artist
          tracks.push({
            artist: 'Unknown Artist',
            title: trimmed
          });
        }
      }

      return { name: playlistName, tracks };
    }

    throw new Error('Invalid Spotify data format');
  };

  const processYouTubePlaylist = async (url: string, index: number) => {
    const playlistId = extractPlaylistId(url);

    if (!playlistId) {
      console.warn(`Invalid YouTube URL skipped: ${url}`);
      return null;
    }

    console.log(`Fetching YouTube playlist ${index + 1}:`, playlistId);

    // Try multiple CORS proxy services for better reliability
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://cors-anywhere.herokuapp.com/${url}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    let response;

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
      return null;
    }

    const data = await response.text();
    const playlistName = extractPlaylistName(data);
    const videoIds = parseVideoIdsFromHtml(data);

    console.log(`Found ${videoIds.length} video IDs in "${playlistName}":`, videoIds);

    if (videoIds.length === 0) {
      console.warn(`No videos found in playlist: ${playlistName}`);
      return null;
    }

    return {
      id: playlistId,
      name: playlistName,
      videoIds
    };
  };

  const processSpotifyPlaylist = async (data: string, index: number) => {
    try {
      console.log(`Processing Spotify playlist ${index + 1}`);
      const spotifyPlaylist = await processSpotifyData(data);

      console.log(`Found ${spotifyPlaylist.tracks.length} tracks in "${spotifyPlaylist.name}"`);

      if (spotifyPlaylist.tracks.length === 0) {
        console.warn(`No tracks found in Spotify playlist: ${spotifyPlaylist.name}`);
        return null;
      }

      // Search for YouTube videos for each track
      const searchResults = await searchMultipleSongs(spotifyPlaylist.tracks);
      const videoIds = searchResults
        .filter(result => result.videoId)
        .map(result => result.videoId!);

      console.log(`Found ${videoIds.length} YouTube videos for ${spotifyPlaylist.tracks.length} Spotify tracks`);

      if (videoIds.length === 0) {
        console.warn(`No YouTube videos found for Spotify playlist: ${spotifyPlaylist.name}`);
        return null;
      }

      return {
        id: `spotify_${Date.now()}_${index}`,
        name: spotifyPlaylist.name,
        videoIds
      };
    } catch (error) {
      console.error('Error processing Spotify playlist:', error);
      return null;
    }
  };

  const generatePipedJson = async () => {
    if (activeTab === 'youtube') {
      const urls = playlistUrls.trim().split('\n').filter(url => url.trim());

      if (urls.length === 0) {
        toast({
          title: "Error",
          description: "Please enter at least one YouTube playlist URL",
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
          const result = await processYouTubePlaylist(urls[i].trim(), i);
          if (!result) continue;

          // Add playlist info
          playlists.push({
            id: result.id,
            name: result.name,
            n: i + 1
          });

          // Add songs from this playlist
          const playlistSongs = result.videoIds.map((id) => ({
            id: id,
            timestamp: new Date().toISOString(),
            list: result.id,
            n: songCounter++
          }));

          allSongs.push(...playlistSongs);
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
          description: `Converted ${playlists.length} YouTube playlists with ${allSongs.length} total songs`,
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
    } else {
      // Spotify processing
      if (!spotifyData.trim()) {
        toast({
          title: "Error",
          description: "Please enter Spotify playlist data",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);

      try {
        const result = await processSpotifyPlaylist(spotifyData, 0);
        if (!result) {
          throw new Error('Failed to process Spotify playlist');
        }

        const playlists = [{
          id: result.id,
          name: result.name,
          n: 1
        }];

        const allSongs = result.videoIds.map((id, index) => ({
          id: id,
          timestamp: new Date().toISOString(),
          list: result.id,
          n: index + 1
        }));

        const pipedFormat = {
          playlists: playlists,
          songs: allSongs
        };

        setJsonOutput(JSON.stringify(pipedFormat, null, 2));

        toast({
          title: "Success!",
          description: `Converted Spotify playlist "${result.name}" with ${allSongs.length} songs found on YouTube`,
        });
      } catch (error) {
        console.error('Error converting Spotify playlist:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to convert Spotify playlist",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
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
            <div className="flex gap-2">
              <Youtube className="w-10 h-10 text-red-500" />
              <svg className="w-10 h-10 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <div className="text-4xl font-bold">→</div>
            <Music className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Playlist to Piped Music
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Convert YouTube and Spotify playlists to{' '}
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

        {/* Main Converter Card */}
        <Card className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <Music className="w-6 h-6" />
              Playlist Converter
            </CardTitle>
            <CardDescription className="text-gray-300">
              Convert YouTube playlists or Spotify playlists to Piped Music format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tab Selection */}
            <div className="flex space-x-1 bg-white/10 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('youtube')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'youtube'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Youtube className="w-4 h-4 inline mr-2" />
                YouTube
              </button>
              <button
                onClick={() => setActiveTab('spotify')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'spotify'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-4 h-4 inline mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Spotify
              </button>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'youtube' ? (
              <>
                {/* YouTube URL Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">YouTube Playlist URLs (one per line)</label>
                  <div className="space-y-2">
                    <Textarea
                      placeholder={`https://www.youtube.com/playlist?list=...
https://www.youtube.com/playlist?list=...`}
                      value={playlistUrls}
                      onChange={(e) => setPlaylistUrls(e.target.value)}
                      className="min-h-[120px] bg-white/10 border-white/30 text-white placeholder:text-gray-400"
                      rows={5}
                    />
                  </div>
                </div>

                {/* YouTube Example */}
                <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
                  <div className="text-sm text-blue-200 mb-2">Example URLs (one per line):</div>
                  <code className="text-blue-100 text-sm block">
                    https://www.youtube.com/playlist?list=PL3-sRm8xAzY9gpXTMGVHJWy_FMD67NBed<br/>
                    https://www.youtube.com/playlist?list=PLP32wGpgzmIlInfgKVFfCwVsxgGqZNIiS<br/>
                  </code>
                </div>
              </>
            ) : (
              <>
                {/* Spotify Data Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">Spotify Playlist Data</label>
                  <div className="space-y-2">
                    <Textarea
                      placeholder={`My Awesome Playlist
Artist Name - Song Title
Another Artist - Another Song
...`}
                      value={spotifyData}
                      onChange={(e) => setSpotifyData(e.target.value)}
                      className="min-h-[120px] bg-white/10 border-white/30 text-white placeholder:text-gray-400"
                      rows={5}
                    />
                  </div>
                </div>

                {/* Spotify Example */}
                <div className="p-4 bg-green-500/20 rounded-lg border border-green-400/30">
                  <div className="text-sm text-green-200 mb-2">Example format:</div>
                  <code className="text-green-100 text-sm block">
                    My Favorite Songs<br/>
                    The Beatles - Hey Jude<br/>
                    Queen - Bohemian Rhapsody<br/>
                    Led Zeppelin - Stairway to Heaven
                  </code>
                  <div className="text-xs text-green-300 mt-2">
                    First line: Playlist name<br/>
                    Following lines: Artist - Song Title
                  </div>
                </div>
              </>
            )}

            {/* Convert Button */}
            <Button
              onClick={generatePipedJson}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {activeTab === 'youtube' ? 'Converting YouTube Playlists...' : 'Converting Spotify Playlist...'}
                </div>
              ) : (
                activeTab === 'youtube' ? 'Convert YouTube Playlists' : 'Convert Spotify Playlist'
              )}
            </Button>

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
              <div className="flex justify-center items-center gap-2 mb-4">
                <Youtube className="w-8 h-8 text-red-500" />
                <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Multiple Sources</h3>
              <p className="text-gray-300 text-sm">
                Convert from both YouTube and Spotify playlists
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-center">
            <CardContent className="pt-6">
              <Download className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Smart Matching</h3>
              <p className="text-gray-300 text-sm">
                Automatically finds YouTube videos for Spotify tracks
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
