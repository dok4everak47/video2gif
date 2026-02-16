import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConversionOptions } from '../utils/ffmpeg';

interface SettingsState {
  options: ConversionOptions;
  setOptions: (options: Partial<ConversionOptions>) => void;
  resetOptions: () => void;
}

const defaultOptions: ConversionOptions = {
  startTime: 0,
  duration: 5,
  width: 480,
  frameRate: 10,
  quality: 10,
  reverse: false,
  filter: 'none',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      options: defaultOptions,

      setOptions: (newOptions) => set((state) => ({
        options: { ...state.options, ...newOptions },
      })),

      resetOptions: () => set({ options: defaultOptions }),
    }),
    {
      name: 'video2gif-settings',
    }
  )
);
