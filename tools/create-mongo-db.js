import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from "mongodb";
import { DataService } from "../src/services/data.service.js";

function dictToArray(dictionary) {
    const retVal = [];
    for (const [key, value] of Object.entries(dictionary)) {
        retVal.push({
            character: key, 
            ...value
        });
    }

    return retVal;
}

async function doIt() {
    // get env
    dotenv.config({ path: './secrets/.env' });
    
    // load data locally
    const dataService = await DataService.create();
    const radicals = [];

    const credentials = './secrets/mongo-x509.pem';
    const client = new MongoClient(process.env.MONGO_CONNECTION_STRING || '', {
        sslKey: credentials,
        sslCert: credentials,
        serverApi: ServerApiVersion.v1
    });

    try {
        await client.connect();
        const db = client.db("morph");

        // words collection
        const wordsCollection = db.collection("words");
        const wordDocuments = dictToArray(dataService.chineseLexicalDb);

        wordDocuments.forEach(word => {
            if (word in dataService.ccCEdict) {
                Object.assign(word, dataService.ccCEdict[word]);
            }
        });

        await wordsCollection.deleteMany({});
        await wordsCollection.insertMany(wordDocuments);


        // characters collection
        const charactersCollection = db.collection("characters");
        const characterDocuments = dictToArray(dataService.hanziDb);

        await charactersCollection.deleteMany({});
        await charactersCollection.insertMany(characterDocuments);

        // radicals collection
        const radicalsCollection = db.collection("radicals");
        const radicalDocuments = dictToArray(dataService.radicalsDb);

        await radicalsCollection.deleteMany({});
        await radicalsCollection.insertMany(radicalDocuments);

        // recommended search terms
        const recSearchTermsCollection = db.collection("recommendedSearchTerms");
        const recSearchTermsDocs = dataService.recommendedSearchTerms.map(t => { return { term: t }});
        
        await recSearchTermsCollection.deleteMany({});
        await recSearchTermsCollection.insertMany(recSearchTermsDocs);
    }
    finally {
        client.close();
    }
}

doIt().catch(reason => {
    console.log("Whuh oh:", reason);
});