import Experiments from '../../api/experiments';

/**
 * Given an object or array of class names, e.g. { name1: true, name2: false },
 * returns single string that includes all class names for which the
 * value in the object is true.
 *
 * if the object is undefined, this function returns an empty string.
 *
 * @param args
 * @returns {string}
 */
export const classNames = (args) => {
    const has = Object.prototype.hasOwnProperty;
    const classes = [];
    const argType = typeof args;

    if (argType === 'string' || argType === 'number') {
        classes.push(args);
    } else if (Array.isArray(args) && args.length) {
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            // eslint-disable-next-line no-continue
            if (!arg) continue;

            const inner = classNames(arg);
            if (inner) {
                classes.push(inner);
            }
        }
    } else if (argType === 'object') {
        Object.keys(args).forEach((key) => {
            if (has.call(args, key) && args[key]) {
                classes.push(key);
            }
        });
    }

    return classes.join(' ');
};

/**
 * Given two arrays, tests whether all elements inside the arrays are
 * equal and returns true if they are. Otherwise it returns false.
 *
 * Notice that this does not compare objects. If the arrays are indeed
 * identical but include an object, this function will return false.
 *
 * @param anArray
 * @param anotherArray
 * @returns {boolean}
 */
export const areArraysEqual = (anArray, anotherArray) => {
    if (!anArray || !anotherArray) return false;

    if (anArray.length !== anotherArray.length) return false;

    for (let i = 0, l = anArray.length; i < l; i++) {
        if (anArray[i] instanceof Array && anotherArray[i] instanceof Array) {
            if (!areArraysEqual(anArray[i], anotherArray[i])) return false;
        } else if (anArray[i] !== anotherArray[i]) {
            return false;
        }
    }
    return true;
};

// https://github.com/facebook/fbjs/blob/master/packages/fbjs/src/core/shallowEqual.js#L22
export const is = (x, y) => {
    // SameValue algorithm
    if (x === y) { // Steps 1-5, 7-10
        // Steps 6.b-6.e: +0 != -0
        // Added the nonzero y check to make Flow happy, but it is redundant
        return x !== 0 || y !== 0 || 1 / x === 1 / y;
    }
    // Step 6.a: NaN == NaN
    // eslint-disable-next-line no-self-compare
    return x !== x && y !== y;
};

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
export const shallowEqualOnlyPrimitives = (objA, objB) => {
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

export const getExperimentName = (experimentId) => {
    const experiment = Experiments.findOne({ _id: experimentId }, { fields: { name: 1 } });

    if (experiment && experiment.name) {
        return experiment.name
    }
    
    return '';
}