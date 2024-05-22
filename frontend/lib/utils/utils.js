
// https://github.com/facebook/fbjs/blob/master/packages/fbjs/src/core/shallowEqual.js#L22
function is(x, y) {
    // SameValue algorithm
    if (x === y) { // Steps 1-5, 7-10
        // Steps 6.b-6.e: +0 != -0
        // Added the nonzero y check to make Flow happy, but it is redundant
        return x !== 0 || y !== 0 || 1 / x === 1 / y;
    }
    // Step 6.a: NaN == NaN
    // eslint-disable-next-line no-self-compare
    return x !== x && y !== y;
}

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Slightly adapted implementation of shallowEqual taken from react core.
 *
 * Performs equality by iterating through the keys of an object and returning
 * false if any key has a value that is not strictly equal to the same key of
 * the second argument. Only compares simple types and skips all objects and
 * arrays.
 *
 * @see react core src
 *      https://github.com/facebook/fbjs/blob/master/packages/fbjs/src/core/shallowEqual.js#L39-L67
 * @param objA
 * @param objB
 * @returns {boolean}
 */
const shallowEqualOnlyPrimitives = (objA, objB) => {
    if (is(objA, objB)) {
        return true;
    }

    if (typeof objA !== 'object' || objA === null
        || typeof objB !== 'object' || objB === null) {
        return false;
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) {
        return false;
    }

    for (let i = 0; i < keysA.length; i++) {
        // if both fields are either objects, arrays or functions, skip the field
        if ((typeof objA[keysA[i]] === 'object'
            && typeof objB[keysB[i]] === 'object')
            || (objA[keysA[i]] instanceof Array
                && objB[keysB[i]] instanceof Array)
            || (objA[keysA[i]] instanceof Function
                && objB[keysB[i]] instanceof Function)
        ) {
            // eslint-disable-next-line no-continue
            continue;
        }

        if (
            !hasOwnProperty.call(objB, keysA[i])
            || !is(objA[keysA[i]], objB[keysA[i]])
        ) {
            return false;
        }
    }

    return true;
};

const removeWeirdMinusSignsInFrontOfString = (aString) => {
    if (aString.indexOf('-') === 0) {
        const newString = aString.substr(1, aString.length - 1);
        return removeWeirdMinusSignsInFrontOfString(newString);
    }
    return aString;
};

export { shallowEqualOnlyPrimitives, removeWeirdMinusSignsInFrontOfString }