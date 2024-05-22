/* eslint-disable no-undef */
import chai from 'chai';

import { removeWeirdMinusSignsInFrontOfString } from './utils_string';

describe('utils_string', () => {

    describe('removeWeirdMinusSignsInFrontOfString', () => {

        it('does not change a string without a leading minus sign', () => {
            const testInput = 'someStringWithoutAMinusSign';
            const expected = 'someStringWithoutAMinusSign';
            const actual = removeWeirdMinusSignsInFrontOfString(testInput);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('does not remove non-leading minus signs', () => {
            const testInput = 'someStringWithA-SignSomewhereInIt';
            const expected = 'someStringWithA-SignSomewhereInIt';
            const actual = removeWeirdMinusSignsInFrontOfString(testInput);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('removes single leading minus sign', () => {
            const testInput = '-someStringWithLeadingMinusSign';
            const expected = 'someStringWithLeadingMinusSign';
            const actual = removeWeirdMinusSignsInFrontOfString(testInput);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

        it('removes multiple leading minus signs', () => {
            const testInput = '-----someStringWithSomeLeadingMinusSign';
            const expected = 'someStringWithSomeLeadingMinusSign';
            const actual = removeWeirdMinusSignsInFrontOfString(testInput);

            chai.assert.typeOf(actual, 'string');
            chai.assert.equal(actual, expected);
        });

    });

});
