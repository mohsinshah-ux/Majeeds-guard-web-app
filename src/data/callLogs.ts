export type CallDirection = 'incoming' | 'outgoing' | 'missed';

export interface CallLog {
  id: string;
  contact: string;
  phoneNumber: string;
  direction: CallDirection;
  duration: number; // seconds
  date: string;
  time: string;
}

export const callLogs: CallLog[] = [
  { id: '1', contact: 'John Smith', phoneNumber: '+1 234 567 8901', direction: 'outgoing', duration: 125, date: '2025-02-27', time: '10:32' },
  { id: '2', contact: 'Sarah Wilson', phoneNumber: '+1 234 567 8902', direction: 'incoming', duration: 45, date: '2025-02-27', time: '09:15' },
  { id: '3', contact: 'Mike Johnson', phoneNumber: '+1 234 567 8903', direction: 'missed', duration: 0, date: '2025-02-27', time: '08:02' },
  { id: '4', contact: 'Emily Davis', phoneNumber: '+1 234 567 8904', direction: 'outgoing', duration: 320, date: '2025-02-26', time: '18:45' },
  { id: '5', contact: 'David Brown', phoneNumber: '+1 234 567 8905', direction: 'incoming', duration: 89, date: '2025-02-26', time: '14:20' },
  { id: '6', contact: 'Lisa Anderson', phoneNumber: '+1 234 567 8906', direction: 'outgoing', duration: 0, date: '2025-02-26', time: '11:00' },
  { id: '7', contact: 'James Taylor', phoneNumber: '+1 234 567 8907', direction: 'incoming', duration: 210, date: '2025-02-25', time: '16:30' },
  { id: '8', contact: 'Anna Martinez', phoneNumber: '+1 234 567 8908', direction: 'outgoing', duration: 67, date: '2025-02-25', time: '13:12' },
  { id: '9', contact: 'Robert Clark', phoneNumber: '+1 234 567 8909', direction: 'missed', duration: 0, date: '2025-02-25', time: '09:45' },
  { id: '10', contact: 'Jennifer White', phoneNumber: '+1 234 567 8910', direction: 'incoming', duration: 156, date: '2025-02-24', time: '19:00' },
];
