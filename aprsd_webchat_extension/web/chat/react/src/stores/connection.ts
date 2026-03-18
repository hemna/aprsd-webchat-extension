import { create } from 'zustand'
import type { ConfigResponse } from '@/types'

interface ConnectionState {
  connected: boolean
  reconnecting: boolean
  transport: string
  aprsConnection: string
  callsign: string
  version: string
  aprsdVersion: string
  defaultPath: string
  beaconingEnabled: boolean
  aprsthursdayEnabled: boolean
  isDiGiPi: boolean
  configLoaded: boolean
}

interface ConnectionActions {
  setConnected: (value: boolean) => void
  setReconnecting: (value: boolean) => void
  hydrate: (config: ConfigResponse) => void
}

type ConnectionStore = ConnectionState & ConnectionActions

export const useConnection = create<ConnectionStore>()((set) => ({
  connected: false,
  reconnecting: false,
  transport: '',
  aprsConnection: '',
  callsign: '',
  version: '',
  aprsdVersion: '',
  defaultPath: 'WIDE1-1,WIDE2-1',
  beaconingEnabled: false,
  aprsthursdayEnabled: false,
  isDiGiPi: false,
  configLoaded: false,

  setConnected: (value: boolean) => set({ connected: value, reconnecting: !value && false }),
  setReconnecting: (value: boolean) => set({ reconnecting: value }),

  hydrate: (config: ConfigResponse) =>
    set({
      callsign: config.callsign,
      transport: config.transport,
      aprsConnection: config.aprs_connection,
      defaultPath: config.default_path || 'WIDE1-1,WIDE2-1',
      beaconingEnabled: config.beaconing_enabled,
      aprsthursdayEnabled: config.aprsthursday_enabled,
      isDiGiPi: config.is_digipi,
      version: config.version,
      aprsdVersion: config.aprsd_version,
      configLoaded: true,
    }),
}))
