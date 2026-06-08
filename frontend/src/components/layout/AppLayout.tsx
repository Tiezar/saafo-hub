import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { useApp } from '../../contexts/AppContext';
import ToastContainer from '../ToastContainer';
import StudySessionOverlay from '../StudySessionOverlay';

export default function AppLayout() {
  const {
    activeSessionId,
    ytReady,
    setYtReady,
    playingAudio,
    selectedTrack,
    volume,
    ytPlayerRef,
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Load YouTube script once
  useEffect(() => {
    if ((window as any).YT) {
      setYtReady(true);
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    (window as any).onYouTubeIframeAPIReady = () => {
      setYtReady(true);
    };
  }, [setYtReady]);

  // Handle player instantiation and cueing
  useEffect(() => {
    if (!ytReady || !selectedTrack) return;

    if (ytPlayerRef.current) {
      const currentVideoId = typeof ytPlayerRef.current.getVideoData === 'function'
        ? ytPlayerRef.current.getVideoData()?.video_id
        : null;

      if (currentVideoId !== selectedTrack.youtubeId) {
        ytPlayerRef.current.cueVideoById({
          videoId: selectedTrack.youtubeId,
          startSeconds: 0,
        });
        if (playingAudio) {
          ytPlayerRef.current.playVideo();
        }
      }
      return;
    }

    // Create the container dynamically on document.body (outside React root)
    let container = document.getElementById('yt-hidden-player');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-hidden-player';
      container.style.position = 'absolute';
      container.style.width = '0';
      container.style.height = '0';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      container.style.top = '-1000px';
      container.style.left = '-1000px';
      document.body.appendChild(container);
    }

    ytPlayerRef.current = new (window as any).YT.Player('yt-hidden-player', {
      height: '0',
      width: '0',
      videoId: selectedTrack.youtubeId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: (e: any) => {
          e.target.setVolume(volume);
          if (playingAudio) e.target.playVideo();
        },
        onStateChange: (e: any) => {
          if (e.data === (window as any).YT.PlayerState.ENDED) {
            e.target.playVideo();
          }
        },
      },
    });
  }, [ytReady, selectedTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle play/pause changes reactively
  useEffect(() => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.getPlayerState === 'function') {
      if (playingAudio) {
        ytPlayerRef.current.playVideo();
      } else {
        ytPlayerRef.current.pauseVideo();
      }
    }
  }, [playingAudio, ytPlayerRef]);

  // Handle volume changes reactively
  useEffect(() => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      ytPlayerRef.current.setVolume(volume);
    }
  }, [volume, ytPlayerRef]);

  return (
    <div className="app-shell">
      {/* Mobile hamburger */}
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Overlay for mobile drawer */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' sidebar-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <Sidebar onClose={() => setSidebarOpen(false)} mobileOpen={sidebarOpen} />

      <main className="app-main">
        <Outlet />
      </main>

      <ToastContainer />
      {activeSessionId && <StudySessionOverlay />}
    </div>
  );
}
