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
        .post("/decompose", async ctx => {
            const translation = await service.translate(ctx.request.body.word);
            const response = {
                "translation": translation,
                characters: []
            };

            for (const character of translation) {
                response.characters.push(service.getCharacterDecomposition(character));
            }

            ctx.response.body = response;
        });

    app
        .use(cors())
        .use(bodyParser())
        .use(router.routes())
        .use(router.allowedMethods());

    app.listen(process.env.PORT || 3000, () => console.log("Listening..."));
}

start(Service.create());