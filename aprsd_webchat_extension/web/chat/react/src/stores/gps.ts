import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BeaconSymbol, GPSSettings } from '@/types'
import { createSafeStorage } from '@/lib/safe-storage'

interface GPSState {
  fix: boolean
  latitude: number
  longitude: number
  altitude: number
  speed: number
  course: number
  beaconType: 0 | 1 | 2 | 3
  beaconInterval: number
  smartBeaconDistance: number
  smartBeaconTimeWindow: number
  lastBeaconTime: string | null
  symbol: BeaconSymbol
  beaconSent: boolean
}

interface GPSActions {
  updateFix: (data: { fix: boolean; latitude: number; longitude: number; altitude: number; speed: number; track: number }) => void
  updateSettings: (settings: GPSSettings) => void
  setLastBeacon: (data: { latitude: number; longitude: number; symbol: string }) => void
  setSymbol: (symbol: BeaconSymbol) => void
  setBeaconType: (type: 0 | 1 | 2 | 3) => void
  setBeaconInterval: (interval: number) => void
  hydrateFromConfig: (latitude: number, longitude: number) => void
}

type GPSStore = GPSState & GPSActions

export const useGPS = create<GPSStore>()(
  persist(
    (set) => ({
      fix: false,
      latitude: 0,
      longitude: 0,
      altitude: 0,
      speed: 0,
      course: 0,
      beaconType: 0,
      beaconInterval: 600,
      smartBeaconDistance: 100,
      smartBeaconTimeWindow: 300,
      lastBeaconTime: null,
      symbol: { table: '/', symbol: '>', description: 'Car' },
      beaconSent: false,

      updateFix: (data) =>
        set({
          fix: data.fix,
          latitude: Number(data.latitude) || 0,
          longitude: Number(data.longitude) || 0,
          altitude: Number(data.altitude) || 0,
          speed: Number(data.speed) || 0,
          course: Number(data.track) || 0,
        }),

      updateSettings: (settings) =>
        set({
          beaconType: settings.beacon_type as 0 | 1 | 2 | 3,
          beaconInterval: settings.beacon_interval,
          smartBeaconDistance: settings.smart_beacon_distance_threshold,
          smartBeaconTimeWindow: settings.smart_beacon_time_window,
        }),

      setLastBeacon: () =>
        set({
          lastBeaconTime: new Date().toISOString(),
          beaconSent: true,
        }),

      setSymbol: (symbol) => set({ symbol }),
      setBeaconType: (type) => set({ beaconType: type }),
      setBeaconInterval: (interval) => set({ beaconInterval: interval }),
      hydrateFromConfig: (latitude, longitude) => {
        // Only set if we don't already have a GPS fix with real coordinates
        const current = useGPS.getState()
        if (!current.fix && current.latitude === 0 && current.longitude === 0) {
          set({ latitude: Number(latitude) || 0, longitude: Number(longitude) || 0 })
        }
      },
    }),
    {
      name: 'aprsd-webchat-gps',
      storage: createSafeStorage('gps'),
      partialize: (state) => ({
        symbol: state.symbol,
        lastBeaconTime: state.lastBeaconTime,
        beaconSent: state.beaconSent,
        beaconType: state.beaconType,
        beaconInterval: state.beaconInterval,
      }),
    }
  )
)
