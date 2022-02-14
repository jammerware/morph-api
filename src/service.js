import fs from "fs";
import { v2 } from "@google-cloud/translate";

class Service {
    static create() {
        if (!Service.instance) {
            const instance = new Service();
            instance.translateClient = new v2.Translate();
            
            const raw = fs.readFileSync("./data/hanzidb-formatted.json");
            const parsed = JSON.parse(raw);
            const dict = {};

            for(const entry of parsed) {
                // "character" is misspelled in the raw data
                dict[entry["charcter"]] = {
                    freqRank: entry["frequency_rank"],
                    pinyin: entry["pinyin"],
                    radical: entry["radical"],
                    definition: entry["definition"],
                    strokeCount: entry["strokeCount"]
                };
            }

            instance.hanziDict = dict;
            Service.instance = instance;
        }

        return this.instance; 
    }

    getCharacterDecomposition(character) {
        return {
            character,
            ... this.hanziDict[character]
        };
    }

    async translate(input) {
        const translation = await this.translateClient.translate(input, "zh-cn");

        if (Array.isArray(translation)) {
            return translation[0]
        }

        return translation;
        
        // return Promise.resolve("火山");
    }
}

export { Service }