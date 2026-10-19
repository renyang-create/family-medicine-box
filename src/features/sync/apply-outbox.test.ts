import { describe, expect, it } from 'vitest';

import type { Medicine } from '@/features/medicines/types';

import {
  applyOutbox,
  applyOutboxToMedicine,
  applyOutboxToOverview,
  isPendingMedicineId,
} from './apply-outbox';
import type { OutboxOp } from './outbox';

const base: Medicine = {
  id: 'm1',
  boxId: 'b1',
  name: '布洛芬',
  spec: '0.3g',
  quantity: 10,
  unit: '片',
  dosage: null,
  storageLocation: null,
  batchNo: null,
  producedOn: null,
  expireDate: null,
  expiryStatus: 'normal',
  notes: null,
  lastTakenAt: null,
  tags: [],
};

function makeOp(patch: Partial<OutboxOp> & Pick<OutboxOp, 'kind' | 'boxId' | 'medicineId'>): OutboxOp {
  return {
    id: `op-${patch.kind}-${patch.medicineId}`,
    createdAt: '2026-10-19T00:00:00.000Z',
    attempts: 0,
    ...patch,
  };
}

describe('applyOutbox', () => {
  it('离线新增追加到列表末尾，并带上标签与过期状态', () => {
    const ops = [
      makeOp({
        kind: 'create',
        boxId: 'b1',
        medicineId: 'local-abc',
        input: { name: '泰诺', quantity: 6, expireDate: '2020-01-01', tags: ['发烧', ' 发烧 '] },
      }),
    ];

    const result = applyOutbox([base], ops);

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      id: 'local-abc',
      name: '泰诺',
      quantity: 6,
      expiryStatus: 'expired',
      tags: ['发烧'],
    });
  });

  it('离线修改覆盖服务端字段，但保留服药时间', () => {
    const ops = [
      makeOp({
        kind: 'update',
        boxId: 'b1',
        medicineId: 'm1',
        input: { name: '布洛芬缓释', quantity: 3, tags: ['疼痛'] },
      }),
    ];

    const result = applyOutbox([{ ...base, lastTakenAt: '2026-10-18T08:00:00.000Z' }], ops);

    expect(result[0]).toMatchObject({
      name: '布洛芬缓释',
      quantity: 3,
      tags: ['疼痛'],
      lastTakenAt: '2026-10-18T08:00:00.000Z',
    });
  });

  it('离线删除把记录从列表移除', () => {
    const ops = [makeOp({ kind: 'delete', boxId: 'b1', medicineId: 'm1' })];
    expect(applyOutbox([base], ops)).toHaveLength(0);
  });

  it('先建后改：同一条本地记录按顺序合并', () => {
    const ops = [
      makeOp({
        kind: 'create',
        boxId: 'b1',
        medicineId: 'local-abc',
        input: { name: '泰诺', quantity: 6 },
      }),
      makeOp({
        kind: 'update',
        boxId: 'b1',
        medicineId: 'local-abc',
        input: { name: '泰诺林', quantity: 4 },
      }),
    ];

    const result = applyOutbox([], ops);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'local-abc', name: '泰诺林', quantity: 4 });
  });

  it('只合并指定药箱的操作', () => {
    const ops = [
      makeOp({
        kind: 'create',
        boxId: 'b2',
        medicineId: 'local-other',
        input: { name: '别人的药', quantity: 1 },
      }),
    ];

    expect(applyOutbox([base], ops, 'b1')).toHaveLength(1);
  });

  it('不修改传入数组', () => {
    const input = [base];
    applyOutbox(input, [makeOp({ kind: 'delete', boxId: 'b1', medicineId: 'm1' })]);
    expect(input).toHaveLength(1);
  });
});

describe('applyOutboxToMedicine', () => {
  it('详情页只取这个 id 的操作', () => {
    const ops = [
      makeOp({ kind: 'update', boxId: 'b1', medicineId: 'm1', input: { name: '改名后', quantity: 1 } }),
      makeOp({ kind: 'update', boxId: 'b1', medicineId: 'm2', input: { name: '另一个', quantity: 2 } }),
    ];

    expect(applyOutboxToMedicine(base, ops, 'm1')?.name).toBe('改名后');
  });

  it('没有相关操作时原样返回', () => {
    expect(applyOutboxToMedicine(base, [], 'm1')).toBe(base);
  });

  it('本地新建的药品即使服务端没有也能查到', () => {
    const ops = [
      makeOp({
        kind: 'create',
        boxId: 'b1',
        medicineId: 'local-abc',
        input: { name: '泰诺', quantity: 6 },
      }),
    ];

    expect(applyOutboxToMedicine(undefined, ops, 'local-abc')?.name).toBe('泰诺');
  });
});

describe('applyOutboxToOverview', () => {
  const overview = [
    {
      id: 'm1',
      boxId: 'b1',
      boxName: '家庭药箱',
      name: '布洛芬',
      expireDate: null as string | null,
      tags: ['发烧'],
    },
  ];

  it('离线新增并入概览，箱名从本地药箱列表补', () => {
    const ops = [
      makeOp({
        kind: 'create',
        boxId: 'b1',
        medicineId: 'local-abc',
        input: { name: '泰诺', quantity: 6, tags: ['发烧', '头痛'] },
      }),
    ];

    const result = applyOutboxToOverview(overview, ops, { b1: '家庭药箱' });

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      id: 'local-abc',
      boxName: '家庭药箱',
      name: '泰诺',
      tags: ['发烧', '头痛'],
      expireDate: null,
    });
  });

  it('箱名拿不到时显示「待同步」', () => {
    const ops = [
      makeOp({
        kind: 'create',
        boxId: 'b9',
        medicineId: 'local-xyz',
        input: { name: '感冒灵', quantity: 1 },
      }),
    ];

    expect(applyOutboxToOverview(overview, ops, {})[1]?.boxName).toBe('待同步');
  });

  it('离线修改同步名称、标签与有效期', () => {
    const ops = [
      makeOp({
        kind: 'update',
        boxId: 'b1',
        medicineId: 'm1',
        input: { name: '布洛芬缓释', quantity: 3, expireDate: '2027-01-01', tags: ['疼痛'] },
      }),
    ];

    expect(applyOutboxToOverview(overview, ops)[0]).toMatchObject({
      name: '布洛芬缓释',
      expireDate: '2027-01-01',
      tags: ['疼痛'],
    });
  });

  it('离线删除从概览移除', () => {
    const ops = [makeOp({ kind: 'delete', boxId: 'b1', medicineId: 'm1' })];
    expect(applyOutboxToOverview(overview, ops)).toHaveLength(0);
  });
});

describe('isPendingMedicineId', () => {
  it('local- 前缀视为待同步', () => {
    expect(isPendingMedicineId('local-abc')).toBe(true);
    expect(isPendingMedicineId('2b0e4a5c-1111-2222-3333-444455556666')).toBe(false);
    expect(isPendingMedicineId(undefined)).toBe(false);
  });
});
