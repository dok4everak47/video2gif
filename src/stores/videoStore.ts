import { create } from 'zustand';

export interface VideoFile {
  file: File;
  name: string;
  size: number;
  duration: number;
  url: string;
}

export interface ConversionOptions {
  startTime: number;
  duration: number;
  width: number;
  frameRate: number;
  quality: number;
}

export interface ConversionTask {
  id: string;
  videoFile: VideoFile;
  options: ConversionOptions;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  resultBlob?: Blob;
  error?: string;
}

interface VideoStore {
  videoFiles: VideoFile[];
  conversionQueue: ConversionQueue;
  isFFmpegLoaded: boolean;
  ffmpegProgress: number;
  
  addVideo: (file: File) => void;
  removeVideo: (index: number) => void;
  updateVideoDuration: (index: number, duration: number) => void;
  
  addToQueue: (task: Omit<ConversionTask, 'id' | 'status' | 'progress'>) => void;
  updateTaskStatus: (id: string, status: ConversionTask['status'], progress?: number, resultBlob?: Blob, error?: string) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  
  setFFmpegLoaded: (loaded: boolean) => void;
  setFFmpegProgress: (progress: number) => void;
}

interface ConversionQueue {
  tasks: ConversionTask[];
  currentTaskId: string | null;
}

let taskIdCounter = 0;

export const useVideoStore = create<VideoStore>((set) => ({
  videoFiles: [],
  conversionQueue: { tasks: [], currentTaskId: null },
  isFFmpegLoaded: false,
  ffmpegProgress: 0,

  addVideo: (file: File) => set((state) => ({
    videoFiles: [...state.videoFiles, {
      file,
      name: file.name,
      size: file.size,
      duration: 0,
      url: URL.createObjectURL(file),
    }],
  })),

  removeVideo: (index: number) => set((state) => {
    const newFiles = [...state.videoFiles];
    URL.revokeObjectURL(newFiles[index].url);
    newFiles.splice(index, 1);
    return { videoFiles: newFiles };
  }),

  updateVideoDuration: (index: number, duration: number) => set((state) => {
    const newFiles = [...state.videoFiles];
    newFiles[index].duration = duration;
    return { videoFiles: newFiles };
  }),

  addToQueue: (task) => set((state) => {
    const newTask: ConversionTask = {
      ...task,
      id: `task_${++taskIdCounter}`,
      status: 'pending',
      progress: 0,
    };
    return {
      conversionQueue: {
        ...state.conversionQueue,
        tasks: [...state.conversionQueue.tasks, newTask],
      },
    };
  }),

  updateTaskStatus: (id: string, status: ConversionTask['status'], progress?: number, resultBlob?: Blob, error?: string) => set((state) => {
    const tasks = state.conversionQueue.tasks.map((task) => {
      if (task.id === id) {
        return { ...task, status, progress: progress ?? task.progress, resultBlob, error };
      }
      return task;
    });
    return { conversionQueue: { ...state.conversionQueue, tasks } };
  }),

  removeFromQueue: (id: string) => set((state) => ({
    conversionQueue: {
      ...state.conversionQueue,
      tasks: state.conversionQueue.tasks.filter((t) => t.id !== id),
    },
  })),

  clearQueue: () => set(() => ({
    conversionQueue: { tasks: [], currentTaskId: null },
  })),

  setFFmpegLoaded: (loaded: boolean) => set({ isFFmpegLoaded: loaded }),
  setFFmpegProgress: (progress: number) => set({ ffmpegProgress: progress }),
}));
