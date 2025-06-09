import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Download, Music, Youtube, Copy, Check } from "lucide-react";
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
    let match;
    
    while ((match = videoIdRegex.exec(html)) !== null) {
      videoIds.add(match[1]);
    }
    
    return Array.from(videoIds);
  };

  const generatePipedJson = async () => {
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
        const url = urls[i].trim();
        const playlistId = extractPlaylistId(url);
        
        if (!playlistId) {
          console.warn(`Invalid URL skipped: ${url}`);
          continue;
        }

        console.log(`Fetching playlist ${i + 1}:`, playlistId);
        
        // Try multiple CORS proxy services for better reliability
        const proxies = [
          `https://corsproxy.io/?${encodeURIComponent(url)}`,
          `https://cors-anywhere.herokuapp.com/${url}`,
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
        ];
        
        let response;
        let error;
        
        for (const proxyUrl of proxies) {
          try {
            console.log('Trying proxy:', proxyUrl);
            response = await fetch(proxyUrl);
            if (response.ok) break;
          } catch (e) {
            error = e;
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
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Youtube className="w-10 h-10 text-red-500" />
            <div className="text-4xl font-bold">→</div>
            <Music className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            YouTube to Piped Music
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Convert multiple YouTube playlists to{' '}
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
              Enter your YouTube playlist URLs below (one per line) to convert them to Piped Music format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* URL Input */}
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
                    'Convert All Playlists'
                  )}
                </Button>
              </div>
            </div>

            {/* Example */}
            <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
              <div className="text-sm text-blue-200 mb-2">Example URLs (one per line):</div>
              <code className="text-blue-100 text-sm block">
                https://www.youtube.com/playlist?list=PL3-sRm8xAzY9gpXTMGVHJWy_FMD67NBed<br/>
                https://www.youtube.com/playlist?list=PLP32wGpgzmIlInfgKVFfCwVsxgGqZNIiS<br/>
              </code>
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
              <Youtube className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Multiple Playlists</h3>
              <p className="text-gray-300 text-sm">
                Convert multiple YouTube playlists at once
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
