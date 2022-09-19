/*
    CC-Cedict comes in a long line-based format, and its pinyin is also not ideally
    formatted (e.g. huo3 shan1). This thing acts on "./data/cedict_ts.u8" (git excluded) and outputs
    JSON with ideally formatted pinyin.
*/

import fs from 'fs';
import LineByLine from "n-readlines";

// map numbers to tone characters
const TONE_MAP = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u']
}

const lineReader = new LineByLine("./data/cedict_ts.u8");
const lineExpr = /(\S+?) (\S+) \[([a-zA-Z0-9 ]+?)\] \/(.+)\//g
let line = null;
const allEntries = {};

while(line = lineReader.next()) {
    const matches = Array.from(line.toString().matchAll(lineExpr));

    // i understand why this looks for multiple matches, but it seems to me that most current
    // SO answers don't have this property. have to use ugly [0] stuff to just use the first match
    if (matches && matches.length == 1) {
        const match = matches[0];

        allEntries[match[2]] = {
            pinyin: Array
                .from(buildPinyin(match[3]))
                .join(' ')
                .trim(),
            definitions: match[4].split('/')
        };
    }
}

// dump to JSON
fs.writeFileSync('./data/cc-cedict.json', JSON.stringify(allEntries));

/**
 * @param {string} inPinyin
 */
function* buildPinyin(inPinyin) {
    for (const syllable of inPinyin.split(' ')) {
        const allVowels = ['a', 'o', 'e', 'i', 'u', 'ü'];
        
        const vowelMatches = [...syllable.matchAll(/[aeiou]/g)]

        if (vowelMatches.length == 0) {
            yield syllable;
            continue;
        }

        // the vowel that gets the tone mark depends on their order in the syllable, with
        // one special exception
        vowelMatches.sort((a, b) => allVowels.indexOf(a[0]) < allVowels.indexOf(b[0]) ? -1 : 1);
        const iuMatches = vowelMatches.filter(m => m[0] == 'i' || m[0] == 'u');
        let replaceVowelMatch = null;

        if (iuMatches && iuMatches.length >= 2) {
            // if i and u both appear, the mark goes on whichever of the two is last
            replaceVowelMatch = iuMatches.pop();
        }
        else {
            // otherwise, it goes on whichever vowel is first in allVowels order above
            replaceVowelMatch = vowelMatches[0];
        }

        if (replaceVowelMatch) {
            const lastVowelIndex = replaceVowelMatch.index || 0;
            const toneNumber = parseInt(syllable[syllable.length-1]) - 1;

            // replace the vowel with the correct character and slice off the tone number
            const outPinyin = syllable.substring(0, lastVowelIndex) 
                + TONE_MAP[replaceVowelMatch[0]][toneNumber] 
                + syllable.substring(lastVowelIndex + 1, syllable.length - 1);

            yield outPinyin;
            continue;
        }

        yield syllable;
    }
}