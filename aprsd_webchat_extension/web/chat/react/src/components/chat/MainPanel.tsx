import { ChannelHeader } from './ChannelHeader'
import { ChatView } from './ChatView'
import { MessageInput } from './MessageInput'

export function MainPanel() {
  return (
    <>
      <ChannelHeader />
      <ChatView />
      <MessageInput />
    </>
  )
}
