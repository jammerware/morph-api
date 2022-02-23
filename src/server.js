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
        .post("/translate", async ctx => {
            const translation = await services.translation.translate(
                ctx.request.body.text, 
                ctx.request.body.targetLanguage);

            ctx.response.body = translation;
        })
        .post("/decompose", async ctx => {
            const translation = await services.translation.translate(ctx.request.body.word);
            const response = {
                "translation": translation,
                characters: []
            };

            for (const character of translation.translation) {
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

    app.listen(process.env.PORT || 3000, () => console.log("Listening..."));
}

(async () => {
    start({
        data: await DataService.create(),
        translation: TranslationService.create()
    });
})();