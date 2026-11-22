import { describe, it, expect } from 'vitest';
import { resolveValue } from '../src/core/data-engine.js';
import { resolveValue as resolveValueBase } from '../src/common/base-table-controller.js';
import { escapeCsvValue, generateCsvString } from '../src/common/universal-exporter.js';
import { exportTreeToCsv } from '../src/tree-table/tree-engine.js';

describe('QA Security & Vulnerability Test Suite', () => {
  it('prevents prototype pollution via resolveValue across data-engine and base-table', () => {
    const maliciousObj = { data: 'test' };

    expect(resolveValue(maliciousObj, '__proto__.polluted')).toBeUndefined();
    expect(resolveValue(maliciousObj, 'constructor.prototype.polluted')).toBeUndefined();
    expect(resolveValue(maliciousObj, 'prototype.polluted')).toBeUndefined();

    expect(resolveValueBase(maliciousObj, '__proto__.polluted')).toBeUndefined();
    expect(resolveValueBase(maliciousObj, 'constructor.prototype.polluted')).toBeUndefined();
    expect(resolveValueBase(maliciousObj, 'prototype.polluted')).toBeUndefined();

    expect((Object.prototype as any).polluted).toBeUndefined();
  });

  it('escapes and prefixes formula characters in universal CSV exporter (CWE-1236)', () => {
    expect(escapeCsvValue('=1+1')).toBe(`"'=1+1"`);
    expect(escapeCsvValue('+cmd|/c calc')).toBe(`"'+cmd|/c calc"`);
    expect(escapeCsvValue('-50')).toBe(`"'-50"`);
    expect(escapeCsvValue('@SUM(A1:A10)')).toBe(`"'@SUM(A1:A10)"`);
    expect(escapeCsvValue('\tTAB')).toBe(`"'\tTAB"`);
  });

  it('sanitizes tree CSV exporter against formula injection', () => {
    const mockTreeNodes: any[] = [
      {
        data: { name: '=cmd|/c calc', role: 'Admin' },
        meta: { level: 0, parentPath: ['Root'] }
      }
    ];
    const columns: any[] = [
      { key: 'name', header: 'Node Name' },
      { key: 'role', header: 'Role' }
    ];

    const csv = exportTreeToCsv(mockTreeNodes, columns);
    expect(csv).toContain(`"'=cmd|/c calc"`);
  });
});
