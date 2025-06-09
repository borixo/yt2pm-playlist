import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Download, Music, Youtube, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [jsonOutput, setJsonOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const extractPlaylistId = (url: string) => {
    const regex = /[?&]list=([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
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
    if (!playlistUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube playlist URL",
        variant: "destructive",
      });
      return;
    }

    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube playlist URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Fetching playlist:', playlistId);
      
      // Try multiple CORS proxy services for better reliability
      const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(playlistUrl)}`,
        `https://cors-anywhere.herokuapp.com/${playlistUrl}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(playlistUrl)}`
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
        throw new Error(`All proxies failed. Last error: ${response?.status || 'Network error'}`);
      }
      
      const data = await response.text();
      
      console.log('HTML fetched, parsing video IDs...');
      
      const videoIds = parseVideoIdsFromHtml(data);
      console.log(`Found ${videoIds.length} video IDs:`, videoIds);
      
      if (videoIds.length === 0) {
        throw new Error('No video IDs found in playlist');
      }
      
      // Convert to Piped Music format
      const songs = videoIds.map((id, index) => ({
        id: id,
        timestamp: new Date().toISOString(),
        list: "liked",
        n: index + 1
      }));

      const pipedFormat = {
        playlists: [],
        songs: songs
      };

      setJsonOutput(JSON.stringify(pipedFormat, null, 2));
      
      toast({
        title: "Success!",
        description: `Converted ${videoIds.length} songs to Piped Music format`,
      });
    } catch (error) {
      console.error('Error converting playlist:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to convert playlist",
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
    a.download = 'piped-music-playlist.json';
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
            Convert your YouTube playlists to Piped Music JSON format for easy backup and migration
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
              Enter your YouTube playlist URL below to convert it to Piped Music format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* URL Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">YouTube Playlist URL</label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://www.youtube.com/playlist?list=..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  className="flex-1 bg-white/10 border-white/30 text-white placeholder:text-gray-400"
                />
                <Button 
                  onClick={generatePipedJson}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Converting...
                    </div>
                  ) : (
                    'Convert'
                  )}
                </Button>
              </div>
            </div>

            {/* Example */}
            <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
              <div className="text-sm text-blue-200 mb-2">Example URL:</div>
              <code className="text-blue-100 text-sm break-all">
                https://www.youtube.com/playlist?list=PL3-sRm8xAzY9gpXTMGVHJWy_FMD67NBed
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
                    {jsonOutput ? JSON.parse(jsonOutput).songs.length : 0} songs converted
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
              <h3 className="text-lg font-semibold text-white mb-2">YouTube Compatible</h3>
              <p className="text-gray-300 text-sm">
                Works with any public YouTube playlist URL
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-center">
            <CardContent className="pt-6">
              <Download className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Easy Download</h3>
              <p className="text-gray-300 text-sm">
                Download JSON file ready for Piped Music import
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
