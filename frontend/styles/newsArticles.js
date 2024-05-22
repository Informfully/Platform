import { StyleSheet, Dimensions } from 'react-native';
import { FONT_SIZE, FONT_FAMILY, FONT_WEIGHT, FONT_STYLE } from './globals';
import { DynamicColors } from './DynamicColors';

const fullWidth = Dimensions.get('window').width;
let titleScalling = 1;

/**
 * Note that the width of a iphone 5s is 320, the one of an iphone xs is 375
 */
if (fullWidth <= 320) {
    titleScalling = 0.85;
}

const newsArticlesStyleGenerator = () => {
    const titleLineHeight = 30;
    const titleFontSize = FONT_SIZE.LARGE;
    const titleFontFamily = FONT_FAMILY.SERIF.BOLD;
    const titleFontWeight = FONT_WEIGHT.BOLD;
    const titleTextColor = DynamicColors.getColors().CARD_TEXT;

    const leadLineHeight = 23;
    const leadFontSize = FONT_SIZE.NORMAL + 2;
    const leadFontFamily = FONT_FAMILY.SANS_SERIF.MEDIUM;
    const leadFontWeight = FONT_WEIGHT.MEDIUM;
    const leadTextColor = DynamicColors.getColors().CARD_TEXT;

    const paragraphFontSize = FONT_SIZE.TEXT;
    const paragraphLineHeight = 23;
    const paragraphFontFamily = FONT_FAMILY.SERIF.REGULAR;
    const paragraphFontWeight = FONT_WEIGHT.NORMAL;
    const paragraphTextColor = DynamicColors.getColors().CARD_TEXT;

    const subTitleFontSize = 20;
    const subTitleTextColor = DynamicColors.getColors().CARD_TEXT;
    const subTitleFontFamily = FONT_FAMILY.SANS_SERIF.BOLD;
    const subTitleFontWeight = FONT_WEIGHT.BOLD;

    const dateFontSize = FONT_SIZE.NORMAL - 2;
    const dateFontFamily = FONT_FAMILY.TEXT;
    const dateFontWeight = FONT_WEIGHT.TEXT;
    const dateTextColor = DynamicColors.getColors().CARD_TEXT;

    const quoteFontSize = FONT_SIZE.NORMAL + 2;
    const quoteFontFamily = FONT_FAMILY.SANS_SERIF.ITALIC.LIGHT;
    const quoteFontWeight = FONT_WEIGHT.LIGHT;
    const quoteFontStyle = FONT_STYLE.ITALIC;
    const quoteTextColor = DynamicColors.getColors().CARD_TEXT;

    const explanationTagFontSize = FONT_SIZE.TEXT;
    const explanationTagFontFamily = FONT_FAMILY.SERIF.REGULAR;
    const explanationTagFontWeight = FONT_WEIGHT.NORMAL;

    const previewTitleLineHeight = 22;
    const previewTitleFontSize = FONT_SIZE.NORMAL + 2;
    const previewTitleFontFamily = FONT_FAMILY.SERIF.BOLD;
    const previewTitleFontWeight = FONT_WEIGHT.BOLD;
    const previewTitleTextColorBlack = DynamicColors.getColors().CARD_TEXT;

    const previewLeadLineHeight = 20;
    const previewLeadFontSize = FONT_SIZE.NORMAL;
    const previewLeadFontFamily = FONT_FAMILY.TEXT;
    const previewLeadFontWeight = FONT_WEIGHT.NORMAL;
    const previewLeadTextColorWhite = DynamicColors.getColors().CARD_TEXT;

    const previewDateFontSize = FONT_SIZE.NORMAL - 2;
    const previewDateFontFamily = FONT_FAMILY.TEXT;
    const previewDateFontWeight = FONT_WEIGHT.TEXT;
    const previewDateTextColorBlack = DynamicColors.getColors().CARD_TEXT_MUTED;

    const previewExplanationTagFontSize = FONT_SIZE.NORMAL - 2;
    const previewExplanationTagFontFamily = FONT_FAMILY.TEXT;
    const previewExplanationTagFontWeight = FONT_WEIGHT.TEXT;

    return StyleSheet.create({
        title: {
            fontSize: titleFontSize,
            lineHeight: titleLineHeight,
            fontFamily: titleFontFamily,
            fontWeight: titleFontWeight,
            color: titleTextColor,
        },
        lead: {
            lineHeight: leadLineHeight,
            fontFamily: leadFontFamily,
            fontWeight: leadFontWeight,
            fontSize: leadFontSize,
            color: leadTextColor,
            marginTop: 15,
        },
        date: {
            color: dateTextColor,
            fontFamily: dateFontFamily,
            fontSize: dateFontSize,
            fontWeight: dateFontWeight,
            marginTop: 15,
        },
        subTitle: {
            fontSize: subTitleFontSize,
            fontWeight: subTitleFontWeight,
            fontFamily: subTitleFontFamily,
            color: subTitleTextColor,
            marginVertical: 10,
        },
        paragraph: {
            lineHeight: paragraphLineHeight,
            fontSize: paragraphFontSize,
            fontFamily: paragraphFontFamily,
            fontWeight: paragraphFontWeight,
            color: paragraphTextColor,
            marginBottom: 15,
        },
        quote: {
            fontFamily: quoteFontFamily,
            fontSize: quoteFontSize,
            fontWeight: quoteFontWeight,
            color: quoteTextColor,
            fontStyle: quoteFontStyle,
            marginTop: 10,
            marginBottom: 25,
            paddingHorizontal: 20,
        },
        explanationTag: {
            fontFamily: explanationTagFontFamily,
            fontSize: explanationTagFontSize,
            fontWeight: explanationTagFontWeight,
            paddingHorizontal: 12
        },
        previewTitle: {
            lineHeight: previewTitleLineHeight * titleScalling,
            fontSize: previewTitleFontSize * titleScalling,
            fontFamily: previewTitleFontFamily,
            fontWeight: previewTitleFontWeight,
            color: previewTitleTextColorBlack,
            paddingRight: 15,
            paddingBottom: 8,
            backgroundColor: DynamicColors.getColors().CARD_BACKGROUND
        },
        previewLead: {
            lineHeight: previewLeadLineHeight * titleScalling,
            fontFamily: previewLeadFontFamily,
            fontWeight: previewLeadFontWeight,
            fontSize: previewLeadFontSize * titleScalling,
            color: previewLeadTextColorWhite,
            backgroundColor: DynamicColors.getColors().CARD_BACKGROUND
        },
        previewDate: {
            color: previewDateTextColorBlack,
            fontFamily: previewDateFontFamily,
            fontSize: previewDateFontSize * titleScalling,
            fontWeight: previewDateFontWeight,
            backgroundColor: DynamicColors.getColors().CARD_BACKGROUND
        },
        previewExplanationTag: {
            fontFamily: previewExplanationTagFontFamily,
            fontSize: previewExplanationTagFontSize,
            fontWeight: previewExplanationTagFontWeight,
            paddingHorizontal: 8
        },
    });
};

const NEWS_ARTICLES_STYLES = newsArticlesStyleGenerator();

export { NEWS_ARTICLES_STYLES, newsArticlesStyleGenerator };
