export type SocialApp = 'whatsapp' | 'facebook' | 'snapchat' | 'tiktok' | 'telegram' | 'line';

export interface ChatMessage {
  id: string;
  contact: string;
  content: string;
  type: 'incoming' | 'outgoing';
  date: string;
  time: string;
  media?: string;
}

export interface SocialChat {
  app: SocialApp;
  chats: ChatMessage[];
}

const genericChats: ChatMessage[] = [
  { id: '1', contact: 'Alex', content: 'Hey, how are you?', type: 'incoming', date: '2025-02-27', time: '10:00' },
  { id: '2', contact: 'Alex', content: 'I am good, thanks!', type: 'outgoing', date: '2025-02-27', time: '10:02' },
  { id: '3', contact: 'Jordan', content: 'See you at the party', type: 'outgoing', date: '2025-02-26', time: '19:00' },
  { id: '4', contact: 'Sam', content: 'Photo shared', type: 'incoming', date: '2025-02-26', time: '15:30', media: 'image' },
  { id: '5', contact: 'Casey', content: 'Voice message', type: 'incoming', date: '2025-02-25', time: '12:00', media: 'audio' },
];

export const socialChatsData: Record<SocialApp, ChatMessage[]> = {
  whatsapp: [...genericChats, { id: 'w1', contact: 'Mom', content: 'Call me when you are free', type: 'incoming', date: '2025-02-27', time: '08:00' }],
  facebook: genericChats,
  snapchat: genericChats,
  tiktok: genericChats,
  telegram: genericChats,
  line: genericChats,
};
