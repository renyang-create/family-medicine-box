import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * 应用配置（替代 app.json）。
 *
 * 约束：
 * - 这里只能出现「可公开」的配置（包名、scheme、权限、图标）。
 * - 严禁出现任何密钥；AI 密钥只存 Supabase Edge Function secrets。
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '家庭药箱',
  slug: 'family-medicine-box',
  version: '0.1.1',
  orientation: 'portrait',
  // MVP 先固定浅色主题：过期标红的对比度需要稳定可控，暗色模式放 P2
  userInterfaceStyle: 'light',
  scheme: 'medicinebox',
  icon: './assets/images/icon.png',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.renyang.medicinebox',
    buildNumber: '2',
  },
  android: {
    package: 'com.renyang.medicinebox',
    versionCode: 2,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    // 吃药提醒所需权限：
    // POST_NOTIFICATIONS = Android 13+ 通知权限
    // SCHEDULE_EXACT_ALARM = 精确到点的本地提醒（用户可在系统设置里撤销）
    permissions: ['POST_NOTIFICATIONS', 'SCHEDULE_EXACT_ALARM'],
  },
  web: {
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
  ],
  experiments: {
    reactCompiler: true,
  },
  // EAS 项目归属与 ID（由 `eas init` 生成）。
  // projectId 不是密钥，可以进仓库；换项目时同步更新这里。
  owner: 'renyang',
  extra: {
    eas: {
      projectId: 'de89dd8d-ea6c-47c9-b886-5395128ad438',
    },
  },
});
