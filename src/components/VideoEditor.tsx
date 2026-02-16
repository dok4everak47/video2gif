import { useState, useEffect } from 'react';
import { useVideoStore } from '../stores/videoStore';
import { useSettingsStore } from '../stores/settingsStore';
import { convertVideoToGif, downloadBlob } from '../utils/ffmpeg';
import type { ConversionOptions } from '../utils/ffmpeg';
import { Timeline } from './Timeline';

interface ConversionJob {
  id: number;
  videoIndex: number;
  status: 'pending' | 'converting' | 'completed' | 'error';
  progress: number;
  resultBlob?: Blob;
  error?: string;
}

const WIDTH_OPTIONS = [240, 320, 480, 640, 720, 800];
const FRAME_RATE_OPTIONS = [5, 10, 15, 20, 24, 30];

const FILTER_OPTIONS = [
  { value: 'none', label: '无' },
  { value: 'grayscale', label: '黑白' },
  { value: 'sepia', label: '复古' },
  { value: 'blur', label: '模糊' },
  { value: 'brightness', label: '高亮' },
  { value: 'contrast', label: '高对比' },
];

export function VideoEditor() {
  const { videoFiles, isFFmpegLoaded } = useVideoStore();
  const { options: savedOptions, setOptions } = useSettingsStore();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [startTime, setStartTime] = useState(savedOptions?.startTime || 0);
  const [endTime, setEndTime] = useState((savedOptions?.startTime || 0) + (savedOptions?.duration || 5));
  const [options, setOptionsState] = useState<ConversionOptions>(savedOptions);
  const [isConverting, setIsConverting] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  
  const [batchJobs, setBatchJobs] = useState<ConversionJob[]>([]);
  const [isBatchConverting, setIsBatchConverting] = useState(false);

  const selectedVideo = videoFiles[selectedIndex];

  useEffect(() => {
    if (selectedVideo && selectedVideo.duration > 0) {
      setStartTime(0);
      setEndTime(Math.min(5, selectedVideo.duration));
    }
  }, [selectedIndex, selectedVideo]);

  const handleTimelineChange = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
    const newOptions = { ...options, startTime: start, duration: end - start };
    setOptionsState(newOptions);
    setOptions(newOptions);
  };

  const handleOptionsChange = (newOptions: Partial<ConversionOptions>) => {
    const updated = { ...options, ...newOptions };
    setOptionsState(updated);
    setOptions(updated);
  };

  const handleConvert = async () => {
    if (!selectedVideo) return;

    setIsConverting(true);
    setCurrentProgress(0);
    setResultBlob(null);

    try {
      const blob = await convertVideoToGif(
        selectedVideo.file,
        options,
        (progress) => setCurrentProgress(progress)
      );
      setResultBlob(blob);
    } catch (err) {
      console.error('Conversion failed:', err);
      alert('转换失败，请重试');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const filename = selectedVideo.name.replace(/\.[^/.]+$/, '') + '.gif';
    downloadBlob(resultBlob, filename);
  };

  const handleBatchConvert = async () => {
    if (videoFiles.length === 0) return;

    const jobs: ConversionJob[] = videoFiles.map((_, index) => ({
      id: index,
      videoIndex: index,
      status: 'pending',
      progress: 0,
    }));

    setBatchJobs(jobs);
    setIsBatchConverting(true);

    for (let i = 0; i < jobs.length; i++) {
      const video = videoFiles[i];
      
      setBatchJobs(prev => prev.map(job => 
        job.id === i ? { ...job, status: 'converting', progress: 0 } : job
      ));

      try {
        const blob = await convertVideoToGif(
          video.file,
          options,
          (progress) => {
            setBatchJobs(prev => prev.map(job => 
              job.id === i ? { ...job, progress } : job
            ));
          }
        );

        setBatchJobs(prev => prev.map(job => 
          job.id === i ? { ...job, status: 'completed', progress: 100, resultBlob: blob } : job
        ));
      } catch (err) {
        setBatchJobs(prev => prev.map(job => 
          job.id === i ? { ...job, status: 'error', error: '转换失败' } : job
        ));
      }
    }

    setIsBatchConverting(false);
  };

  const handleDownloadAll = () => {
    const completedJobs = batchJobs.filter(job => job.status === 'completed' && job.resultBlob);
    completedJobs.forEach(job => {
      const video = videoFiles[job.videoIndex];
      const filename = video.name.replace(/\.[^/.]+$/, '') + '.gif';
      downloadBlob(job.resultBlob!, filename);
    });
  };

  const handleDownloadSingle = (job: ConversionJob) => {
    if (!job.resultBlob) return;
    const video = videoFiles[job.videoIndex];
    const filename = video.name.replace(/\.[^/.]+$/, '') + '.gif';
    downloadBlob(job.resultBlob, filename);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (videoFiles.length === 0) {
    return null;
  }

  const completedCount = batchJobs.filter(j => j.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {videoFiles.map((video, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedIndex === index
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {video.name.length > 20 ? video.name.slice(0, 20) + '...' : video.name}
            {video.duration > 0 && ` (${formatDuration(video.duration)})`}
          </button>
        ))}
      </div>

      {selectedVideo && selectedVideo.duration > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <video
            src={selectedVideo.url}
            className="w-full max-h-64 rounded-lg mb-4"
            controls
          />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择片段（可视化裁剪）
            </label>
            <Timeline
              duration={selectedVideo.duration}
              startTime={startTime || 0}
              endTime={endTime || 5}
              onChange={handleTimelineChange}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始时间 (秒)
              </label>
              <input
                type="number"
                min="0"
                max={selectedVideo.duration}
                step="0.1"
                value={options.startTime}
                onChange={(e) => handleOptionsChange({ ...options, startTime: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                持续时间 (秒)
              </label>
              <input
                type="number"
                min="0.1"
                max={selectedVideo.duration - (options.startTime || 0)}
                step="0.1"
                value={options.duration}
                onChange={(e) => handleOptionsChange({ ...options, duration: parseFloat(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                宽度 (px)
              </label>
              <select
                value={options.width}
                onChange={(e) => handleOptionsChange({ ...options, width: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {WIDTH_OPTIONS.map((w) => (
                  <option key={w} value={w}>{w}px</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                帧率 (fps)
              </label>
              <select
                value={options.frameRate}
                onChange={(e) => handleOptionsChange({ ...options, frameRate: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {FRAME_RATE_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f} fps</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              质量: {options.quality} (1-31, 越低越好)
            </label>
            <input
              type="range"
              min="1"
              max="31"
              value={options.quality}
              onChange={(e) => handleOptionsChange({ ...options, quality: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                滤镜效果
              </label>
              <select
                value={options.filter || 'none'}
                onChange={(e) => handleOptionsChange({ ...options, filter: e.target.value as ConversionOptions['filter'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.reverse || false}
                  onChange={(e) => handleOptionsChange({ ...options, reverse: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">倒放</span>
              </label>
            </div>
          </div>

          {false && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-3">文字水印</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">文字内容</label>
                <input
                  type="text"
                  placeholder="输入要显示的文字..."
                  value={options.text || ''}
                  onChange={(e) => handleOptionsChange({ ...options, text: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">位置</label>
                  <select
                    value={options.textPosition || 'bottom'}
                    onChange={(e) => handleOptionsChange({ ...options, textPosition: e.target.value as 'top' | 'bottom' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="top">顶部</option>
                    <option value="bottom">底部</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">颜色</label>
                  <select
                    value={options.textColor || 'white'}
                    onChange={(e) => handleOptionsChange({ ...options, textColor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="white">白色</option>
                    <option value="black">黑色</option>
                    <option value="yellow">黄色</option>
                    <option value="red">红色</option>
                    <option value="green">绿色</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleConvert}
              disabled={isConverting || !isFFmpegLoaded}
              className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isConverting ? `转换中 ${currentProgress}%` : '开始转换'}
            </button>

            {resultBlob && (
              <button
                onClick={handleDownload}
                className="py-2 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                下载 GIF
              </button>
            )}
          </div>
        </div>
      )}

      {resultBlob && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700 font-medium">
            ✅ 转换完成! GIF 大小: {(resultBlob.size / 1024).toFixed(1)} KB
          </p>
        </div>
      )}

      {videoFiles.length > 1 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-800 mb-3">
            批量转换 ({videoFiles.length} 个视频)
          </h3>
          
          {!isBatchConverting && batchJobs.length === 0 && (
            <button
              onClick={handleBatchConvert}
              disabled={!isFFmpegLoaded}
              className="w-full py-2 px-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              批量转换全部
            </button>
          )}

          {isBatchConverting && (
            <div className="space-y-2">
              <p className="text-purple-700">
                正在转换... {completedCount}/{videoFiles.length}
              </p>
              {batchJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-2 text-sm">
                  <span className={
                    job.status === 'completed' ? 'text-green-600' :
                    job.status === 'error' ? 'text-red-600' :
                    'text-purple-600'
                  }>
                    {job.status === 'completed' ? '✅' :
                     job.status === 'error' ? '❌' :
                     job.status === 'converting' ? '⏳' : '⏸'}
                  </span>
                  <span className="flex-1 truncate">
                    {videoFiles[job.videoIndex].name}
                  </span>
                  {job.status === 'converting' && (
                    <span>{job.progress}%</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isBatchConverting && batchJobs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-purple-700">
                  完成: {completedCount}/{videoFiles.length}
                </span>
                {completedCount > 0 && (
                  <button
                    onClick={handleDownloadAll}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    全部下载
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {batchJobs.map((job) => (
                  <div key={job.id} className="flex items-center gap-2 text-sm bg-white rounded p-2">
                    <span className={
                      job.status === 'completed' ? 'text-green-600' :
                      job.status === 'error' ? 'text-red-600' :
                      'text-gray-400'
                    }>
                      {job.status === 'completed' ? '✅' :
                       job.status === 'error' ? '❌' : '⏳'}
                    </span>
                    <span className="flex-1 truncate">
                      {videoFiles[job.videoIndex].name}
                    </span>
                    {job.status === 'completed' && job.resultBlob && (
                      <button
                        onClick={() => handleDownloadSingle(job)}
                        className="text-blue-600 hover:underline"
                      >
                        下载
                      </button>
                    )}
                    {job.status === 'error' && (
                      <span className="text-red-500 text-xs">{job.error}</span>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setBatchJobs([])}
                className="w-full py-2 text-purple-600 hover:bg-purple-100 rounded transition-colors"
              >
                清除队列
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
