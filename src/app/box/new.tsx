import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { z } from 'zod';

import { useCreateBox } from '@/features/boxes/hooks';
import { AppText, Button, Card, PageHeader, Screen, TextField, spacing } from '@/shared/ui';
import { toUserMessage } from '@/shared/utils/error-message';

const nameSchema = z.string().trim().min(1, '请填写药箱名字').max(30, '名字最多 30 个字');

export default function NewBoxScreen() {
  const router = useRouter();
  const createBox = useCreateBox();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '请检查输入');
      return;
    }
    setError(null);
    try {
      await createBox.mutateAsync(parsed.data);
      router.back();
    } catch (cause) {
      setError(toUserMessage(cause));
    }
  }

  return (
    <Screen>
      <PageHeader onBack={() => router.back()} subtitle="创建后你会自动成为创建者" title="创建药箱" />

      <Card style={styles.form}>
        <TextField
          autoFocus
          error={error}
          label="药箱名字"
          maxLength={30}
          onChangeText={setName}
          placeholder="比如「家里常备药」"
          value={name}
        />
        <Button
          disabled={createBox.isPending}
          label={createBox.isPending ? '创建中…' : '创建'}
          onPress={handleSubmit}
        />
      </Card>

      <AppText variant="caption">
        创建成功后，在药箱里可以看到 6 位邀请码，发给家人就能一起用。每个药箱最多 5 人。
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
});
