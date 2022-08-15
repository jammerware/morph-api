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
        .get("/decomposition/:word/:targetLanguage?", async ctx => {
            const word = ctx.params.word.trim();
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
            }
            else {
                const chinese = await services.translation.translate(word);
                wordContext.l1 = word;
                wordContext.translation = chinese.translation;
            }

            // add word-level pinyin and definitions from cc-edict
            const ccEdictData = services.data.getCcEdictData(word);
            if (ccEdictData) {
                wordContext.pinyin = ccEdictData.pinyin;
                wordContext.definition = ccEdictData.definition;
            }


            const response = {
                word: wordContext,
                characters: []
            };


            for (const character of wordContext.translation) {
                response.characters.push(services.data.getCharacter(character));
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