// estimated read speed in words per minute
const READ_SPEED = 250;
// how many characters are considered one word
const WORD_BOUNDARY = 5;

function concatenateArticleBody(articleBody) {
    return articleBody.map(p => p.text).join(' ');
}

export function estimateReadTimeMinutes(articleBody) {
    if (!articleBody) {
        return 1;
    }
    const articleText = concatenateArticleBody(articleBody);
    const numWords = articleText.length / WORD_BOUNDARY;
    // we round up so we don't get "0 min read" estimates
    return Math.ceil(numWords / READ_SPEED);
}