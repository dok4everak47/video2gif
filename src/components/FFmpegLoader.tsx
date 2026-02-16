import { useState, useEffect, useRef } from 'react';
import { useVideoStore } from '../stores/videoStore';
import { loadFFmpeg } from '../utils/ffmpeg';

export function FFmpegLoader() {
  const { isFFmpegLoaded, ffmpegProgress, setFFmpegLoaded, setFFmpegProgress } = useVideoStore();
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [loadingStep, setLoadingStep] = useState('');
  const timeoutRef = useRef<number | undefined>(undefined);

  const startLoading = () => {
    if (isFFmpegLoaded) {
      setStatus('loaded');
      return;
    }

    setStatus('loading');
    setLoadingStep('正在下载 JavaScript 核心...');
    
    timeoutRef.current = window.setTimeout(() => {
      if (ffmpegProgress < 100) {
        setLoadingStep('下载较慢，请继续等待...');
      }
    }, 15000);

    loadFFmpeg((progress) => {
      setFFmpegProgress(progress);
      
      if (progress < 30) {
        setLoadingStep('正在下载 JavaScript 核心...');
      } else if (progress < 90) {
        setLoadingStep('正在下载 WASM 核心...');
      } else {
        setLoadingStep('正在初始化 FFmpeg...');
      }
      
      if (progress >= 100) {
        clearTimeout(timeoutRef.current);
        setFFmpegLoaded(true);
        setStatus('loaded');
      }
    }).catch((err) => {
      console.error('Failed to load FFmpeg:', err);
      clearTimeout(timeoutRef.current);
      setStatus('error');
    });
  };

  useEffect(() => {
    startLoading();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (isFFmpegLoaded || status === 'loaded') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
        <p className="text-green-700 text-sm flex items-center gap-2">
          <span>✓</span> FFmpeg 已就绪
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-700 text-sm mb-3">
          FFmpeg 加载失败，请检查网络后重试
        </p>
        <button
          onClick={() => {
            setFFmpegProgress(0);
            startLoading();
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-amber-800 font-medium">正在加载 FFmpeg 核心...</span>
        <span className="text-amber-600 text-sm">{ffmpegProgress}%</span>
      </div>
      <div className="w-full bg-amber-200 rounded-full h-3">
        <div
          className="bg-amber-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${ffmpegProgress}%` }}
        />
      </div>
      {loadingStep && (
        <p className="text-amber-600 text-xs mt-2">
          {loadingStep}
        </p>
      )}
    </div>
  );
}
