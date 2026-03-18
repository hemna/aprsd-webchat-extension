import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BeaconSymbol, GPSSettings } from '@/types'

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
          latitude: data.latitude,
          longitude: data.longitude,
          altitude: data.altitude,
          speed: data.speed,
          course: data.track,
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
    }),
    {
      name: 'aprsd-webchat-gps',
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
