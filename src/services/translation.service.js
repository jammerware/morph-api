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

    isChinese(text) {
        return text && text.toString().match(/[\u3400-\u9FBF]/);
    }

    async translate(text, targetLanguage) {
        let finalTargetLanguage = targetLanguage;

        // infer the target language if unspecified: English if the text is chinese, otherwise chinese
        if (!finalTargetLanguage) {
            finalTargetLanguage = this.isChinese(text) ? "en" : "zh-cn";
        }

        const translation = await this._translateClient.translate(text, finalTargetLanguage);

        return {
            targetLanguage: finalTargetLanguage,
            translation: Array.isArray(translation) ? translation[0]: translation
        };
    }
}

export { TranslationService }