import { Alert, Platform } from 'react-native';

/**
 * 跨平台弹窗。
 * React Native Web 没有实现 Alert（调用后什么都不会发生），
 * 所以 web 上退回浏览器原生 confirm / alert。
 */

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

export function confirmDialog({
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    const confirmed =
      typeof globalThis !== 'undefined' && typeof globalThis.confirm === 'function'
        ? globalThis.confirm(text)
        : false;
    return Promise.resolve(confirmed);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export function showMessage(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof globalThis !== 'undefined' && typeof globalThis.alert === 'function') {
      globalThis.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}
