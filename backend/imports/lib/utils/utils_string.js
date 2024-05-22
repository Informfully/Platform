/**
 * For a given string, removes any number of prefixing minus signs from the string.
 * e.g. "-somestring" -> "somestring" and "---somestring" -> -"somestring".
 *
 * There is a weird and at the time of writing unfixed error in react-native-meteor
 * and/or minimongo-cache where a minus sign is added to the _id of a document when
 * using a custom publication (with this.added). That minus sign is only added to the
 * local documents in the driver though and querying for the id including the minus
 * sign will lead to an error on the server. Therefore we use this function to get rid
 * of that minus sign.
 *
 *
 * https://github.com/inProgress-team/react-native-meteor/issues/185
 *
 * @see Meteor.method
 *          'readingList.article.add'
 * @see Meteor.method
 *          'readingList.article.remove'
 *
 * @param aString
 *
 * @returns {*}
 */
export const removeWeirdMinusSignsInFrontOfString = (aString) => {
    if (aString.indexOf('-') === 0) {
        const newString = aString.substr(1, aString.length - 1);
        return removeWeirdMinusSignsInFrontOfString(newString);
    }
    return aString;
};
