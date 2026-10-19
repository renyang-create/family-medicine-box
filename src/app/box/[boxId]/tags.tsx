import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useMedicines } from '@/features/medicines/hooks';
import { useTagEditor } from '@/features/medicines/tag-hooks';
import { MAX_TAG_LENGTH } from '@/shared/constants/tags';
import { collectTagCounts } from '@/shared/domain/tags';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Screen,
  TextField,
  colors,
  spacing,
} from '@/shared/ui';
import { confirmDialog } from '@/shared/utils/dialog';

/**
 * 标签管理：批量改名 / 删除。
 * 标签存在每条药品的 tags 里，所以这里改的其实是「用到它的所有药品」，
 * 药品本身不会被删。
 */
export default function TagManagerScreen() {
  const router = useRouter();
  const { boxId } = useLocalSearchParams<{ boxId: string }>();
  const medicinesQuery = useMedicines(boxId ?? '');
  // 缓存空数组引用，避免每次渲染都生成新数组把 useMemo 依赖打穿
  const medicines = useMemo(() => medicinesQuery.data ?? [], [medicinesQuery.data]);

  const items = useMemo(() => collectTagCounts(medicines), [medicines]);
  const editor = useTagEditor(boxId ?? '');

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  function startEdit(tag: string) {
    setEditing(tag);
    setDraft(tag);
    setNotice(null);
    editor.clearError();
  }

  async function handleRename() {
    if (!editing) return;

    const changed = await editor.rename({ medicines, from: editing, to: draft });
    if (changed === null) return;

    setEditing(null);
    setDraft('');
    setNotice(changed === 0 ? '没有需要修改的药品' : `已更新 ${changed} 个药品`);
  }

  async function handleDelete(tag: string) {
    const confirmed = await confirmDialog({
      title: `删除标签「${tag}」`,
      message: '会从这个药箱里所有药品上移除该标签，药品本身不会被删除。',
      confirmText: '删除',
      destructive: true,
    });
    if (!confirmed) return;

    const changed = await editor.remove({ medicines, tag });
    if (changed === null) return;

    if (editing === tag) {
      setEditing(null);
      setDraft('');
    }
    setNotice(`已从 ${changed} 个药品上移除「${tag}」`);
  }

  return (
    <Screen>
      <PageHeader
        onBack={() => router.back()}
        subtitle="改名或删除会同步到本药箱内所有用到它的药品"
        title="标签管理"
      />

      {medicinesQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : items.length === 0 ? (
        <EmptyState
          description="先在药品表单里给药品加上症状标签，这里就会出现可管理的标签。"
          title="这个药箱还没有标签"
        >
          <Button
            label="去添加药品"
            onPress={() => router.push(`/box/${boxId}/medicine/new`)}
            variant="secondary"
          />
        </EmptyState>
      ) : (
        <>
          {editing ? (
            <Card style={styles.editor}>
              <AppText variant="bodyStrong">把「{editing}」改成</AppText>
              <TextField
                error={editor.error}
                label="新的标签名"
                maxLength={MAX_TAG_LENGTH}
                onChangeText={setDraft}
                onSubmitEditing={() => void handleRename()}
                returnKeyType="done"
                value={draft}
              />
              <View style={styles.actions}>
                <Button
                  disabled={editor.busy}
                  label={editor.busy ? '保存中…' : '保存'}
                  onPress={() => void handleRename()}
                  style={styles.flex}
                />
                <Button
                  disabled={editor.busy}
                  label="取消"
                  onPress={() => {
                    setEditing(null);
                    setDraft('');
                    editor.clearError();
                  }}
                  style={styles.flex}
                  variant="secondary"
                />
              </View>
            </Card>
          ) : null}

          {notice ? (
            <AppText color={colors.success} variant="caption">
              {notice}
            </AppText>
          ) : null}

          {!editing && editor.error ? (
            <AppText color={colors.dangerText} variant="caption">
              {editor.error}
            </AppText>
          ) : null}

          <View style={styles.list}>
            {items.map(({ tag, count }) => (
              <Card key={tag} style={styles.row}>
                <View style={styles.rowText}>
                  <AppText variant="bodyStrong">{tag}</AppText>
                  <AppText variant="caption">{count} 个药品在用</AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => startEdit(tag)}
                >
                  <AppText color={colors.primary} variant="caption">
                    改名
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => void handleDelete(tag)}
                >
                  <AppText color={colors.dangerText} variant="caption">
                    删除
                  </AppText>
                </Pressable>
              </Card>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  editor: { gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  list: { gap: spacing.sm },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowText: { flex: 1, gap: 2 },
});
