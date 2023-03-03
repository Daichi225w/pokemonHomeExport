const request       = require('request');
const fs            = require('fs');
const stringifySync = require('csv-stringify/sync');

const pokemonList  = JSON.parse(fs.readFileSync("MasterData/PokemonList.json"));
const wazaList     = JSON.parse(fs.readFileSync("MasterData/WazaList.json"));
const motimonoList = JSON.parse(fs.readFileSync("MasterData/MotimonoList.json"));
const seikakuList  = JSON.parse(fs.readFileSync("MasterData/SeikakuList.json"));
const tokuseiList  = JSON.parse(fs.readFileSync("MasterData/TokuseiList.json"));
const terastalList = JSON.parse(fs.readFileSync("MasterData/TerastalList.json"));

const outputPath = 'Output';

const url = 'https://api.battle.pokemon-home.com/tt/cbd/competition/rankmatch/list';

request.post({
    uri: url,
    headers: {
        "Content-type": "application/json",
        "accept": "application/json, text/javascript, */*; q=0.017",
        "countrycode": "304",
        "authorization":"Bearer",
        "angcode": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Mobile Safari/537.36"
    },
    json: {
        "soft":"Sc"
    }
}, (err, res, data) => {
    let seasonInfoList = data.list;
    let seasonNumList = Object.keys(seasonInfoList);
    seasonNumList.sort((a, b) => b - a);

    for (let seasonNum of seasonNumList) {
        for (let seasonInfo of Object.values(seasonInfoList[seasonNum])) {
            if (seasonInfo.rule === 0) {
                getSeasonData(seasonInfo)
            }
        }
    }
});

function getSeasonData(seasonInfo) {

    let path = outputPath;
    if (Date.now() >= new Date(seasonInfo.end)) {
        path = `${path}/${seasonInfo.name}`;
        if (fs.existsSync(path)) {
            return;
        } else {
            fs.mkdirSync(path);
        }
    }

    let wazaDataList     = [];
    let motimonoDataList = [];
    let seikakuDataList  = [];
    let tokuseiDataList  = [];
    let terastalDataList = [];

    function getDetail(detailnum) {
        return new Promise(function(resolve, reject) {

            let temotiUrl = `https://resource.pokemon-home.com/battledata/ranking/scvi/${seasonInfo.cId}/${seasonInfo.rst}/${seasonInfo.ts2}/pdetail-${detailnum}`;
            request.get({
                uri: temotiUrl,
                headers: {
                    "accept": "application/json",
                    "user-agent": "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Mobile Safari/537.36"
                }
            }, (err, res, temotiData) => {
                let target = JSON.parse(temotiData);
                for (let num in target) {

                    for (let folm in target[num]) {

                        let pokeName = pokemonList[num][folm];
                        if (!pokeName) {
                            pokeName = `No:${num}'Folm:${folm}`;
                        }
                        let temoti = target[num][folm].temoti;

                        for(let waza of temoti.waza) {
                            let wazaData = {};
                            wazaData.pokeNum     = num;
                            wazaData.pokeFolmNum = folm;
                            wazaData.name        = pokeName;
                            wazaData.wazaId      = waza.id;
                            wazaData.waza        = wazaList[waza.id];
                            wazaData.rate        = waza.val;
                            wazaDataList.push(wazaData);
                        }
                        for(let motimono of temoti.motimono) {
                            let motimonoData = {};
                            motimonoData.pokeNum     = num;
                            motimonoData.pokeFolmNum = folm;
                            motimonoData.name        = pokeName;
                            motimonoData.motimonoId  = motimono.id;
                            motimonoData.motimono    = motimonoList[motimono.id];
                            motimonoData.rate        = motimono.val;
                            motimonoDataList.push(motimonoData);
                        }
                        if (temoti.seikaku) {
                            for(let seikaku of temoti.seikaku) {
                                let seikakuData = {};
                                seikakuData.pokeNum     = num;
                                seikakuData.pokeFolmNum = folm;
                                seikakuData.name        = pokeName;
                                seikakuData.seikakuId   = seikaku.id;
                                seikakuData.seikaku     = seikakuList[seikaku.id];
                                seikakuData.rate        = seikaku.val;
                                seikakuDataList.push(seikakuData);
                            }
                        }
                        for(let tokusei of temoti.tokusei) {
                            let tokuseiData = {};
                            tokuseiData.pokeNum     = num;
                            tokuseiData.pokeFolmNum = folm;
                            tokuseiData.name        = pokeName;
                            tokuseiData.tokuseiId   = tokusei.id;
                            tokuseiData.tokusei     = tokuseiList[tokusei.id];
                            tokuseiData.rate        = tokusei.val;
                            tokuseiDataList.push(tokuseiData);
                        }
                        for(let terastal of temoti.terastal) {
                            let terastalData = {};
                            terastalData.pokeNum     = num;
                            terastalData.pokeFolmNum = folm;
                            terastalData.name        = pokeName;
                            terastalData.terastalId  = terastal.id;
                            terastalData.terastal    = terastalList[terastal.id];
                            terastalData.rate        = terastal.val;
                            terastalDataList.push(terastalData);
                        }
                    }
                }
                resolve();
            });
        });
    }

    Promise.all([getDetail(1), getDetail(2), getDetail(3),getDetail(4),getDetail(5),getDetail(6)]).then(function() {
        saveFile(`${path}/WazaRanking.csv`    , wazaDataList.sort(    (a, b) => a.pokeNum - b.pokeNum));
        saveFile(`${path}/MotimonoRanking.csv`, motimonoDataList.sort((a, b) => a.pokeNum - b.pokeNum));
        saveFile(`${path}/SeikakuRanking.csv` , seikakuDataList.sort( (a, b) => a.pokeNum - b.pokeNum));
        saveFile(`${path}/TokuseiRanking.csv` , tokuseiDataList.sort( (a, b) => a.pokeNum - b.pokeNum));
        saveFile(`${path}/TerastalRanking.csv`, terastalDataList.sort((a, b) => a.pokeNum - b.pokeNum));
    });


    const usageUrl = `https://resource.pokemon-home.com/battledata/ranking/scvi/${seasonInfo.cId}/${seasonInfo.rst}/${seasonInfo.ts2}/pokemon`;

    request.get({
        uri: usageUrl,
        headers: {
            "accept": "application/json",
            "user-agent": "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Mobile Safari/537.36"
        }
    }, (err, res, usageData) => {

        let targetList = JSON.parse(usageData);
        let usageDataList = [];
        let no = 1;
        for (let target of targetList) {
            let targetId = target.id;
            let targetForm = target.form;
            let pokeName = pokemonList[targetId][targetForm];
            if (!pokeName) {
                pokeName = `No:${targetId}'Folm:${targetForm}`;
            }
            let usage = {};
            usage.no          = no;
            usage.pokeNum     = targetId;
            usage.pokeFolmNum = targetForm;
            usage.name        = pokeName;
            usageDataList.push(usage);
            no = no + 1;
        }
        saveFile(`${path}/UsageRanking.csv`, usageDataList);
    });
}

function saveFile(path,dataList) {
    fs.writeFileSync(path, '\ufeff' + stringifySync.stringify(dataList, {header: true, quoted_string: true}));
}