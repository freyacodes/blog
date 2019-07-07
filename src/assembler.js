/*
 * Copyright (c) 2019 Frederik Ar. Mikkelsen
 * Licensed under MIT. See https://github.com/Frederikam/blog/blob/master/LICENSE
 */

const util = require('./util.js');
const prep = require('./prep.js');

const fs = require('fs-extra');
const cheerio = require('cheerio');
const marked = require('marked');

exports.writeDocs = function(documents) {
    documents.forEach(writeDoc);
};

function writeDoc(document) {
    const raw = fs.readFileSync(document.inPath, {encoding: "UTF-8"});
    const content = marked(raw);
    const $ = cheerio.load(prep.getBaseSource());

    $("#page-content").html(content);
    $("title").html(document.title);
    $(".language-properties").parent().remove();
    injectByline($, document);
    fs.mkdirsSync(document.outDir);
    fs.writeFileSync(document.outPath, $.html());

    console.log("Parsed “" + document.title + "” to “" + document.outPath + "”");
}

function injectByline($, document) {
    const title = $("#page-content > h1");
    if (title.length === 0) {
        console.log(`Warning: Did not find title for “${document.inPath}”. Skipping byline injection.`);
        return;
    }

    const timeStr = util.formatDate(document.date);
    const byline = `<p id="byline">By ${document.author}, ${timeStr}</p>`;
    title.after($(byline));
}
