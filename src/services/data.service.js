import fs from "fs";
import * as fastcsv from '@fast-csv/parse';

class DataService {
    static async create() {
        if (!DataService.instance) {
            const instance = new DataService();

            instance.radicalsDb = DataService.loadRadicalsDb();
            instance.radicalsByVariantDb = DataService.loadRadicalsByVariant(instance.radicalsDb);
            instance.hanziDb = DataService.loadHanziDb(instance.radicalsDb, instance.radicalsByVariantDb);
            instance.chineseLexicalDb = await DataService.loadChineseLexicalDb(instance.hanziDb);
            
            DataService.instance = instance;
        }

        return DataService.instance;
    }

    static loadChineseLexicalDb(hanziDb) {
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
                    if (transformedData.word in hanziDb) {
                        hanziDb[transformedData.word].isUnbound = transformedData.word.length == 1;
                    }
                })
                .on('end', rowCount => {
                    // order each character's common words and limit to 6
                    for(const [key, value] of Object.entries(cldbDict)) {
                        // have to spread the original array because it mutates
                        const words = [... value.words].sort((a, b) => a.frequency < b.frequency ? 1 : -1);
                        value.words = words.slice(0, 6);
                    }

                    resolve(cldbDict);
                })
            });
    }

    static loadHanziDb(radicalsDb, radicalsByVariantDb) {
        const raw = fs.readFileSync("./data/hanzidb-formatted.json");
        const parsed = JSON.parse(raw);
        const dict = {};

        for(const entry of parsed) {
            // "character" is misspelled in the raw data
            dict[entry["charcter"]] = {
                freqRank: parseInt(entry["frequency_rank"]),
                pinyin: entry["pinyin"],
                definitions: !entry["definition"] ? [] : entry["definition"]
                    .split(/[;,]/)
                    .filter(Boolean)
                    .map(s => s.trim()),
                semanticRadical: entry["radical"],
                strokeCount: parseInt(entry["stroke_count"])
            };
        }

        // second passthrough to fix up the semantic radical property
        for (const key of Object.keys(dict)) {
            // if the character is equal to its semantic radical, that's not very interesting, is it?
            const semanticRadical = dict[key].semanticRadical;
            if (semanticRadical && key != semanticRadical) {
                dict[key].semanticRadical = {
                    radical: semanticRadical,
                    ...DataService.getRadical(radicalsDb, radicalsByVariantDb, semanticRadical)
                }
            }
            else {
                delete dict[key]["semanticRadical"]
            }
        }

        return dict;
    }

    static loadRadicalsDb() {
        const raw = JSON.parse(fs.readFileSync('./data/radicals.json'))

        // rename "english" to "translation"
        for (const [key, value] of Object.entries(raw)) {
            value.translation = value.english;
            delete value.english;
        }
        
        return raw;
    }

    static loadRadicalsByVariant(radicalsDb) {
        const radicalsByVariant = {};

        for (const [key, value] of Object.entries(radicalsDb)) {
            if (value.variant) {
                radicalsByVariant[value.variant] = {
                    radical: key,
                    ...value
                };
            }
        }

        return radicalsByVariant;
    }

    getCharacter(character) {
        const cldbInfo = this.chineseLexicalDb[character];
        const hanziDbInfo = this.hanziDb[character];

        return {
            character,
            ... hanziDbInfo,
            isUnbound: cldbInfo.isUnbound || false,
            commonWords: cldbInfo.words
        };
    }

    // todo: this will need to be an instance method eventually or something
    static getRadical(radicalsDb, radicalsByVariant, radical) {
        return radicalsDb[radical] || radicalsByVariant[radical] || null;
    }
}

export { DataService }