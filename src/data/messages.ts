export type MessageType = 'incoming' | 'outgoing';

export interface Message {
  id: string;
  contact: string;
  snippet: string;
  fullText: string;
  channel: string;
  type: MessageType;
  date: string;
  time: string;
  unread?: boolean;
}

export const messages: Message[] = [
  { id: '1', contact: 'John Smith', snippet: 'Hey, are we still on for tomorrow?', fullText: 'Hey, are we still on for tomorrow?', channel: 'SMS', type: 'incoming', date: '2025-02-27', time: '10:35', unread: true },
  { id: '2', contact: 'Sarah Wilson', snippet: 'Thanks for the update!', fullText: 'Thanks for the update!', channel: 'SMS', type: 'outgoing', date: '2025-02-27', time: '09:20' },
  { id: '3', contact: 'Mike Johnson', snippet: 'Call me when you get a chance', fullText: 'Call me when you get a chance', channel: 'SMS', type: 'incoming', date: '2025-02-27', time: '08:05' },
  { id: '4', contact: 'Emily Davis', snippet: 'The meeting is at 3 PM', fullText: 'The meeting is at 3 PM', channel: 'SMS', type: 'outgoing', date: '2025-02-26', time: '18:50' },
  { id: '5', contact: 'David Brown', snippet: 'Sure, no problem', fullText: 'Sure, no problem', channel: 'SMS', type: 'incoming', date: '2025-02-26', time: '14:25' },
  { id: '6', contact: 'Lisa Anderson', snippet: 'Did you see the news?', fullText: 'Did you see the news?', channel: 'SMS', type: 'incoming', date: '2025-02-26', time: '11:15', unread: true },
  { id: '7', contact: 'James Taylor', snippet: 'I will send it over soon', fullText: 'I will send it over soon', channel: 'SMS', type: 'outgoing', date: '2025-02-25', time: '16:45' },
  { id: '8', contact: 'Anna Martinez', snippet: 'Perfect, see you then!', fullText: 'Perfect, see you then!', channel: 'SMS', type: 'incoming', date: '2025-02-25', time: '13:18' },
  { id: '9', contact: 'Robert Clark', snippet: 'Where is the file?', fullText: 'Where is the file?', channel: 'SMS', type: 'outgoing', date: '2025-02-25', time: '09:50' },
  { id: '10', contact: 'Jennifer White', snippet: 'Dinner tonight?', fullText: 'Dinner tonight?', channel: 'SMS', type: 'incoming', date: '2025-02-24', time: '19:05' },
];
