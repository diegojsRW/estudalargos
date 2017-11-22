"use strict";

const
    fs = require("fs"),
    chalk = require("chalk"),
    path = require("path");
 
/**
 * @typedef Food
 * @prop {string} type
 * @prop {boolean} hasCrop
 * @prop {string} fav
 */
/**
 * @typedef Largo
 * @prop {String} type
 * @prop {String[]} slimeTypes
 * @prop {Food} food
 */
/**
 * @typedef Slime
 * @prop {string} type
 * @prop {Food} food
 * @prop {boolean|string} largoable
 * @prop {string} plot
 * @prop {string} color
 */

/** @type { Largo[] } */
let largos;
/** @type { Largo[] } */
let filteredLargos;
/** @type { Slime[] } */
let slimes;

let selection = 0;

const order = (largo)=>{
    return largo.slimeTypes[0];
};

function main(){
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", handleKeys);
    console.log("Loading largos.json...")
    fs.readFile(path.resolve(__dirname, "largos.json"), "utf8", parseLargoJSON);
    console.log("Loading slimes.json...")
    fs.readFile(path.resolve(__dirname, "..", "slimes.json"), "utf8", parseSlimeJSON);
}
/**
 * 
 * @param {NodeJS.ErrnoException} err 
 * @param {String} slimeFile 
 */
function parseSlimeJSON(err, slimeFile){
    if(err)
        throw err;
    
    console.log("Parsing slimes...")
    slimes = JSON.parse(slimeFile);
    if(largos) reList();
}
/**
 * 
 * @param {NodeJS.ErrnoException} err 
 * @param {String} largoFile 
 */
function parseLargoJSON(err, largoFile){
    if(err)
        throw err;
    
    console.log("Parsing largos...")
    largos = JSON.parse(largoFile)
    //.filter(largo=>largo.food.hasCrop)
    .sort((a,b)=>{
        let ca = order(a), cb = order(b);
        return (ca > cb)?1:((ca < cb)?-1:0);
    });

    if(slimes) reList();
}

function filterList(){
    let selected = largos.filter(largo=>largo.selected).map(largo=>largo.slimeTypes).reduce((tmp, largoSlimeTypes)=>{
        largoSlimeTypes.forEach(largoSlimeType=>{
            if(!tmp.includes(largoSlimeType)){
                tmp.push(largoSlimeType);
            }
        });
        return tmp;
    }, []).sort();

    filteredLargos = largos
    .filter(largo=>{
        return largo.selected || (largo.slimeTypes.filter(slimeType=>{
            return !selected.includes(slimeType);
        }).length > 1);
    });

    slimes.forEach(slime=>{
        slime.selected = selected.filter(selectedSlime=>{
            return (selectedSlime.toLowerCase() === slime.type.toLowerCase())
        }).length > 0;
    });
}


function exportList(){
    let out = "";
    out += filteredLargos.filter(largo=>largo.selected).map(largo=>{
        return largo.type;
    }).join("\n");
    out += "\n";
    out += slimes
    .filter(slime=>!slime.selected)
    .map(slime=>{
        return `${slime.type} Slime`;
    }).join("\n");
    let outlines = out.split("\n").length;
    fs.writeFile(path.resolve(__dirname, "culture.txt"), out, (err)=>{if(err) throw err; console.log(`Successfully exported ${outlines} cultures!`)});
}




function reList(callFilterList = true){
    let group = 0;
    const ERASE = true;
    if(callFilterList) filterList();

    process.stdout.write((ERASE?"\x1b[2J":"")+"\x1b[;H");
    
    filteredLargos
    .forEach((largo, largoIdx, largos)=>{
        let out = `#${String(largoIdx+1).padStart(2)}`;
        if(selection == largoIdx) 
            out = ">".repeat(out.length);

        out += `:${largo.type.padEnd(40)}`+
        `${largo.slimeTypes[0].padEnd(10)}`+
        `${largo.slimeTypes[1].padEnd(10)}`+
        `${String(largo.food.type?largo.food.type:"Any food").padEnd(30)}`+
        `${largo.food.hasCrop?"Has fav food":""}`;
        out = out.padEnd(process.stdout.columns);
        let nextLargo = largos[largoIdx+1];

        if(selection == largoIdx && largo.selected)
            out = chalk.bgCyanBright.blue(out);
        else if(selection == largoIdx)
            out = chalk.bgCyanBright.black(out);
        else if(largo.selected)
            out = chalk.bgBlueBright.black(out);
        else
            out = chalk.bgHsl(group%256,100,15)(out);

        if(largo.type.search(/pink/i) >= 0)
            out = chalk.gray(out);
        else
            out = chalk.whiteBright(out);

        console.log(out);
        if(nextLargo && order(nextLargo) !== order(largo)){
            group+=20
            //out = chalk.underline(out);
        }
    });
    
    let lina = [];
    let linaColunas = 4;
    slimes.forEach(slime=>{
        let out = slime.type.padEnd(Math.floor(process.stdout.columns/linaColunas));
        if(slime.selected)
            out = chalk.bgGreenBright.black(out);

        if(lina.length+1 < linaColunas){
            lina.push(out);
        }
        else {
            console.log(lina.join("") + out);
            lina = [];
        }
    });
    if(lina.length > 0)
        console.log(lina.join(""));

}




/**
 * 
 * @param {Buffer} input 
 */
function handleKeys(input){
    let inpStr = input.toString("utf8");
    
    if(input[0] === 3) 
        process.exit();

    if(input[0] == 32) {
        let tmpselection = filteredLargos[selection];
        filteredLargos[selection].selected = !filteredLargos[selection].selected;
        filterList();

        selection = filteredLargos.indexOf(tmpselection);
        reList();
        return;   
    }
    if(["E", "e"].map(c=>c.charCodeAt()).includes(input[0])){
        exportList();
        return;
    }

    let matched;
    matched = inpStr.match(/\x1b\x5b([\x41|\x42])/);

    if(matched){
        selection += ((matched[1].charCodeAt()-65) *2 - 1);
        selection = (selection % filteredLargos.length);
        if(selection < 0) selection = filteredLargos.length + selection;
        reList();
    }
}
main();