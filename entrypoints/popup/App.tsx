import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Loader2, Scissors } from "lucide-react";
import { useEffect, useState } from "react";

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    // Fetch current tab URL when popup opens
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url) {
        setCurrentUrl(tab.url);
      }
    });
  }, []);

  const handleClip = async () => {
    setIsLoading(true);
    setStatus('idle');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab found');

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "process-content",
      });

      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process content');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-[400px] min-h-[500px] bg-white">
      <div className="p-6 space-y-4">
        {status === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Successfully clipped to your library!</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-primary/10 rounded-full">
            <Scissors className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Web Clipper
            <span className="text-sm text-primary font-semibold">Beta</span>
          </h1>
          <p className="text-sm text-muted-foreground">Save web content instantly</p>
        </div>

        <Separator />

        {/* Current Page Preview */}
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-sm">
            <div className="truncate text-muted-foreground">
              {currentUrl ? (
                <>Current page: {currentUrl}</>
              ) : (
                <span className="text-slate-400">Loading current page...</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Section */}
        <Card className="border-2 border-primary/20 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <Button 
              className="w-full h-12 text-base font-medium transition-all hover:scale-[1.02]" 
              onClick={handleClip} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Clipping Content...
                </>
              ) : (
                'Clip This Page'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
