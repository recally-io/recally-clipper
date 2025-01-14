import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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
    <div className="w-[300px] p-14 ">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Web Clipper</h1>
      </div>
      
      <Card>
        <CardContent className="p-4 h-60">
          <Button 
            className="w-full" 
            onClick={handleClip} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Clip Current Page'
            )}
          </Button>

          {status === 'success' && (
            <div className="flex items-center gap-2 mt-4 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Content clipped successfully!</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 mt-4 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
