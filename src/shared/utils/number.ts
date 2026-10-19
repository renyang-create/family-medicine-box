/** 数量展示：整数不带小数，非整数最多两位并去掉多余的 0 */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
