/*
 * Copyright (c) 2019 Frederik Ar. Mikkelsen
 * Licensed under MIT. See https://github.com/Frederikam/blog/blob/master/LICENSE
 */

const util = require('./util.js');
const prep = require('./prep.js');

const fs = require('fs-extra');
const cheerio = require('cheerio');
const marked = require('marked');
const hljs = require("highlight.js");
const docsPerIndexPage = 6;

marked.setOptions({
    highlight: function (code, lang) {
        if (lang === "properties") return null;
        return hljs.highlight(lang, code, true, false).value;
    }
});

exports.writeDocs = function (documents) {
    documents.forEach(writeDoc);
};

function writeDoc(document) {
    const raw = fs.readFileSync(document.inPath, {encoding: "UTF-8"});
    const content = marked(raw);
    const $ = cheerio.load(prep.getBaseSource());

    $("#page-content").html(content);
    $("title").html(document.title);
    $(".language-properties").parent().remove();
    document.description = $("#page-content p:first-of-type").text();
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


exports.writeIndex = function (documents) {
    fs.mkdirsSync(util.buildDir + "archive");
    const pages = Math.ceil(documents.length / docsPerIndexPage);
    for (let page = 1; page <= Math.ceil(documents.length / docsPerIndexPage); page++) {
        const slice = documents.slice(
            (page - 1) * docsPerIndexPage,
            Math.min(page * docsPerIndexPage, documents.length)
        );
        writeIndexPage(slice, page, page === pages)
    }
};

function writeIndexPage(sublist, pageNum, isLast) {
    const root = cheerio.load(prep.getBaseSource());
    const $ = root("#page-content");
    $.addClass("index");
    $.append("<h1>Index</h1>");
    sublist.forEach(doc => {
        $.append(`<p class="index-item">${util.formatDate(doc.date)}&nbsp;<a href="${doc.url}">${doc.title}</a></p>`);
        $.append(`<p>${doc.description}</p>`)
    });

    if (pageNum !== 1) {
        let url = `/archive/${pageNum-1}`;
        if (pageNum === 2) url = "/";
        $.append(`<div class="index-button left">« <a href="${url}">Page ${pageNum-1}</a></div>`)
    }
    if (!isLast) {
        const url = `/archive/${pageNum+1}`;
        $.append(`<div class="index-button right"><a href="${url}">Page ${pageNum+1}</a> »</div>`)
    }

    let path = pageNum === 1 ? "index.html" : `archive/${pageNum}.html`;
    fs.writeFileSync(util.buildDir + path, root.html());
    console.log("Wrote index page " + pageNum)
}