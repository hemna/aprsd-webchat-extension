import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import { useMessages } from '@/stores/messages'
import { useConnection } from '@/stores/connection'
import { useGPS } from '@/stores/gps'
import { useUI } from '@/stores/ui'
import { useAPRSThursday } from '@/stores/aprs-thursday'
import type { IncomingPacket, SentMessageData, APRSThursdayMessage, APRSThursdayConfirmation, CallsignLocation, GPSSettings } from '@/types'

export function useSocketEvents(socket: Socket | null) {
  const addMessage = useMessages((s) => s.addMessage)
  const ackMessage = useMessages((s) => s.ackMessage)
  const updateLocation = useMessages((s) => s.updateLocation)
  const setConnected = useConnection((s) => s.setConnected)
  const setReconnecting = useConnection((s) => s.setReconnecting)
  const updateFix = useGPS((s) => s.updateFix)
  const updateGPSSettings = useGPS((s) => s.updateSettings)
  const setLastBeacon = useGPS((s) => s.setLastBeacon)
  const blinkRadio = useUI((s) => s.blinkRadio)
  const addAPRSThursdayMessage = useAPRSThursday((s) => s.addMessage)
  const handleAPRSThursdayConfirmation = useAPRSThursday((s) => s.handleConfirmation)

  useEffect(() => {
    if (!socket) return

    const onConnect = () => setConnected(true)
    const onDisconnect = () => {
      setConnected(false)
      setReconnecting(true)
    }
    const onConnectError = () => {
      setConnected(false)
      setReconnecting(true)
    }

    const onNew = (data: IncomingPacket) => {
      addMessage({
        id: `${data.from_call}-${data.to_call}-${data.timestamp}-${data.msgNo}`,
        from_call: data.from_call,
        to_call: data.to_call,
        message_text: data.message_text,
        msgNo: data.msgNo,
        timestamp: data.timestamp,
        type: 'rx',
        ack: false,
        raw: data.raw,
        path: data.path,
      })
    }

    const onSent = (data: SentMessageData) => {
      addMessage({
        id: `${data.from_call}-${data.to_call}-${data.timestamp}-${data.msgNo}`,
        from_call: data.from_call,
        to_call: data.to_call,
        message_text: data.message_text,
        msgNo: data.msgNo,
        timestamp: data.timestamp,
        type: 'tx',
        ack: data.ack || false,
        raw: data.raw,
        path: data.path,
      })
    }

    const onAck = (data: SentMessageData) => {
      ackMessage(data.msgNo)
    }

    const onRxPkt = () => blinkRadio('rx')
    const onTxPkt = () => blinkRadio('tx')

    const onCallsignLocation = (data: CallsignLocation) => {
      updateLocation(data)
    }

    const onGPSStats = (data: { fix: boolean; latitude: number; longitude: number; altitude: number; speed: number; track: number }) => {
      updateFix(data)
    }

    const onGPSBeaconSent = (data: { latitude: number; longitude: number; symbol: string }) => {
      setLastBeacon(data)
    }

    const onGPSSettings = (data: { settings: GPSSettings }) => {
      updateGPSSettings(data.settings)
    }

    const onAPRSThursdayMessage = (data: APRSThursdayMessage) => {
      addAPRSThursdayMessage(data)
    }

    const onAPRSThursdayConfirmation = (data: APRSThursdayConfirmation) => {
      handleAPRSThursdayConfirmation(data)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('new', onNew)
    socket.on('sent', onSent)
    socket.on('ack', onAck)
    socket.on('rx_pkt', onRxPkt)
    socket.on('tx_pkt', onTxPkt)
    socket.on('callsign_location', onCallsignLocation)
    socket.on('gps_stats', onGPSStats)
    socket.on('gps_beacon_sent', onGPSBeaconSent)
    socket.on('gps_settings', onGPSSettings)
    socket.on('aprsthursday_message', onAPRSThursdayMessage)
    socket.on('aprsthursday_confirmation', onAPRSThursdayConfirmation)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('new', onNew)
      socket.off('sent', onSent)
      socket.off('ack', onAck)
      socket.off('rx_pkt', onRxPkt)
      socket.off('tx_pkt', onTxPkt)
      socket.off('callsign_location', onCallsignLocation)
      socket.off('gps_stats', onGPSStats)
      socket.off('gps_beacon_sent', onGPSBeaconSent)
      socket.off('gps_settings', onGPSSettings)
      socket.off('aprsthursday_message', onAPRSThursdayMessage)
      socket.off('aprsthursday_confirmation', onAPRSThursdayConfirmation)
    }
  }, [socket, addMessage, ackMessage, updateLocation, setConnected, setReconnecting, updateFix, updateGPSSettings, setLastBeacon, blinkRadio, addAPRSThursdayMessage, handleAPRSThursdayConfirmation])
}
