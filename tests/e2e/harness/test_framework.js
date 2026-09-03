/**
 * SIMCOP E2E Test Framework Harness
 * Self-contained testing framework providing describe, it, expect, mocks, and lifecycle hooks.
 */

export class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

class Expectation {
  constructor(actual, isNot = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  get not() {
    return new Expectation(this.actual, !this.isNot);
  }

  _evaluate(condition, message, expected) {
    const passed = this.isNot ? !condition : condition;
    if (!passed) {
      throw new AssertionError(
        message || `Assertion failed: expected ${JSON.stringify(this.actual)} ${this.isNot ? 'NOT ' : ''}to match ${JSON.stringify(expected)}`,
        this.actual,
        expected
      );
    }
  }

  toBe(expected) {
    this._evaluate(this.actual === expected, `Expected ${this.actual} to be ${expected}`, expected);
  }

  toEqual(expected) {
    const actualStr = JSON.stringify(this.actual);
    const expectedStr = JSON.stringify(expected);
    this._evaluate(actualStr === expectedStr, `Expected deep equality:\nActual:   ${actualStr}\nExpected: ${expectedStr}`, expected);
  }

  toBeTruthy() {
    this._evaluate(Boolean(this.actual), `Expected truthy value, got ${this.actual}`);
  }

  toBeFalsy() {
    this._evaluate(!this.actual, `Expected falsy value, got ${this.actual}`);
  }

  toBeNull() {
    this._evaluate(this.actual === null, `Expected null, got ${this.actual}`);
  }

  toBeDefined() {
    this._evaluate(this.actual !== undefined, `Expected defined, got undefined`);
  }

  toBeUndefined() {
    this._evaluate(this.actual === undefined, `Expected undefined, got ${this.actual}`);
  }

  toContain(item) {
    if (typeof this.actual === 'string' || Array.isArray(this.actual)) {
      this._evaluate(this.actual.includes(item), `Expected ${JSON.stringify(this.actual)} to contain ${JSON.stringify(item)}`, item);
    } else if (this.actual instanceof Set || this.actual instanceof Map) {
      this._evaluate(this.actual.has(item), `Expected collection to contain ${item}`, item);
    } else if (typeof this.actual === 'object' && this.actual !== null) {
      this._evaluate(item in this.actual, `Expected object to have key ${item}`, item);
    } else {
      throw new AssertionError(`Cannot call toContain on type ${typeof this.actual}`, this.actual, item);
    }
  }

  toMatch(regex) {
    const pattern = typeof regex === 'string' ? new RegExp(regex) : regex;
    this._evaluate(pattern.test(String(this.actual)), `Expected "${this.actual}" to match pattern ${pattern}`, regex);
  }

  toBeGreaterThan(expected) {
    this._evaluate(this.actual > expected, `Expected ${this.actual} > ${expected}`, expected);
  }

  toBeGreaterThanOrEqual(expected) {
    this._evaluate(this.actual >= expected, `Expected ${this.actual} >= ${expected}`, expected);
  }

  toBeLessThan(expected) {
    this._evaluate(this.actual < expected, `Expected ${this.actual} < ${expected}`, expected);
  }

  toBeLessThanOrEqual(expected) {
    this._evaluate(this.actual <= expected, `Expected ${this.actual} <= ${expected}`, expected);
  }

  toBeCloseTo(expected, precision = 2) {
    const diff = Math.abs(this.actual - expected);
    const threshold = Math.pow(10, -precision) / 2;
    this._evaluate(diff < threshold, `Expected ${this.actual} to be close to ${expected} (diff: ${diff}, tolerance: ${threshold})`, expected);
  }

  toThrow(expectedError) {
    let thrown = false;
    let errorObj = null;
    if (typeof this.actual !== 'function') {
      throw new AssertionError('toThrow requires a function');
    }
    try {
      this.actual();
    } catch (e) {
      thrown = true;
      errorObj = e;
    }

    if (expectedError) {
      if (typeof expectedError === 'string') {
        this._evaluate(thrown && errorObj.message.includes(expectedError), `Expected function to throw error containing "${expectedError}", but got: ${errorObj?.message}`);
      } else if (expectedError instanceof RegExp) {
        this._evaluate(thrown && expectedError.test(errorObj?.message || ''), `Expected error matching ${expectedError}`);
      } else if (typeof expectedError === 'function') {
        this._evaluate(thrown && errorObj instanceof expectedError, `Expected error of type ${expectedError.name}`);
      }
    } else {
      this._evaluate(thrown, 'Expected function to throw an error');
    }
  }

  toHaveLength(expected) {
    const length = this.actual ? this.actual.length : undefined;
    this._evaluate(length === expected, `Expected length ${expected}, got ${length}`, expected);
  }

  toHaveProperty(prop, value) {
    const hasProp = this.actual && Object.prototype.hasOwnProperty.call(this.actual, prop);
    if (value !== undefined) {
      this._evaluate(hasProp && this.actual[prop] === value, `Expected property ${prop}=${value}, got ${this.actual?.[prop]}`);
    } else {
      this._evaluate(hasProp, `Expected object to have property "${prop}"`);
    }
  }
}

export function expect(actual) {
  return new Expectation(actual);
}

// Global test registry for suite execution
class TestSuiteRegistry {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
  }

  describe(name, fn) {
    const suite = {
      name,
      tests: [],
      beforeEachFns: [],
      afterEachFns: [],
      beforeAllFns: [],
      afterAllFns: [],
      parent: this.currentSuite
    };
    this.suites.push(suite);
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    try {
      fn();
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  it(name, fn) {
    if (!this.currentSuite) {
      this.describe('Root Suite', () => {});
    }
    this.currentSuite.tests.push({
      name,
      fn,
      suiteName: this.currentSuite.name
    });
  }

  beforeEach(fn) {
    if (this.currentSuite) this.currentSuite.beforeEachFns.push(fn);
  }

  afterEach(fn) {
    if (this.currentSuite) this.currentSuite.afterEachFns.push(fn);
  }

  beforeAll(fn) {
    if (this.currentSuite) this.currentSuite.beforeAllFns.push(fn);
  }

  afterAll(fn) {
    if (this.currentSuite) this.currentSuite.afterAllFns.push(fn);
  }

  clear() {
    this.suites = [];
    this.currentSuite = null;
  }
}

export const registry = new TestSuiteRegistry();
export const describe = registry.describe.bind(registry);
export const it = registry.it.bind(registry);
export const test = it;
export const beforeEach = registry.beforeEach.bind(registry);
export const afterEach = registry.afterEach.bind(registry);
export const beforeAll = registry.beforeAll.bind(registry);
export const afterAll = registry.afterAll.bind(registry);
