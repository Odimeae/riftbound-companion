import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

/**
 * Cross-platform alert. react-native-web's Alert is a no-op;
 * use window.alert / confirm on web so validation messages still show.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  if (Platform.OS === 'web') {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (buttons && buttons.length > 1) {
      const confirmed = typeof window !== 'undefined' ? window.confirm(text) : false;
      if (confirmed) {
        const action =
          buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
        action?.onPress?.();
      } else {
        buttons.find((b) => b.style === 'cancel')?.onPress?.();
      }
      return;
    }
    if (typeof window !== 'undefined') {
      window.alert(text);
    }
    buttons?.[0]?.onPress?.();
    return;
  }

  Alert.alert(title, message, buttons);
}
