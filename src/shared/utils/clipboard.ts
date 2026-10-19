import { Platform, Share } from 'react-native';

/**
 * 复制文本。
 * - web：优先用浏览器剪贴板 API（需要 https 或 localhost）
 * - 原生：不引入额外原生模块，改用系统分享面板（用户可「复制」或发给家人）
 * 返回 false 表示复制不可用，调用方应退化为「直接展示文案让用户手动复制」。
 */
export async function copyText(text: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const target = globalThis as {
      navigator?: { clipboard?: { writeText?: (value: string) => Promise<void> } };
    };
    const writeText = target.navigator?.clipboard?.writeText;
    if (!writeText) return false;
    try {
      await writeText.call(target.navigator?.clipboard, text);
      return true;
    } catch {
      return false;
    }
  }

  await Share.share({ message: text });
  return true;
}
