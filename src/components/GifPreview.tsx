import { useVideoStore } from '../stores/videoStore';

export function GifPreview() {
  const { conversionQueue, removeFromQueue } = useVideoStore();
  const { tasks } = conversionQueue;

  if (tasks.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">转换队列</h3>
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700 truncate">
                {task.videoFile.name}
              </span>
              <button
                onClick={() => removeFromQueue(task.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    task.status === 'completed'
                      ? 'bg-green-500'
                      : task.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-sm text-gray-500 min-w-[50px]">
                {task.status === 'completed'
                  ? '✅'
                  : task.status === 'error'
                  ? '❌'
                  : `${task.progress}%`}
              </span>
            </div>

            {task.status === 'completed' && task.resultBlob && (
              <div className="mt-3">
                <img
                  src={URL.createObjectURL(task.resultBlob)}
                  alt="GIF Preview"
                  className="max-w-full rounded"
                />
              </div>
            )}

            {task.status === 'error' && task.error && (
              <p className="mt-2 text-sm text-red-600">{task.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
