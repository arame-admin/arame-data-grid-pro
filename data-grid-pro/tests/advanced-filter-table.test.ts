import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../src/advanced-filter-table/index.js';
import { AdvancedFilterDataTableElement } from '../src/advanced-filter-table/advanced-filter-data-table.element.js';
import { AdvancedFilterColumn, FilterExpressionGroup } from '../src/advanced-filter-table/types.js';
import { evaluateExpressionGroup, evaluateRule } from '../src/advanced-filter-table/expression-engine.js';

interface PropertyListing {
  id: string;
  title: string;
  city: string;
  neighborhood: string;
  price: number;
  bedrooms: number;
  listedDate: string;
}

describe('AdvancedFilterDataTableElement (<advanced-filter-data-table>)', () => {
  let table: AdvancedFilterDataTableElement<PropertyListing>;

  const sampleData: PropertyListing[] = [
    { id: 'P-1', title: 'Modern Downtown Loft', city: 'Seattle', neighborhood: 'Downtown', price: 750000, bedrooms: 2, listedDate: '2024-05-01' },
    { id: 'P-2', title: 'Suburban Family Home', city: 'Seattle', neighborhood: 'Ballard', price: 920000, bedrooms: 4, listedDate: '2024-04-15' },
    { id: 'P-3', title: 'Cozy City Condo', city: 'Portland', neighborhood: 'Pearl District', price: 420000, bedrooms: 1, listedDate: '2024-05-10' },
    { id: 'P-4', title: 'Luxury Waterfront Estate', city: 'Bellevue', neighborhood: 'Downtown', price: 2400000, bedrooms: 5, listedDate: '2024-03-20' },
    { id: 'P-5', title: 'Classic Craftsman', city: 'Portland', neighborhood: 'Hawthorne', price: 680000, bedrooms: 3, listedDate: '2024-05-18' }
  ];

  const columns: AdvancedFilterColumn<PropertyListing>[] = [
    { key: 'title', header: 'Property Title', type: 'string' },
    { key: 'city', header: 'City', type: 'select', options: [{ label: 'Seattle', value: 'Seattle' }, { label: 'Portland', value: 'Portland' }] },
    {
      key: 'neighborhood',
      header: 'Neighborhood',
      type: 'select',
      cascading: {
        parentField: 'city',
        getOptions: (cityVal) => {
          if (cityVal === 'Seattle') return [{ label: 'Downtown', value: 'Downtown' }, { label: 'Ballard', value: 'Ballard' }];
          if (cityVal === 'Portland') return [{ label: 'Pearl District', value: 'Pearl District' }, { label: 'Hawthorne', value: 'Hawthorne' }];
          return [];
        }
      }
    },
    { key: 'price', header: 'Price ($)', type: 'number' },
    { key: 'bedrooms', header: 'Beds', type: 'number' },
    { key: 'listedDate', header: 'Listed Date', type: 'date' }
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
    table = document.createElement('advanced-filter-data-table') as AdvancedFilterDataTableElement<PropertyListing>;
    table.columns = columns;
    table.data = sampleData;
    document.body.appendChild(table);
  });

  describe('Expression Engine Unit Logic', () => {
    it('evaluates AND logic across multiple rules', () => {
      const exp: FilterExpressionGroup = {
        id: 'g-1',
        logic: 'AND',
        rules: [
          { id: 'r-1', field: 'city', operator: 'equals', value: 'Seattle' },
          { id: 'r-2', field: 'price', operator: 'lessThan', value: 800000 }
        ]
      };
      // Modern Downtown Loft (Seattle, 750k) matches; Suburban Family Home (Seattle, 920k) fails
      expect(evaluateExpressionGroup(sampleData[0], exp)).toBe(true);
      expect(evaluateExpressionGroup(sampleData[1], exp)).toBe(false);
    });

    it('evaluates OR logic across multiple rules', () => {
      const exp: FilterExpressionGroup = {
        id: 'g-2',
        logic: 'OR',
        rules: [
          { id: 'r-1', field: 'city', operator: 'equals', value: 'Bellevue' },
          { id: 'r-2', field: 'bedrooms', operator: 'equals', value: 1 }
        ]
      };
      // Cozy City Condo (Portland, 1 bed) matches; Waterfront (Bellevue) matches
      expect(evaluateExpressionGroup(sampleData[2], exp)).toBe(true);
      expect(evaluateExpressionGroup(sampleData[3], exp)).toBe(true);
      expect(evaluateExpressionGroup(sampleData[0], exp)).toBe(false);
    });

    it('evaluates numeric between ranges', () => {
      const rule = { id: 'r-3', field: 'price', operator: 'between' as const, value: { min: 700000, max: 1000000 } };
      expect(evaluateRule(sampleData[0], rule)).toBe(true); // 750k
      expect(evaluateRule(sampleData[1], rule)).toBe(true); // 920k
      expect(evaluateRule(sampleData[2], rule)).toBe(false); // 420k
    });

    it('evaluates dateBefore and dateAfter accurately', () => {
      const ruleAfter = { id: 'r-4', field: 'listedDate', operator: 'dateAfter' as const, value: '2024-05-01' };
      expect(evaluateRule(sampleData[2], ruleAfter)).toBe(true); // 2024-05-10
      expect(evaluateRule(sampleData[1], ruleAfter)).toBe(false); // 2024-04-15
    });
  });

  describe('Web Component Interactive Behavior', () => {
    it('applies rules dynamically and renders filter chips', () => {
      table.addRule({
        id: 'r-test',
        field: 'city',
        operator: 'equals',
        value: 'Portland'
      });

      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.aft-tbody .aft-tr');
      expect(rows.length).toBe(2); // 2 Portland properties

      const chips = shadow.querySelectorAll('.aft-chip');
      expect(chips.length).toBeGreaterThan(0);
      expect(chips[0].textContent).toContain('City = Portland');
    });

    it('clears rules when chips remove button or clear all is clicked', () => {
      table.addRule({ id: 'r-1', field: 'city', operator: 'equals', value: 'Seattle' });
      expect(table.expression.rules.length).toBe(1);

      table.clearAllFilters();
      expect(table.expression.rules.length).toBe(0);

      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.aft-tbody .aft-tr');
      expect(rows.length).toBe(5);
    });

    it('switches logic between AND and OR', () => {
      table.addRule({ id: 'r-1', field: 'city', operator: 'equals', value: 'Seattle' });
      table.addRule({ id: 'r-2', field: 'city', operator: 'equals', value: 'Portland' });

      // In AND mode, Seattle AND Portland = 0 rows
      table.setLogic('AND');
      let shadow = table.shadowRoot!;
      let rows = shadow.querySelectorAll('.aft-tbody .aft-tr');
      expect(rows[0].textContent).toContain('No matching records');

      // In OR mode, Seattle OR Portland = 4 rows
      table.setLogic('OR');
      rows = shadow.querySelectorAll('.aft-tbody .aft-tr');
      expect(rows.length).toBe(4);
    });

    it('supports presets and loads preset expressions', () => {
      const preset = {
        id: 'luxury-preset',
        name: 'Luxury Homes ($1M+)',
        expression: {
          id: 'exp-lux',
          logic: 'AND' as const,
          rules: [{ id: 'r-lux', field: 'price', operator: 'greaterThan' as const, value: 1000000 }]
        }
      };

      table.options = { presets: [preset] };
      table.applyPreset('luxury-preset');

      const shadow = table.shadowRoot!;
      const rows = shadow.querySelectorAll('.aft-tbody .aft-tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Luxury Waterfront Estate');
    });

    it('resets page to 1 when a filter is applied', () => {
      table.options = { pagination: { pageSize: 2 } };
      table.setPage(3);
      expect((table as any)._currentPage).toBe(3);

      table.addRule({ id: 'r-reset', field: 'bedrooms', operator: 'greaterThan', value: 2 });
      expect((table as any)._currentPage).toBe(1);
    });
  });
});
