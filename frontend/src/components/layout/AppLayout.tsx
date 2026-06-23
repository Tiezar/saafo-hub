import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { Menu, Play, Pause, Volume2, VolumeX, ChevronUp, Music, LayoutDashboard, BookOpen, Layers, Timer } from 'lucide-react';
import Sidebar from './Sidebar';
import { useApp } from '../../contexts/AppContext';
import { useIsMobile } from '../../hooks/useIsMobile';
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
  const isMobile = useIsMobile();
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
      container.style.zIndex = '300';
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

    // Initialize YouTube player
    if (ytPlayerRef.current) return;

    ytPlayerRef.current = new (window as any).YT.Player('yt-hidden-player', {
      width: '1',
      height: '1',
      videoId: selectedTrack.youtubeId,
      playerVars: {
        autoplay: playingAudio ? 1 : 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          if (playingAudio) {
            ytPlayerRef.current.playVideo();
          }
        },
        onStateChange: (e: any) => {
          if (e.data === (window as any).YT.PlayerState.ENDED) {
            // Auto loop or stop
            ytPlayerRef.current.seekTo(0);
            ytPlayerRef.current.playVideo();
          }
        }
      }
    });
  }, [selectedTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize and position the hidden iframe dynamically if player is expanded
  useEffect(() => {
    const el = document.getElementById('yt-hidden-player');
    if (!el) return;

    if (selectedTrack && !isMobile && playerExpanded) {
      el.style.width = '280px';
      el.style.height = '157px'; // 16:9 ratio
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.style.bottom = '180px'; // sit above expanded control pill
    } else if (selectedTrack && playerExpanded) {
      // Mobile expanded state: show mini-player just above bottom bar
      el.style.width = '100vw';
      el.style.height = '120px';
      el.style.left = '0';
      el.style.right = '0';
      el.style.bottom = '152px'; // sit exactly above expanded pill (56px + 96px)
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    } else {
      el.style.width = '1px';
      el.style.height = '1px';
      el.style.opacity = '0.01';
      el.style.pointerEvents = 'none';
      if (isMobile) {
        el.style.left = '-100px'; // offscreen on mobile
      }
    }
  }, [playerExpanded, selectedTrack, isMobile]);

  // Handle play/pause commands
  useEffect(() => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.getPlayerState === 'function') {
      if (playingAudio) {
        ytPlayerRef.current.playVideo();
      } else {
        ytPlayerRef.current.pauseVideo();
      }
    }
  }, [playingAudio, ytPlayerRef]);

  // Handle volume updates
  useEffect(() => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      ytPlayerRef.current.setVolume(volume);
    }
  }, [volume, ytPlayerRef]);

  return (
    <div className="app-shell">
      {/* Mobile hamburger */}
      {!isMobile && (
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
      )}

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

      {/* Floating or compact bottom player control pill */}
      {selectedTrack && (
        <div 
          className={`floating-player-pill ${playerExpanded ? 'expanded' : 'collapsed'}`}
          style={{
            position: 'fixed',
            bottom: isMobile ? 'calc(56px + env(safe-area-inset-bottom))' : '24px',
            right: isMobile ? '0' : '24px',
            left: isMobile ? '0' : 'auto',
            zIndex: sidebarOpen ? 10 : 300,
            width: isMobile ? '100%' : '280px',
            background: 'var(--bg-surface)',
            border: isMobile ? 'none' : '1px solid var(--border-color)',
            borderTop: '1px solid var(--border-color)',
            borderRadius: isMobile ? '0' : '12px',
            boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            height: isMobile ? (playerExpanded ? '96px' : '44px') : (playerExpanded ? '100px' : '48px'),
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            padding: 0,
            opacity: sidebarOpen && isMobile ? 0 : 1,
            pointerEvents: sidebarOpen && isMobile ? 'none' : 'auto',
          }}
        >
          {isMobile ? (
            // Mobile Compact Player Layout
            <>
              <div 
                style={{ 
                  height: '44px',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '0 16px',
                  width: '100%',
                  cursor: 'pointer'
                }}
                onClick={() => setPlayerExpanded(!playerExpanded)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                  <Music 
                    size={14} 
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
                    }}
                  >
                    {playingAudio ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                </div>
              </div>

              {/* Mobile Volume Slider (visible when expanded) */}
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
                  borderTop: '1px solid var(--border-color)',
                  width: '100%',
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
            </>
          ) : (
            // Desktop Layout
            <>
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
            </>
          )}
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <nav className="mobile-bottom-nav">
          <NavLink to="/" end className={({ isActive }) => `mobile-bottom-nav-item${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Dash</span>
          </NavLink>
          <NavLink to="/materiais" className={({ isActive }) => `mobile-bottom-nav-item${isActive ? ' active' : ''}`}>
            <BookOpen size={20} />
            <span>Matérias</span>
          </NavLink>
          <NavLink to="/cards" className={({ isActive }) => `mobile-bottom-nav-item${isActive ? ' active' : ''}`}>
            <Layers size={20} />
            <span>Cards</span>
          </NavLink>
          <NavLink to="/pomodoro" className={({ isActive }) => `mobile-bottom-nav-item${isActive ? ' active' : ''}`}>
            <Timer size={20} />
            <span>Foco</span>
          </NavLink>
          <button onClick={() => setSidebarOpen(true)} className="mobile-bottom-nav-item">
            <Menu size={20} />
            <span>Mais</span>
          </button>
        </nav>
      )}
    </div>
  );
}
