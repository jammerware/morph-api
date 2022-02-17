import fs from "fs";
import { v2 } from "@google-cloud/translate";
import * as fastcsv from '@fast-csv/parse';

class Service {
    static async create() {
        if (!Service.instance) {
            const instance = new Service();

            instance.translateClient = new v2.Translate();
            instance.chineseLexicalDb = await Service.loadChineseLexicalDb();
            instance.hanziDb = Service.loadHanziDb();
            
            Service.instance = instance;
        }

        return Service.instance;
    }

    static loadChineseLexicalDb() {
        return new Promise((resolve, reject) => {
            const cldbDict = {};

            fs.createReadStream("./data/cldb-small.csv")
                .pipe(fastcsv.parse({ headers: true }))
                .on('error', error => reject(error))
                .on('data', data => {
                    // when we're done, each character will be in the dictionary
                    // the value will be { isUnbound: bool, words: [{ word: string, frequency: number }]}
                    const transformedData = {
                        word: data.Word,
                        characters: [data.C1, data.C2, data.C3, data.C4].filter(c => c),
                        frequency: parseFloat(data.Frequency)
                    };

                    // Add this word to the list of common words for the character
                    for (const character of transformedData.characters) {
                        const entry = cldbDict[character] || { words: [] }
                        entry.words.push({ word: transformedData.word, frequency: transformedData.frequency });
                        cldbDict[character] = entry;
                    }

                    // special case! if the word is one character in length, the character can be unbound
                    if (transformedData.word.length == 1) {
                        cldbDict[transformedData.characters[0]].isUnbound = true;
                    }
                })
                .on('end', rowCount => {
                    // order each character's common words and limit to 4
                    for(const [key, value] of Object.entries(cldbDict)) {
                        // have to spread the original array because it mutates
                        const words = [... value.words].sort((a, b) => a.frequency < b.frequency ? 1 : -1);
                        value.words = words.slice(0, 4);
                    }

                    resolve(cldbDict);
                })
            });
    }

    static loadHanziDb() {
        const raw = fs.readFileSync("./data/hanzidb-formatted.json");
        const parsed = JSON.parse(raw);
        const dict = {};

        for(const entry of parsed) {
            // "character" is misspelled in the raw data
            dict[entry["charcter"]] = {
                freqRank: parseInt(entry["frequency_rank"]),
                pinyin: entry["pinyin"],
                semanticRadical: entry["radical"],
                definitions: !entry["definition"] ? [] : entry["definition"]
                    .split(/[;,]/)
                    .filter(Boolean)
                    .map(s => s.trim()),
                strokeCount: parseInt(entry["stroke_count"])
            };
        }

        return dict;
    }

    getCharacter(character) {
        const cldbInfo = this.chineseLexicalDb[character];

        return {
            character,
            ... this.hanziDb[character],
            isUnbound: cldbInfo.isUnbound || false,
            commonWords: cldbInfo.words
        };
    }

    async translate(input) {
        const translation = await this.translateClient.translate(input, "zh-cn");

        if (Array.isArray(translation)) {
            return translation[0]
        }

        return translation;
    }
}

export { Service }