// Message types
export type MessageType = 'tx' | 'rx' | 'ack'

export interface Message {
  id: string
  from_call: string
  to_call: string
  message_text: string
  msgNo: string
  timestamp: string
  type: MessageType
  ack: boolean
  raw?: string
  path?: string
}

export interface Channel {
  callsign: string
  path: string
  lastMessage?: Message
  lastActivity: string
  category: 'dm' | 'group' | 'system'
}

export interface CallsignLocation {
  callsign: string
  lat: number
  lon: number
  altitude: number
  course: number
  compass_bearing: string
  speed: number
  lasttime: string
  timeago: string
  distance: string
  last_updated?: string
}

export interface GPSFix {
  fix: boolean
  latitude: number
  longitude: number
  altitude: number
  speed: number
  track: number
  time?: string
}

export interface BeaconSymbol {
  table: string
  symbol: string
  description: string
}

export interface GPSSettings {
  beacon_type: number
  beacon_interval: number
  smart_beacon_distance_threshold: number
  smart_beacon_time_window: number
}

export interface APRSThursdayMessage {
  sender: string
  message: string
  timestamp: string
  raw_packet: string
}

export interface APRSThursdayConfirmation {
  type: 'subscribed' | 'unsubscribed' | 'logged'
  message: string
}

export interface ConfigResponse {
  callsign: string
  transport: string
  aprs_connection: string
  default_path: string
  beaconing_enabled: boolean
  aprsthursday_enabled: boolean
  is_digipi: boolean
  latitude: number
  longitude: number
  version: string
  aprsd_version: string
  initial_stats: Record<string, unknown>
}

export interface SentMessageData {
  msgNo: string
  from_call: string
  to_call: string
  message_text: string
  timestamp: string
  last_update: string
  status: string
  ack: boolean
  path: string
  raw?: string
}

export interface IncomingPacket {
  from_call: string
  to_call: string
  message_text: string
  msgNo: string
  timestamp: string
  raw?: string
  path?: string
  _type?: string
}
