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
  version: '0.1.0',
  orientation: 'portrait',
  // MVP 先固定浅色主题：过期标红的对比度需要稳定可控，暗色模式放 P2
  userInterfaceStyle: 'light',
  scheme: 'medicinebox',
  icon: './assets/images/icon.png',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.renyang.medicinebox',
  },
  android: {
    package: 'com.renyang.medicinebox',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    // 吃药提醒（T8）所需通知权限；精确闹钟相关权限在 T8 评估后再补
    permissions: ['POST_NOTIFICATIONS'],
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
  extra: {
    // EAS projectId 在 `eas init` 后由 EAS 写入，不要在仓库里硬编码
  },
});
