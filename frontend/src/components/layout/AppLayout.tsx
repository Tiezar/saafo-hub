import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Play, Pause, Volume2, VolumeX, ChevronUp, Music } from 'lucide-react';
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
    togglePlayAudio,
    setVolume,
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [playerExpanded, setPlayerExpanded] = useState(false);
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
      container.style.position = 'fixed';
      container.style.right = '24px';
      container.style.zIndex = '9999';
      container.style.borderRadius = '8px';
      container.style.overflow = 'hidden';
      container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)';
      container.style.background = '#000';
      container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      
      // Default collapsed state
      container.style.bottom = '84px';
      container.style.width = '0px';
      container.style.height = '0px';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      
      document.body.appendChild(container);
    }

    ytPlayerRef.current = new (window as any).YT.Player('yt-hidden-player', {
      height: '100%',
      width: '100%',
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

  // Synchronize expanded state styling on the document.body container
  useEffect(() => {
    const el = document.getElementById('yt-hidden-player');
    if (!el) return;
    if (selectedTrack && playerExpanded) {
      el.style.bottom = '136px'; // 24px bottom + 100px pill height + 12px gap
      el.style.width = '280px';
      el.style.height = '157px';
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    } else {
      el.style.bottom = '84px'; // 24px bottom + 48px pill height + 12px gap
      el.style.width = '0px';
      el.style.height = '0px';
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    }
  }, [playerExpanded, selectedTrack]);

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

      {/* Floating mini-player control pill */}
      {selectedTrack && (
        <div 
          className={`floating-player-pill ${playerExpanded ? 'expanded' : 'collapsed'}`}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 10000,
            width: '280px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            height: playerExpanded ? '100px' : '48px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header Row (Always visible) */}
          <div 
            style={{
              height: '48px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              background: 'var(--bg-card-high)',
              borderBottom: playerExpanded ? '1px solid var(--border-color)' : 'none',
              flexShrink: 0,
            }}
            onClick={() => setPlayerExpanded(!playerExpanded)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
              <Music 
                size={16} 
                style={{ 
                  color: playingAudio ? 'var(--color-primary)' : 'var(--text-muted)',
                  flexShrink: 0,
                  animation: playingAudio ? 'spin 8s linear infinite' : 'none',
                }} 
              />
              <span 
                style={{ 
                  fontFamily: 'var(--font-display)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selectedTrack.name}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
              {/* Play/Pause Button */}
              <button
                onClick={togglePlayAudio}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  borderRadius: '50%',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--border-color)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {playingAudio ? <Pause size={14} /> : <Play size={14} />}
              </button>

              {/* Toggle Expand Arrow */}
              <button
                onClick={() => setPlayerExpanded(!playerExpanded)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  transform: playerExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              >
                <ChevronUp size={14} />
              </button>
            </div>
          </div>

          {/* Volume Control Panel (Only shown in expanded state) */}
          <div 
            style={{
              height: playerExpanded ? '52px' : '0px',
              opacity: playerExpanded ? 1 : 0,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0 16px',
              background: 'var(--bg-surface)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {volume === 0 ? (
              <VolumeX 
                size={14} 
                style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setVolume(50)}
              />
            ) : (
              <Volume2 
                size={14} 
                style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
                onClick={() => setVolume(0)}
              />
            )}
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              style={{
                flex: 1,
                height: '4px',
                accentColor: 'var(--color-primary)',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-label)', color: 'var(--text-muted)', width: '28px', textAlign: 'right' }}>
              {volume}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
