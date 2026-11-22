import {
  FilterExpressionGroup,
  FilterRule,
  FilterOperator,
  RelativeDatePreset,
  CustomFilterOperator,
  AdvancedFilterColumn
} from './types.js';

export function isRuleGroup(item: FilterRule | FilterExpressionGroup): item is FilterExpressionGroup {
  return 'logic' in item && Array.isArray((item as FilterExpressionGroup).rules);
}

/**
 * Evaluates relative date range presets safely
 */
export function evaluateRelativeDate(preset: RelativeDatePreset, targetDate: Date): boolean {
  const now = new Date();
  const targetTime = targetDate.getTime();

  // Normalize midnight
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

  switch (preset) {
    case 'today':
      return targetTime >= todayStart && targetTime <= todayEnd;
    case 'yesterday': {
      const yesterdayStart = todayStart - 86400000;
      const yesterdayEnd = todayEnd - 86400000;
      return targetTime >= yesterdayStart && targetTime <= yesterdayEnd;
    }
    case 'last7Days': {
      const sevenDaysAgo = todayStart - (7 * 86400000);
      return targetTime >= sevenDaysAgo && targetTime <= todayEnd;
    }
    case 'last30Days': {
      const thirtyDaysAgo = todayStart - (30 * 86400000);
      return targetTime >= thirtyDaysAgo && targetTime <= todayEnd;
    }
    case 'thisMonth': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return targetTime >= monthStart && targetTime <= monthEnd;
    }
    case 'lastMonth': {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
      return targetTime >= lastMonthStart && targetTime <= lastMonthEnd;
    }
    case 'thisYear': {
      const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
      return targetTime >= yearStart && targetTime <= yearEnd;
    }
    default:
      return true;
  }
}

/**
 * Evaluates a single rule without eval or Function.
 */
