import { describe, expect, it } from 'vitest';

import { MAX_TAGS_PER_MEDICINE, MAX_TAG_LENGTH } from '@/shared/constants/tags';

import {
  collectTagCounts,
  collectTags,
  filterByTags,
  hasTag,
  matchesTags,
  normalizeTag,
  sanitizeTags,
  toggleTag,
} from './tags';

describe('normalizeTag', () => {
  it('去掉首尾空白并把内部连续空白压成一个空格', () => {
    expect(normalizeTag('  肠胃   不适 ')).toBe('肠胃 不适');
  });

  it('空字符串归一化后为空', () => {
    expect(normalizeTag('   ')).toBe('');
  });

  it('超长标签会被截断', () => {
    expect(normalizeTag('一二三四五六七八九十十一')).toHaveLength(MAX_TAG_LENGTH);
  });
});

describe('sanitizeTags', () => {
  it('去空、去重（忽略大小写）、保持顺序', () => {
    expect(sanitizeTags([' 发烧 ', 'Abc', '', 'abc', '发烧'])).toEqual(['发烧', 'Abc']);
  });

  it('超过上限时只保留前 6 个', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(sanitizeTags(input)).toHaveLength(MAX_TAGS_PER_MEDICINE);
  });

  it('null / undefined 返回空数组', () => {
    expect(sanitizeTags(null)).toEqual([]);
    expect(sanitizeTags(undefined)).toEqual([]);
  });
});

describe('toggleTag', () => {
  it('没有则加上', () => {
    expect(toggleTag(['发烧'], '咳嗽')).toEqual(['发烧', '咳嗽']);
  });

  it('已有则移除', () => {
    expect(toggleTag(['发烧', '咳嗽'], '发烧')).toEqual(['咳嗽']);
  });

  it('达到上限后不再新增，返回原样', () => {
    const tags = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(toggleTag(tags, 'g')).toEqual(tags);
  });

  it('空白标签不会进入列表', () => {
    expect(toggleTag(['发烧'], '   ')).toEqual(['发烧']);
  });
});

describe('hasTag / matchesTags', () => {
  it('大小写不敏感', () => {
    expect(hasTag(['Fever'], 'fever')).toBe(true);
  });

  it('空选相当于不过滤', () => {
    expect(matchesTags([], [])).toBe(true);
    expect(matchesTags(['发烧'], [])).toBe(true);
  });

  it('多选是「任一命中」', () => {
    expect(matchesTags(['发烧'], ['咳嗽', '发烧'])).toBe(true);
    expect(matchesTags(['头痛'], ['咳嗽', '发烧'])).toBe(false);
  });
});

describe('collectTags', () => {
  it('按出现次数倒序，次数相同按名称排序', () => {
    expect(
      collectTags([{ tags: ['发烧', '咳嗽'] }, { tags: ['发烧'] }, { tags: ['头痛'] }]),
    ).toEqual(['发烧', '咳嗽', '头痛']);
  });

  it('忽略重复与空标签', () => {
    expect(collectTags([{ tags: ['发烧', '发烧', ' '] }])).toEqual(['发烧']);
  });
});

describe('collectTagCounts', () => {
  it('统计每个标签被几个药品使用，并按次数倒序', () => {
    expect(
      collectTagCounts([
        { tags: ['发烧', '咳嗽'] },
        { tags: ['发烧'] },
        { tags: ['头痛'] },
      ]),
    ).toEqual([
      { tag: '发烧', count: 2 },
      { tag: '咳嗽', count: 1 },
      { tag: '头痛', count: 1 },
    ]);
  });

  it('空列表返回空数组', () => {
    expect(collectTagCounts([])).toEqual([]);
  });
});

describe('filterByTags', () => {
  const items = [
    { id: 1, tags: ['发烧'] },
    { id: 2, tags: ['咳嗽', '咽痛'] },
    { id: 3, tags: [] },
  ];

  it('不选标签时返回全部（新数组）', () => {
    const result = filterByTags(items, []);
    expect(result).toHaveLength(3);
    expect(result).not.toBe(items);
  });

  it('单选只留命中的', () => {
    expect(filterByTags(items, ['咳嗽']).map((item) => item.id)).toEqual([2]);
  });

  it('多选取并集', () => {
    expect(filterByTags(items, ['发烧', '咽痛']).map((item) => item.id)).toEqual([1, 2]);
  });
});
