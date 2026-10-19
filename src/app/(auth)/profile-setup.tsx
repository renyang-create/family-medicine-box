import { Screen, EmptyState } from '@/shared/ui';

/** 首登完善昵称（T3 实现）。 */
export default function ProfileSetupScreen() {
  return (
    <Screen>
      <EmptyState title="完善资料" description="T3 实现：设置昵称后进入药箱列表。" />
    </Screen>
  );
}
