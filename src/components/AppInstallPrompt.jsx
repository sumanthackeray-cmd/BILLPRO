import React, { useState, useEffect } from 'react';
import { Download, Monitor, Smartphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AppInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [deviceType, setDeviceType] = useState('desktop');

  useEffect(() => {
    // Detect device type for contextual text
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) {
      setDeviceType('android');
    } else if (/iPad|iPhone|iPod/.test(ua)) {
      setDeviceType('ios');
    } else {
      setDeviceType('desktop');
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show our custom UI
      
      // Wait a few seconds before showing so it doesn't interrupt immediate load
      setTimeout(() => {
        const hasDismissed = localStorage.getItem('easybmt_install_dismissed');
        if (!hasDismissed) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowPrompt(false);
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('easybmt_install_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[380px] bg-card border border-primary/30 shadow-2xl rounded-2xl z-50 overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500" />
        
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                {deviceType === 'desktop' ? <Monitor className="w-6 h-6 text-primary" /> : <Smartphone className="w-6 h-6 text-primary" />}
              </div>
              <div>
                <h3 className="font-black text-lg leading-tight text-foreground">
                  Install EasyBMT
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  {deviceType === 'android' ? 'Download native .apk (WebAPK)' : 
                   deviceType === 'desktop' ? 'Download native desktop app (.exe)' : 
                   'Install App'}
                </p>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:bg-secondary p-1 rounded-md transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Get the full native experience! Install EasyBMT directly on your device for offline support, instant loading, and fullscreen enterprise features.
          </p>

          <div className="flex gap-2">
            <button 
              onClick={handleInstallClick}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Download & Install
            </button>
            <button 
              onClick={handleDismiss}
              className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-bold rounded-xl text-sm transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
