import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xylem.pos',
  appName: 'Xylem POS',
  webDir: 'out',
  server: {
    url: 'https://xylem-landscape.vercel.app',
    cleartext: true,
    allowNavigation: ['access.line.me', 'api.line.me', '*.line.me', 'profile.line-scdn.net']
  }
};

export default config;