export function evaluateRule<T = Record<string, unknown>>(
  row: T,
  rule: FilterRule,
  customOperators?: CustomFilterOperator<T>[]
): boolean {
  const rawVal = (row as any)[rule.field];

  // Custom operator support
  if (rule.operator === 'custom' && rule.customOperatorName && customOperators) {
    const customOp = customOperators.find(o => o.name === rule.customOperatorName);
    if (customOp) {
      return customOp.predicate(rawVal, rule.value, row);
    }
  }

  const { operator, value } = rule;

  switch (operator) {
    case 'equals':
      return String(rawVal).toLowerCase() === String(value).toLowerCase();

    case 'notEquals':
      return String(rawVal).toLowerCase() !== String(value).toLowerCase();

    case 'contains':
      if (rawVal === null || rawVal === undefined) return false;
      return String(rawVal).toLowerCase().includes(String(value).toLowerCase().trim());

    case 'notContains':
      if (rawVal === null || rawVal === undefined) return true;
      return !String(rawVal).toLowerCase().includes(String(value).toLowerCase().trim());

    case 'startsWith':
      return String(rawVal).toLowerCase().startsWith(String(value).toLowerCase().trim());

    case 'endsWith':
      return String(rawVal).toLowerCase().endsWith(String(value).toLowerCase().trim());

    case 'greaterThan': {
      const n1 = Number(rawVal);
      const n2 = Number(value);
      if (isNaN(n1) || isNaN(n2)) return false;
      return n1 > n2;
    }

    case 'greaterThanOrEqual': {
      const n1 = Number(rawVal);
      const n2 = Number(value);
      if (isNaN(n1) || isNaN(n2)) return false;
      return n1 >= n2;
    }

    case 'lessThan': {
      const n1 = Number(rawVal);
      const n2 = Number(value);
      if (isNaN(n1) || isNaN(n2)) return false;
      return n1 < n2;
    }

    case 'lessThanOrEqual': {
      const n1 = Number(rawVal);
      const n2 = Number(value);
      if (isNaN(n1) || isNaN(n2)) return false;
      return n1 <= n2;
    }

    case 'between': {
      const n = Number(rawVal);
      if (isNaN(n)) return false;
      const min = Number((value as { min?: unknown })?.min);
      const max = Number((value as { max?: unknown })?.max);
      if (!isNaN(min) && n < min) return false;
      if (!isNaN(max) && n > max) return false;
      return true;
    }

    case 'in': {
      const list = Array.isArray(value) ? value : [value];
      return list.some(item => String(item).toLowerCase() === String(rawVal).toLowerCase());
    }

    case 'notIn': {
      const list = Array.isArray(value) ? value : [value];
      return !list.some(item => String(item).toLowerCase() === String(rawVal).toLowerCase());
    }

    // Date rules
    case 'dateBefore': {
      if (!rawVal || !value) return false;
      const d1 = new Date(rawVal).getTime();
      const d2 = new Date(value as string | number | Date).getTime();
      return !isNaN(d1) && !isNaN(d2) && d1 < d2;
    }

    case 'dateAfter': {
      if (!rawVal || !value) return false;
      const d1 = new Date(rawVal).getTime();
      const d2 = new Date(value as string | number | Date).getTime();
      return !isNaN(d1) && !isNaN(d2) && d1 > d2;
    }

    case 'dateOn': {
      if (!rawVal || !value) return false;
      const d1 = new Date(rawVal);
      const d2 = new Date(value as string | number | Date);
      return d1.toISOString().split('T')[0] === d2.toISOString().split('T')[0];
    }

    case 'dateBetween': {
      if (!rawVal || !value) return false;
      const d = new Date(rawVal).getTime();
      if (isNaN(d)) return false;
      const vRange = value as { start?: string | number | Date; end?: string | number | Date };
      if (vRange?.start) {
        const start = new Date(vRange.start).getTime();
        if (d < start) return false;
      }
      if (vRange?.end) {
        const end = new Date(vRange.end).setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    }

    case 'dateRelative': {
      if (!rawVal || !value) return false;
      const d = new Date(rawVal);
      if (isNaN(d.getTime())) return false;
      return evaluateRelativeDate(value as RelativeDatePreset, d);
    }

    default:
      return true;
  }
}

/**
 * Evaluates an entire expression tree (AND / OR groupings) on a single row.
 */
export function evaluateExpressionGroup<T = Record<string, unknown>>(
  row: T,
  group: FilterExpressionGroup,
  customOperators?: CustomFilterOperator<T>[]
): boolean {
  if (!group || !group.rules || group.rules.length === 0) {
    return true;
  }

  if (group.logic === 'AND') {
    return group.rules.every(ruleOrGroup => {
      if (isRuleGroup(ruleOrGroup)) {
        return evaluateExpressionGroup(row, ruleOrGroup, customOperators);
      }
      return evaluateRule(row, ruleOrGroup, customOperators);
    });
  } else {
    // OR
    return group.rules.some(ruleOrGroup => {
      if (isRuleGroup(ruleOrGroup)) {
        return evaluateExpressionGroup(row, ruleOrGroup, customOperators);
      }
      return evaluateRule(row, ruleOrGroup, customOperators);
    });
  }
}

/**
 * Flattens all active rules in an expression tree to extract UI chips.
 */
export function extractActiveRules(group: FilterExpressionGroup): FilterRule[] {
  const result: FilterRule[] = [];
  if (!group || !group.rules) return result;

  for (const item of group.rules) {
    if (isRuleGroup(item)) {
      result.push(...extractActiveRules(item));
    } else {
      result.push(item);
    }
  }
  return result;
}

/**
 * Safely serializes expression to a URL-compatible or server query string format
 */
export function serializeExpression(group: FilterExpressionGroup): string {
  try {
    return JSON.stringify(group);
  } catch {
    return '';
  }
}

/**
 * Creates human-friendly chip label for a rule
 */
export function formatRuleChipLabel(rule: FilterRule, columns: AdvancedFilterColumn[]): string {
  const col = columns.find(c => String(c.key) === rule.field);
  const header = col ? col.header : rule.field;

  const opLabels: Record<string, string> = {
    equals: '=',
    notEquals: '≠',
    contains: 'contains',
    notContains: 'not contains',
    startsWith: 'starts with',
    endsWith: 'ends with',
    greaterThan: '>',
    greaterThanOrEqual: '≥',
    lessThan: '<',
    lessThanOrEqual: '≤',
    between: 'between',
    in: 'in',
    notIn: 'not in',
    dateBefore: 'before',
    dateAfter: 'after',
    dateOn: 'on',
    dateBetween: 'between',
    dateRelative: 'is'
  };

  const opText = opLabels[rule.operator] || rule.operator;
  let valText = String(rule.value);
  if (typeof rule.value === 'object' && rule.value !== null) {
    const rVal = rule.value as { min?: unknown; max?: unknown; start?: unknown; end?: unknown };
    if (rVal && (rVal.min !== undefined || rVal.max !== undefined)) {
      valText = `${rVal.min ?? 0} .. ${rVal.max ?? '∞'}`;
    } else if (rVal && (rVal.start || rVal.end)) {
      valText = `${rVal.start ?? ''} .. ${rVal.end ?? ''}`;
    } else {
      valText = JSON.stringify(rule.value);
    }
  }

  return `${header} ${opText} ${valText}`;
}
