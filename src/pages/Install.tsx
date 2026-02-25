import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Smartphone, Monitor, CheckCircle, Share, Plus } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Link } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-[hsl(222,47%,5%)] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8 text-center">
        <Link to="/" className="inline-block">
          <Logo variant="compact" className="text-3xl" />
        </Link>

        {isInstalled ? (
          <div className="space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold">Already Installed!</h1>
            <p className="text-white/50">Based Data is installed on your device. Open it from your home screen for the best experience.</p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 border-0 mt-4">
                Open App
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div>
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 mb-4">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Install App
              </Badge>
              <h1 className="text-3xl font-bold mb-3">Install Based Data</h1>
              <p className="text-white/50">
                Get instant access to federal contract intelligence right from your home screen. Works offline.
              </p>
            </div>

            {deferredPrompt ? (
              <Button
                size="lg"
                onClick={handleInstall}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 border-0 text-base px-8 h-12 gap-2"
              >
                <Download className="w-5 h-5" /> Install Now
              </Button>
            ) : isIOS ? (
              <Card className="bg-white/[0.03] border-white/10">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold">Install on iPhone / iPad</p>
                      <p className="text-sm text-white/40">Follow these steps in Safari:</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-left">
                    <Step num={1} icon={<Share className="w-4 h-4" />} text='Tap the Share button in Safari' />
                    <Step num={2} icon={<Plus className="w-4 h-4" />} text='Scroll down and tap "Add to Home Screen"' />
                    <Step num={3} icon={<CheckCircle className="w-4 h-4" />} text='Tap "Add" to confirm' />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/[0.03] border-white/10">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                      <Monitor className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="font-semibold">Install on Desktop or Android</p>
                      <p className="text-sm text-white/40">Look for the install icon in your browser's address bar, or use the browser menu.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-3 gap-4 pt-4">
              <Benefit icon="⚡" title="Fast" desc="Instant load" />
              <Benefit icon="📴" title="Offline" desc="Works anywhere" />
              <Benefit icon="🔔" title="Updates" desc="Always fresh" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Step({ num, icon, text }: { num: number; icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">{num}</div>
      <span className="text-white/60">{icon}</span>
      <p className="text-sm text-white/70">{text}</p>
    </div>
  );
}

function Benefit({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-white/40">{desc}</p>
    </div>
  );
}
