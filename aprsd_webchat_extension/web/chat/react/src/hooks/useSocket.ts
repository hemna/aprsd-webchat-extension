import { createContext, useContext } from 'react'
import type { Socket } from 'socket.io-client'

export const SocketContext = createContext<Socket | null>(null)

export function useSocketContext(): Socket {
  const socket = useContext(SocketContext)
  if (!socket) {
    throw new Error('useSocketContext must be used within a SocketProvider')
  }
  return socket
}

export interface SocketEmitters {
  sendMessage: (to: string, message: string, path: string) => void
  sendBeacon: (lat: number, lon: number, path: string, symbol: string) => void
  getLocation: (callsign: string) => void
  sendAPRSThursday: (action: string, message: string, mode: string, path: string) => void
  setBeaconingSetting: (settings: {
    beacon_type: number
    beacon_interval: number
    smart_beacon_distance_threshold: number
    smart_beacon_time_window: number
  }) => void
}

export function useSocketEmitters(): SocketEmitters {
  const socket = useSocketContext()

  return {
    sendMessage: (to, message, path) =>
      socket.emit('send', { to, message, path }),
    sendBeacon: (lat, lon, path, symbol) =>
      socket.emit('gps', { latitude: lat, longitude: lon, path, symbol }),
    getLocation: (callsign) =>
      socket.emit('get_callsign_location', { callsign }),
    sendAPRSThursday: (action, message, mode, path) =>
      socket.emit('aprsthursday_send', { action, message, mode, path }),
    setBeaconingSetting: (settings) =>
      socket.emit('set_beaconing_setting', settings),
  }
}
