import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useJoinBox } from '@/features/boxes/hooks';
import { AppText, Button, Card, PageHeader, Screen, TextField, spacing } from '@/shared/ui';
import { toUserMessage } from '@/shared/utils/error-message';
import { normalizeInviteCode } from '@/shared/utils/normalize-invite-code';

export default function JoinBoxScreen() {
  const router = useRouter();
  const joinBox = useJoinBox();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const normalized = normalizeInviteCode(code);
    if (normalized.length !== 6) {
      setError('邀请码是 6 位字母或数字');
      return;
    }
    setError(null);
    try {
      await joinBox.mutateAsync(normalized);
      router.back();
    } catch (cause) {
      setError(toUserMessage(cause));
    }
  }

  return (
    <Screen>
      <PageHeader onBack={() => router.back()} subtitle="向家人要 6 位邀请码" title="用邀请码加入" />

      <Card style={styles.form}>
        <TextField
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          error={error}
          hint="不区分大小写，空格会被自动去掉"
          label="邀请码"
          maxLength={12}
          onChangeText={(text) => setCode(normalizeInviteCode(text))}
          placeholder="例如 AB2C3D"
          value={code}
        />
        <Button
          disabled={joinBox.isPending}
          label={joinBox.isPending ? '加入中…' : '加入药箱'}
          onPress={handleSubmit}
        />
      </Card>

      <AppText variant="caption">
        加入后，你和家人在这个药箱里看到的药品、服药记录是同一份。每个药箱最多 5 人。
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
});
