import { VideoUploader } from './components/VideoUploader';
import { VideoEditor } from './components/VideoEditor';
import { GifPreview } from './components/GifPreview';
import { FFmpegLoader } from './components/FFmpegLoader';
import { useVideoStore } from './stores/videoStore';

function App() {
  const { videoFiles, removeVideo } = useVideoStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎬 Video to GIF Converter
          </h1>
          <p className="text-gray-600">
            在浏览器中将视频转换为 GIF 动画
          </p>
        </header>

        <FFmpegLoader />

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            1. 上传视频
          </h2>
          <VideoUploader />
        </div>

        {videoFiles.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                2. 视频列表
              </h2>
              <span className="text-sm text-gray-500">
                {videoFiles.length} 个视频
              </span>
            </div>
            <div className="space-y-2">
              {videoFiles.map((video, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <video
                      src={video.url}
                      className="w-16 h-12 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-700 truncate max-w-[200px]">
                        {video.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(video.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeVideo(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {videoFiles.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              3. 转换设置
            </h2>
            <VideoEditor />
          </div>
        )}

        <GifPreview />

        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by FFmpeg.wasm</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
