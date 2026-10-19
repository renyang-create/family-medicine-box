/** 本地临时 id 前缀：`local-xxxx`，服务端不认，重放时换成正真的 uuid */
export const LOCAL_ID_PREFIX = 'local-';

export function isLocalMedicineId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

export function createLocalMedicineId(): string {
  return `${LOCAL_ID_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
