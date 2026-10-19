import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { MAX_TAGS_PER_MEDICINE, MAX_TAG_LENGTH, SYMPTOM_TAGS } from '@/shared/constants/tags';
import { hasTag, normalizeTag, sanitizeTags, toggleTag } from '@/shared/domain/tags';
import { AppText, Button, Card, Chip, TextField, colors, spacing } from '@/shared/ui';

import type { Medicine, MedicineInput } from './types';

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === '' || isValidDateKey(value), '格式应为 2027-03-31');

const formSchema = z.object({
  name: z.string().trim().min(1, '请填写药品名称').max(40, '名称最多 40 个字'),
  spec: z.string().trim().max(40, '规格最多 40 个字'),
  quantity: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      '数量必须是不小于 0 的数字',
    ),
  unit: z.string().trim().max(8, '单位最多 8 个字'),
  dosage: z.string().trim().max(60, '用法用量最多 60 个字'),
  storageLocation: z.string().trim().max(30, '存放位置最多 30 个字'),
  batchNo: z.string().trim().max(40, '批次最多 40 个字'),
  producedOn: optionalDate,
  expireDate: optionalDate,
  notes: z.string().trim().max(200, '备注最多 200 个字'),
});

type Props = {
  initial?: Medicine;
  submitting: boolean;
  submitLabel: string;
  serverError?: string | null;
  onSubmit: (input: MedicineInput) => void;
};

export function MedicineForm({ initial, submitting, submitLabel, serverError, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [spec, setSpec] = useState(initial?.spec ?? '');
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : '0');
  const [unit, setUnit] = useState(initial?.unit ?? '片');
  const [dosage, setDosage] = useState(initial?.dosage ?? '');
  const [storageLocation, setStorageLocation] = useState(initial?.storageLocation ?? '');
  const [batchNo, setBatchNo] = useState(initial?.batchNo ?? '');
  const [producedOn, setProducedOn] = useState(initial?.producedOn ?? '');
  const [expireDate, setExpireDate] = useState(initial?.expireDate ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 预设词 + 已选的自定义词，保证编辑时自定义标签也能看到
  const tagOptions = useMemo(() => sanitizeTags([...SYMPTOM_TAGS, ...tags]), [tags]);

  function pickTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag) return;

    const next = toggleTag(tags, tag);
    // 已达上限：长度没变且原本没有这个标签
    if (next.length === tags.length && !hasTag(tags, tag)) {
      setTagError(`最多选 ${MAX_TAGS_PER_MEDICINE} 个标签`);
      return;
    }

    setTagError(null);
    setTags(next);
  }

  function handleAddTag() {
    pickTag(tagInput);
    setTagInput('');
  }

  function handlePress() {
    const parsed = formSchema.safeParse({
      name,
      spec,
      quantity,
      unit,
      dosage,
      storageLocation,
      batchNo,
      producedOn,
      expireDate,
      notes,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '请检查输入');
      return;
    }

    setError(null);
    onSubmit({
      name: parsed.data.name,
      spec: parsed.data.spec,
      quantity: parsed.data.quantity === '' ? 0 : Number(parsed.data.quantity),
      unit: parsed.data.unit,
      dosage: parsed.data.dosage,
      storageLocation: parsed.data.storageLocation,
      batchNo: parsed.data.batchNo,
      producedOn: parsed.data.producedOn,
      expireDate: parsed.data.expireDate,
      notes: parsed.data.notes,
      tags,
    });
  }

  return (
    <View style={styles.wrapper}>
      <Card style={styles.card}>
        <TextField
          error={error}
          label="药品名称 *"
          maxLength={40}
          onChangeText={setName}
          placeholder="比如「布洛芬缓释胶囊」"
          value={name}
        />

        <TextField
          label="规格"
          maxLength={40}
          onChangeText={setSpec}
          placeholder="比如「0.3g × 20 粒」"
          value={spec}
        />

        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              keyboardType="decimal-pad"
              label="剩余数量"
              onChangeText={setQuantity}
              placeholder="0"
              value={quantity}
            />
          </View>
          <View style={styles.unitField}>
            <TextField label="单位" maxLength={8} onChangeText={setUnit} value={unit} />
          </View>
        </View>

        <TextField
          label="用法用量"
          maxLength={60}
          onChangeText={setDosage}
          placeholder="比如「一次 1 粒，一日 2 次」"
          value={dosage}
        />

        <TextField
          label="存放位置"
          maxLength={30}
          onChangeText={setStorageLocation}
          placeholder="比如「客厅抽屉」"
          value={storageLocation}
        />

        <TextField
          hint="格式 2026-01-31；留空表示不记录"
          label="生产日期"
          maxLength={10}
          onChangeText={setProducedOn}
          placeholder="2026-01-31"
          value={producedOn}
        />

        <TextField
          hint="距离到期 30 天内会标为临期，已过期会标红并置顶"
          label="有效期"
          maxLength={10}
          onChangeText={setExpireDate}
          placeholder="2027-03-31"
          value={expireDate}
        />

        <TextField
          label="生产批次"
          maxLength={40}
          onChangeText={setBatchNo}
          placeholder="选填"
          value={batchNo}
        />

        <TextField
          label="备注"
          maxLength={200}
          multiline
          numberOfLines={3}
          onChangeText={setNotes}
          placeholder="选填，比如「饭后吃」"
          style={styles.notes}
          value={notes}
        />

        <View style={styles.tagSection}>
          <AppText variant="bodyStrong">症状标签</AppText>
          <AppText variant="caption">比如发烧、咳嗽；用来在药箱里按症状筛药</AppText>

          <View style={styles.tagWrap}>
            {tagOptions.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onPress={() => pickTag(tag)}
                selected={hasTag(tags, tag)}
              />
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.flex}>
              <TextField
                label="自定义标签"
                maxLength={MAX_TAG_LENGTH}
                onChangeText={setTagInput}
                onSubmitEditing={handleAddTag}
                placeholder="比如「备用药」"
                returnKeyType="done"
                value={tagInput}
              />
            </View>
            <View style={styles.addTagButton}>
              <Button label="添加" onPress={handleAddTag} variant="secondary" />
            </View>
          </View>

          {tagError ? (
            <AppText color={colors.dangerText} variant="caption">
              {tagError}
            </AppText>
          ) : (
            <AppText variant="caption">
              已选 {tags.length}/{MAX_TAGS_PER_MEDICINE} 个
            </AppText>
          )}
        </View>

        {serverError ? (
          <AppText color={colors.dangerText} variant="caption">
            {serverError}
          </AppText>
        ) : null}

        <Button
          disabled={submitting}
          label={submitting ? '保存中…' : submitLabel}
          onPress={handlePress}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  unitField: { width: 96 },
  notes: { minHeight: 80, paddingTop: spacing.sm, textAlignVertical: 'top' },
  tagSection: { gap: spacing.sm },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  addTagButton: { justifyContent: 'flex-end', paddingBottom: spacing.xs },
});
