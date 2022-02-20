import 'dotenv/config';
import Koa from "koa";
import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import { Service } from './service.js';

const app = new Koa();
const router = new Router();

function start(service) {
    router
        .get("/", ctx => {
            ctx.body = "Hello, world!"
        })
        .post("/translate/:targetLanguage", ctx => {
            
        })
        .post("/decompose", async ctx => {
            const translation = await service.translate(ctx.request.body.word);
            const response = {
                "translation": translation,
                characters: []
            };

            for (const character of translation) {
                response.characters.push(service.getCharacter(character));
            }

            ctx.response.body = response;
        })
        .get("/character/:character", async ctx => {
            ctx.response.body = service.getCharacter(ctx.params.character);
        });
    app
        .use(cors())
        .use(bodyParser())
        .use(router.routes())
        .use(router.allowedMethods());

    app.listen(process.env.PORT || 3000, () => console.log("Listening..."));
}

(async () => {
    start(await Service.create());
})();