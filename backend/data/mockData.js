export const overviewStats = [
  { label: "Calls", value: 248, change: "+12%" },
  { label: "Messages", value: 1405, change: "+8%" },
  { label: "Locations", value: 93, change: "+3%" },
  { label: "Alerts", value: 17, change: "-4%" }
];

export const callLogs = [
  { id: 1, contact: "Mom", number: "+1-555-1022", type: "Incoming", duration: "03:42", time: "2026-04-16T09:11:00Z" },
  { id: 2, contact: "Unknown", number: "+1-555-8080", type: "Missed", duration: "00:00", time: "2026-04-16T11:33:00Z" },
  { id: 3, contact: "Dad", number: "+1-555-6611", type: "Outgoing", duration: "08:11", time: "2026-04-16T14:58:00Z" }
];

export const messages = [
  { id: 1, from: "Alex", channel: "SMS", preview: "Reached home", time: "2026-04-16T08:40:00Z" },
  { id: 2, from: "School", channel: "WhatsApp", preview: "PTM reminder", time: "2026-04-16T12:15:00Z" },
  { id: 3, from: "Mom", channel: "SMS", preview: "Call me after class", time: "2026-04-16T15:21:00Z" }
];

export const locations = [
  { id: 1, lat: 40.7128, lng: -74.006, place: "School", time: "2026-04-16T07:10:00Z" },
  { id: 2, lat: 40.7291, lng: -73.9965, place: "Cafe", time: "2026-04-16T13:35:00Z" },
  { id: 3, lat: 40.7061, lng: -74.0087, place: "Home", time: "2026-04-16T18:05:00Z" }
];

export const socialChats = [
  { id: 1, app: "WhatsApp", contact: "Ali", preview: "See you tomorrow", time: "2026-04-16T10:02:00Z" },
  { id: 2, app: "Telegram", contact: "Group A", preview: "Homework updates", time: "2026-04-16T16:22:00Z" }
];
