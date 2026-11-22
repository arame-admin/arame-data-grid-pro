import { describe, it, expect } from 'vitest';
import { filterRows, sortRows, paginateRows } from '../src/core/data-engine.js';
import { computeVirtualSlice } from '../src/core/virtualizer.js';
import { ColumnDef } from '../src/types.js';

interface TestUser {
  id: number;
  name: string;
  age: number;
}

const mockUsers: TestUser[] = [
  { id: 1, name: 'Alice', age: 34 },
  { id: 2, name: 'Bob', age: 22 },
  { id: 3, name: 'Charlie', age: 45 }
];

const mockColumns: ColumnDef<TestUser>[] = [
  { id: 'name', header: 'Name', field: 'name' },
  { id: 'age', header: 'Age', field: 'age' }
];

describe('Data Engine Core', () => {
  it('correctly filters data using global search', () => {
    const res = filterRows(mockUsers, [], 'lic', mockColumns);
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe('Alice');
  });

  it('sorts numeric fields descending', () => {
    const res = sortRows(mockUsers, [{ columnId: 'age', direction: 'desc' }], mockColumns);
    expect(res[0].name).toBe('Charlie');
    expect(res[2].name).toBe('Bob');
  });

  it('paginates data within specified boundary bounds', () => {
    const { pagedRows, totalPages } = paginateRows(mockUsers, 0, 2);
    expect(pagedRows).toHaveLength(2);
    expect(totalPages).toBe(2);
  });

  it('calculates virtual viewport slices accurately', () => {
    const slice = computeVirtualSlice(100, 200, 1000, 50, 2);
    expect(slice.startIndex).toBe(0); // 100/50 = 2; 2 - overscan(2) = 0
    expect(slice.topOffset).toBe(0);
    expect(slice.totalHeight).toBe(50000);
  });
});
