import type { HealthSource } from './healthSource.types';

// Platforms without a health store (web, tests); see healthSource.ios.ts / .android.ts
export const healthSource: HealthSource = {
  name: null,
  isAvailable: async () => false,
  requestPermission: async () => false,
  readNight: async () => ({ heartRate: [], hrv: [], respiratoryRate: [], oxygenSaturation: [], stages: [] }),
};
