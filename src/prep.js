/*
 * Copyright (c) 2019 Frederik Ar. Mikkelsen
 * Licensed under MIT. See https://github.com/Frederikam/blog/blob/master/LICENSE
 */

const util = require('./util.js');
const fs = require('fs-extra');
const sass = require('node-sass');
const cheerio = require("cheerio");

const propertiesRegex = /```properties([\s\S]+)```/;
const propertyRegex = /(\S+):(.+)/;
const titleRegex = /^#(.+)/m;

let baseSrc = null;
let documents = null;

exports.getBaseSource = function() {
    if (baseSrc !== null) return baseSrc;
    baseSrc = fs.readFileSync(util.templateBase);
    const styleResult = sass.renderSync({
        file: util.sassFile
    });

    fs.copySync("node_modules/normalize.css/normalize.css", util.buildDir + "normalize.css");
    const $ = cheerio.load(baseSrc);
    $("#style").text(styleResult.css);
    baseSrc = $.html();
    console.log("Compiled CSS");
    return baseSrc;
};

exports.getDocuments = function() {
    if (documents !== null) return documents;
    documents = fs.readdirSync(util.docsDir).map(processDocument);

    // Sort the articles chronologically
    documents.sort((a, b) => {
        if (a.time == null && b.time == null) return 0;
        else if (a.time == null) return 1;
        else if (b.time == null) return -1;
        else return b.time.getTime() - a.time.getTime()
    });

    return documents;
};

function processDocument(filename) {
    const props = {
        inPath: util.docsDir + filename,
        outPath: null,
        outDir: null,
        markdown: fs.readFileSync(util.docsDir + filename).toString(),
        url: null,
        title: "Untitled",
        author: "unknown",
        date: null
    };

    // Match the properties block
    let propsMatch = props.markdown.match(propertiesRegex);
    if (propsMatch !== null && propsMatch.length >= 2) {
        propsMatch[1].split(/\n/).forEach(value => {
            const groups = value.match(propertyRegex);
            if (groups !== null) props[groups[1]] = groups[2].trim();
        });

        if (props.date !== null) {
            props.date = new Date(props.date);
            props.outDir = `${util.buildDir + props.date.getUTCFullYear()}/${props.date.getUTCMonth() + 1}/`;
        } else {
            props.outDir = `${util.buildDir}/undated/`;
        }
        props.outPath = props.outDir + filename.replace(".md", ".html");
        props.url = props.outPath.replace(util.buildDir, "/");
    }

    let titleMatch = props.markdown.match(titleRegex);
    if (titleMatch !== null && titleMatch.length >= 2) {
        props.title = titleMatch[1].trim()
    }

    return props;
}

//export default exports;