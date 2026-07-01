import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RotateCw, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface Props {
  examId: string;
  examTitle: string;
  onClose: () => void;
  onGraded: (data: {
    score: number;
    correctCount: number;
    totalQuestions: number;
    answers: {
      question: number;
      selectedIdx: number;
      correctIdx: number;
      isCorrect: boolean;
      explanation: string;
    }[];
  }) => void;
}

export default function BubbleScanner({ examId, examTitle, onClose, onGraded }: Props) {
  const { showError } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Initialize webcam
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch {
        setCameraError('Não foi possível acessar a câmera. Certifique-se de dar as permissões necessárias.');
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Save thumbnail preview
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);

    // Stop webcam tracks temporarily
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleRetake = async () => {
    setCapturedImage(null);
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setCameraError('Erro ao reiniciar a câmera.');
    }
  };

  const handleGrade = async () => {
    if (!canvasRef.current) return;
    setScanning(true);

    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          showError('Falha ao processar imagem capturada.');
          setScanning(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', blob, 'bubble_sheet.jpg');
        formData.append('examId', examId);

        // Fetch token from localStorage as standard for multi-part requests
        const token = localStorage.getItem('token');
        const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        const response = await fetch(`${apiHost}/exams/scanner/grade`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Erro ao escanear cartão resposta.');
        }

        const result = await response.json();
        onGraded(result);
      }, 'image/jpeg', 0.85);

    } catch (err) {
      showError((err as Error).message);
      setScanning(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.85)' }}>
      <div className="modal" style={{ maxWidth: 640, width: '90%', background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="modal-title" style={{ fontSize: 16, fontWeight: 700 }}>Escanear Gabarito</span>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{examTitle}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Camera/Capture Container */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {cameraError ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'white' }}>
              <AlertCircle size={40} style={{ color: 'var(--color-danger)', marginBottom: 12 }} />
              <p style={{ fontSize: 14 }}>{cameraError}</p>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured Sheet" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Target Bounding Box Overlay */}
              <div style={{
                position: 'absolute',
                border: '3px dashed var(--color-primary)',
                borderRadius: 12,
                top: '10%',
                bottom: '10%',
                left: '20%',
                right: '20%',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ color: 'white', background: 'rgba(0, 0, 0, 0.6)', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                  Alinhe o cartão de respostas aqui
                </span>
              </div>
            </>
          )}

          {scanning && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: 'white'
            }}>
              <RotateCw size={36} className="animate-spin" style={{ color: 'var(--color-primary)', marginBottom: 12 }} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Processando gabarito via OCR...</span>
            </div>
          )}
        </div>

        {/* Hidden processing canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Footer actions */}
        <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}>
          <div>
            {!capturedImage && !cameraError && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Posicione o gabarito no retângulo pontilhado.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {capturedImage ? (
              <>
                <button className="btn-secondary" onClick={handleRetake} disabled={scanning} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={14} /> Tirar outra
                </button>
                <button className="btn-primary" onClick={handleGrade} disabled={scanning} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} /> Confirmar & Corrigir
                </button>
              </>
            ) : (
              !cameraError && (
                <button className="btn-primary" onClick={handleCapture} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Camera size={14} /> Capturar Gabarito
                </button>
              )
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
