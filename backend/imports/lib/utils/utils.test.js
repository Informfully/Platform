/* eslint-disable no-undef */
import chai from 'chai';
import {
    classNames, is, shallowEqualOnlyPrimitives,
} from './utils';

describe('utils', () => {
    describe('className', () => {
        it('returns string when called with a string', () => {
            const testInput = 'classes';
            const expected = 'classes';
            const actual = classNames(testInput);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('returns empty string when called with empty object', () => {
            const testObject = {};
            const expected = '';
            const actual = classNames(testObject);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('returns empty string when called with empty array', () => {
            const testArray = [];
            const expected = '';
            const actual = classNames(testArray);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('joins arrays of class names and ignores falsy values', () => {
            const testArray = [ 'a', 0, null, undefined, true, 1, 'b' ];
            const expected = 'a 1 b';
            const actual = classNames(testArray);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('supports heterogenous arguments', () => {
            const testArray = [{ a: true }, 'b', 0 ];
            const expected = 'a b';
            const actual = classNames(testArray);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('ignores empty values', () => {
            const testArray = [ '', 'b', {}, '' ];
            const expected = 'b';
            const actual = classNames(testArray);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('joins array arguments with string arguments', () => {
            const testArray = [[ 'a', 'b' ], 'c' ];
            const expected = 'a b c';
            const actual = classNames(testArray);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('handles multiple array arguments', () => {
            const testArray = [[ 'a', 'b' ], [ 'c', 'd' ]];
            const expected = 'a b c d';
            const actual = classNames(testArray);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });


        it('handles arrays that include falsy and true values', () => {
            const testArray = [ 'a', 0, null, undefined, false, true, 'b' ];
            const expected = 'a b';
            const actual = classNames(testArray);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('handles arrays that include arrays', () => {
            const testArray = [ 'a', [ 'b', 'c' ]];
            const expected = 'a b c';
            const actual = classNames(testArray);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('ignores arrays that are empty', () => {
            const testArray = [ 'a', []];
            const expected = 'a';
            const actual = classNames(testArray);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('returns empty string when called with empty string', () => {
            const testString = '';
            const expected = '';
            const actual = classNames(testString);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('returns a joined string with all entries from a simple array', () => {
            const testArray = [ 'one', 'two', 'three' ];
            const expected = 'one two three';
            const actual = classNames(testArray);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('keeps object keys with truthy values', () => {
            const testObject = {
                a: true,
                b: false,
                c: 0,
                d: null,
                e: undefined,
                f: 1,
            };
            const expected = 'a f';
            const actual = classNames(testObject);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });
    });

    describe('is', () => {
        it('returns true given given two equal integers', () => {
            const testA = 1;
            const testB = 1;
            const expected = true;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given given two zeros', () => {
            const testA = 0;
            const testB = 0;
            const expected = true;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns false given given two different integers', () => {
            const testA = 1;
            const testB = 2;
            const expected = false;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given given two equal floats', () => {
            const testA = 1.123;
            const testB = 1.123;
            const expected = true;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given given two zero floats', () => {
            const testA = 0.0;
            const testB = 0.0;
            const expected = true;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given given two infinity', () => {
            const testA = Infinity;
            const testB = Infinity;
            const expected = true;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given given two NaN', () => {
            const testA = NaN;
            const testB = NaN;
            const expected = true;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns false given given two different floats', () => {
            const testA = 1.443424;
            const testB = 2.12323;
            const expected = false;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns false given given two different numbers with one being zero', () => {
            const testA = 1;
            const testB = 0;
            const expected = false;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given given two equal strings', () => {
            const testA = 'ok';
            const testB = 'ok';
            const expected = true;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given given two empty strings', () => {
            const testA = '';
            const testB = '';
            const expected = true;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns false given given two different string', () => {
            const testA = 'ok';
            const testB = 'nok';
            const expected = false;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given given two equal booleans', () => {
            const testA = false;
            const testB = false;
            const expected = true;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns false given given two different booleans', () => {
            const testA = true;
            const testB = false;
            const expected = false;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns false given given two empty objects', () => {
            const testA = {};
            const testB = {};
            const expected = false;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns false given given two identical objects', () => {
            const testA = { a: 1 };
            const testB = { a: 1 };
            const expected = false;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns false given given two empty arrays', () => {
            const testA = [];
            const testB = [];
            const expected = false;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns false given given two identical arrays', () => {
            const testA = [ 1, 2, 3 ];
            const testB = [ 1, 2, 3 ];
            const expected = false;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given given two nulls', () => {
            const testA = null;
            const testB = null;
            const expected = true;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given given two undefined', () => {
            const testA = undefined;
            const testB = undefined;
            const expected = true;
            const actual = is(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
    });

    describe('shallowEqualOnlyPrimitives', () => {
        it('returns true given two objects with identical simple fields', () => {
            const testA = {
                a: 1,
                b: 'abc',
                c: null,
                d: undefined,
                e: Infinity,
                f: true,
                g: 1.43838,
            };
            const testB = {
                a: 1,
                b: 'abc',
                c: null,
                d: undefined,
                e: Infinity,
                f: true,
                g: 1.43838,
            };
            const expected = true;
            const actual = shallowEqualOnlyPrimitives(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given two objects with identical simple fields and identical object or array fields', () => {
            const testA = {
                a: 1,
                b: 'abc',
                c: null,
                d: undefined,
                e: Infinity,
                f: true,
                g: 1.43838,
                h: [ 1, 2, 3 ],
                i: { a: 1, b: '2' },
            };
            const testB = {
                a: 1,
                b: 'abc',
                c: null,
                d: undefined,
                e: Infinity,
                f: true,
                g: 1.43838,
                h: [ 1, 2, 3 ],
                i: { a: 1, b: '2' },
            };
            const expected = true;
            const actual = shallowEqualOnlyPrimitives(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given two objects with identical simple fields and different object or array fields', () => {
            const testA = {
                a: 1,
                b: 'abc',
                c: null,
                d: undefined,
                e: Infinity,
                f: true,
                g: 1.43838,
                h: [ 1, 2, 3 ],
                i: { a: 1, b: '2' },
            };
            const testB = {
                a: 1,
                b: 'abc',
                c: null,
                d: undefined,
                e: Infinity,
                f: true,
                g: 1.43838,
                h: [ 45, 1, 2 ],
                i: { a: 10, b: '20' },
            };
            const expected = true;
            const actual = shallowEqualOnlyPrimitives(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given two objects with identical simple fields and identical function fields', () => {
            const func = i => i * 5;
            const testA = {
                a: 1,
                b: 'abc',
                c: null,
                d: undefined,
                e: Infinity,
                f: true,
                g: 1.43838,
                h: [ 1, 2, 3 ],
                i: { a: 1, b: '2' },
                j: func,
            };
            const testB = {
                a: 1,
                b: 'abc',
                c: null,
                d: undefined,
                e: Infinity,
                f: true,
                g: 1.43838,
                h: [ 45, 1, 2 ],
                i: { a: 10, b: '20' },
                j: func,
            };
            const expected = true;
            const actual = shallowEqualOnlyPrimitives(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
        it('returns true given two objects with identical simple fields and different function fields', () => {
            const testA = {
                a: 1,
                b: 'abc',
                c: null,
                d: undefined,
                e: Infinity,
                f: true,
                g: 1.43838,
                h: [ 1, 2, 3 ],
                i: { a: 1, b: '2' },
                j: i => 5 * i,
            };
            const testB = {
                a: 1,
                b: 'abc',
                c: null,
                d: undefined,
                e: Infinity,
                f: true,
                g: 1.43838,
                h: [ 45, 1, 2 ],
                i: { a: 10, b: '20' },
                j: i => i / 10,
            };
            const expected = true;
            const actual = shallowEqualOnlyPrimitives(testA, testB);

            chai.assert.typeOf(actual, 'boolean');
            chai.assert.equal(actual, expected);
        });
    });
});
