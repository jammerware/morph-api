import { v2 } from "@google-cloud/translate";

class TranslationService {
    static create() {
        if (!TranslationService._instance) {
            const instance = new TranslationService();
            instance._translateClient = new v2.Translate();
            TranslationService._instance = instance;
        }
        
        return TranslationService._instance;
    }

    /**
     * @param {{ toString: () => string; }} text
     */
    isChinese(text) {
        return text && text.toString().match(/[\u3400-\u9FBF]/);
    }

    // infer the target language if unspecified: English if the text is chinese, otherwise chinese
    /**
     * @param {{ toString: () => string; }} text
     * @param {string} targetLanguage
     */
    __inferTargetLanguage(text, targetLanguage) {
        if (targetLanguage) {
            return targetLanguage;
        }

        return this.isChinese(text) ? "en" : "zh-cn";
    }

    /**
     * @param {{ toString: () => string; }} text
     * @param {string} targetLanguage
     */
    async translate(text, targetLanguage) {
        const finalTargetLanguage = this.__inferTargetLanguage(text, targetLanguage);
        const translation = await this._translateClient.translate(text, finalTargetLanguage);

        return {
            targetLanguage: finalTargetLanguage,
            translation: Array.isArray(translation) ? translation[0]: translation
        };
    }

    /**
     * @param {string[]} texts
     * @param {string} targetLanguage
     */
    async translateAll(texts, targetLanguage) {
        if (!texts || !texts.length) {
            throw new Error(`"translateAll" requires at least one text to translate. You passed: ${texts}`);
        }

        const finalTargetLanguage = this.__inferTargetLanguage(texts[0], targetLanguage);
        const isChineseInput = (finalTargetLanguage != "zh-cn");
        const [translations, translationSummary] = await this._translateClient.translate(texts, finalTargetLanguage);
        const mappedTranslations = [];

        for (const [i, text] of texts.entries()) {
            // whether the request for translation came in chinese or another language, we want the "translation"
            // property to be the chinese translation and the "l1" property to the other language.
            mappedTranslations.push({ 
                l1: isChineseInput ? translationSummary.data.translations[i].translatedText : text, 
                translation: isChineseInput ? text : translationSummary.data.translations[i].translatedText
            });
        }

        return {
            targetLanguage: finalTargetLanguage,
            translations: mappedTranslations
        };
    }
}

export { TranslationService }