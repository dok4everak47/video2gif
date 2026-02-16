import { useRef, useState, useEffect } from 'react';

interface TimelineProps {
  duration: number;
  startTime: number;
  endTime: number;
  onChange: (start: number, end: number) => void;
}

export function Timeline({ duration, startTime, endTime, onChange }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'range' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);

  const toPercent = (time: number) => (time / duration) * 100;

  const handleMouseDown = (e: React.MouseEvent, type: 'start' | 'end' | 'range') => {
    e.preventDefault();
    setIsDragging(type);
    setDragStartX(e.clientX);
    
    if (type === 'start') {
      setDragStartValue(startTime);
    } else if (type === 'end') {
      setDragStartValue(endTime);
    } else {
      setDragStartValue(startTime);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartX;
      const deltaTime = (deltaX / rect.width) * duration;

      if (isDragging === 'start') {
        const newStart = Math.max(0, Math.min(dragStartValue + deltaTime, endTime - 0.5));
        onChange(newStart, endTime);
      } else if (isDragging === 'end') {
        const newEnd = Math.min(duration, Math.max(dragStartValue + deltaTime, startTime + 0.5));
        onChange(startTime, newEnd);
      } else if (isDragging === 'range') {
        const rangeWidth = endTime - startTime;
        const newStart = Math.max(0, Math.min(dragStartValue + deltaTime, duration - rangeWidth));
        onChange(newStart, newStart + rangeWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartX, dragStartValue, duration, startTime, endTime, onChange]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-gray-600">
        <span>开始: {formatTime(startTime)}</span>
        <span>持续: {formatTime(endTime - startTime)}</span>
        <span>结束: {formatTime(endTime)}</span>
      </div>
      
      <div 
        ref={containerRef}
        className="relative h-12 bg-gray-200 rounded-lg cursor-pointer select-none"
        onMouseDown={(e) => handleMouseDown(e, 'range')}
      >
        <div className="absolute inset-0 flex">
          <div 
            className="bg-gray-400"
            style={{ width: `${toPercent(startTime)}%` }}
          />
          <div 
            className="bg-blue-500"
            style={{ width: `${toPercent(endTime - startTime)}%` }}
          />
          <div 
            className="flex-1 bg-gray-400"
          />
        </div>

        <div 
          className="absolute top-0 bottom-0 w-3 bg-blue-700 cursor-ew-resize rounded flex items-center justify-center"
          style={{ left: `${toPercent(startTime)}%`, transform: 'translateX(-50%)' }}
          onMouseDown={(e) => handleMouseDown(e, 'start')}
        >
          <div className="w-1 h-6 bg-white rounded-full" />
        </div>

        <div 
          className="absolute top-0 bottom-0 w-3 bg-blue-700 cursor-ew-resize rounded flex items-center justify-center"
          style={{ left: `${toPercent(endTime)}%`, transform: 'translateX(-50%)' }}
          onMouseDown={(e) => handleMouseDown(e, 'end')}
        >
          <div className="w-1 h-6 bg-white rounded-full" />
        </div>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs font-medium pointer-events-none">
          {formatTime(endTime - startTime)}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="range"
          min="0"
          max={duration}
          step="0.1"
          value={startTime}
          onChange={(e) => {
            const newStart = parseFloat(e.target.value);
            if (newStart < endTime) {
              onChange(newStart, endTime);
            }
          }}
          className="flex-1"
        />
        <input
          type="range"
          min="0"
          max={duration}
          step="0.1"
          value={endTime}
          onChange={(e) => {
            const newEnd = parseFloat(e.target.value);
            if (newEnd > startTime) {
              onChange(startTime, newEnd);
            }
          }}
          className="flex-1"
        />
      </div>
    </div>
  );
}
