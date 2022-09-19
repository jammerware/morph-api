// @ts-nocheck
import 'dotenv/config';
import Koa from "koa";
import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";

import { DataService } from './services/data.service.js';
import { TranslationService } from './services/translation.service.js';

const app = new Koa();
const router = new Router();

function start(services) {
    router
        .get("/", ctx => {
            ctx.body = "Hello, world!"
        })
        .get("/character/page/:page/take/:take", ctx => {
            const page = parseInt(ctx.params.page);
            const take = parseInt(ctx.params.take);

            ctx.body = services.data.getCharacters({ page, take });
        })
        .get("/recommended-search-terms", ctx => {
            ctx.body = services.data.getRecommendedSearchTerms()
        })
        .post("/translate/all", async ctx => {
            ctx.response.body = await services.translation.translateAll(
                ctx.request.body.text,
                ctx.request.body.targetLanguage
            );
        })
        .get("/translate/:text/:targetLanguage?", async ctx => {
            const translation = await services.translation.translate(
                ctx.params.text, 
                ctx.params.targetLanguage);

            ctx.response.body = translation;
        })
        // this is bad because it clobbers a theoretically legitimate value, but I'm not sure what's better
        .get("/decomposition/get-random", async ctx => {
            const recSearchTerms = services.data.getRecommendedSearchTerms();
            const term = recSearchTerms[Math.floor(Math.random() * recSearchTerms.length)];

            ctx.response.body = { term };
        })
        .get("/decomposition/:word/:targetLanguage?", async ctx => {
            const word = ctx.params.word;
            const wordContext = {};

            // if passed in chinese, translate to the target language (usually english)
            // otherwise translate to chinese
            if (services.translation.isChinese(word)) {
                const l1Translation = await services.translation.translate(
                    word,
                    ctx.params.targetLanguage
                );

                wordContext.l1 = l1Translation.translation;
                wordContext.translation = word;
                
                // add cc-cedict if it's there
                const ccCedictData = services.data.getCcCedictData(word);
                if (ccCedictData) {
                    wordContext.definitions = ccCedictData.definitions;
                    wordContext.pinyin = ccCedictData.pinyin;
                }
            }
            else {
                const chinese = await services.translation.translate(word);
                wordContext.l1 = word;
                wordContext.translation = chinese.translation;
            }

            const response = {
                word: wordContext,
                characters: []
            };

            for (const character of wordContext.translation) {
                response.characters.push(services.data.getCharacter(character));
            }

            // add cc-cedict if it's there
            const ccCedictData = services.data.getCcCedictData(wordContext.translation);
            if (ccCedictData) {
                wordContext.definitions = ccCedictData.definitions;
                wordContext.pinyin = ccCedictData.pinyin;
            }

            ctx.response.body = response;
        })
        .get("/character/:character", async ctx => {
            ctx.response.body = services.data.getCharacter(ctx.params.character);
        });
    app
        .use(cors())
        .use(bodyParser())
        .use(router.routes())
        .use(router.allowedMethods());

    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Listening on ${port}...`));
}

(async () => {
    start({
        data: await DataService.create(),
        translation: TranslationService.create()
    });
})();