/*
 * Copyright (c) 2019 Frederik Ar. Mikkelsen
 * Licensed under MIT. See https://github.com/Frederikam/blog/blob/master/LICENSE
 */

const fs = require('fs-extra');
const sass = require('node-sass');
const marked = require('marked');
const cheerio = require("cheerio");
const luxon = require("luxon");

const buildDir = "./build/";
const buildDocsDir = "./build/docs/";
const templateBase = "./templates/base.html";
const staticDir = "./static/";
const sassFile = "./templates/style.sass";
const docsDir = "./docs/";
const baseSrc = fs.readFileSync(templateBase);
const docs = [];

fs.removeSync(buildDir);
fs.copySync(staticDir, buildDir);
fs.mkdirSync(buildDocsDir);

writeStyle();
writeDocs();
writeIndex();

function writeStyle() {
    const styleResult = sass.renderSync({
        file: sassFile
    });

    fs.copySync("node_modules/normalize.css/normalize.css", buildDir + "normalize.css");
    fs.writeFileSync(buildDir + "style.css", styleResult.css);
    console.log("Compiled CSS")

}

function writeDocs() {
    fs.readdirSync(docsDir).forEach(writeDoc);
}

function writeDoc(name) {
    const raw = fs.readFileSync(docsDir + name, {encoding: "UTF-8"});
    const content = marked(raw);
    const $ = cheerio.load(baseSrc);
    const htmlName = name.replace(".md", ".html");
    const newPath = buildDocsDir + htmlName;

    $("#page-content").html(content);
    const properties = consumeProperties($, htmlName);
    docs.push(properties);
    injectByline($, properties);
    fs.writeFileSync(newPath, $.html());

    console.log("Parsed “" + properties.title + "” to “" + properties.relPath + "”");
}

function consumeProperties($, htmlName) {
    const obj = {
        relPath: htmlName,
        title: "Untitled",
        author: "unknown",
        time: null
    };

    const propsTag = $(".language-properties");
    const properties = propsTag.text().split(/\n/);
    propsTag.parent().remove();
    const regex = /(\S+):(.+)/;

    properties.forEach(value => {
        const groups = value.match(regex);
        obj[groups[1]] = groups[2].trim();
    });

    const title = $("#page-content > h1");
    if (title.length > 0) {
        obj.title = title.text()
    }

    if (obj.time !== null) obj.time = new Date(obj.time);

    return obj;
}

function injectByline($, properties) {
    const title = $("#page-content > h1");
    if (title.length === 0) {
        console.log(`Warning: Did not find title for “${properties.relPath}”. Skipping byline injection.`);
        return;
    }

    const timeStr = luxon.DateTime.fromJSDate(properties.time).toFormat("dd LLL yyyy");
    const byline = `<p id="byline">By ${properties.author}, ${timeStr}</p>`;
    title.after($(byline));
}

function writeIndex() {
    // Sort the articles chronologically
    docs.sort((a, b) => {
        if (a.time == null && b.time == null) return 0;
        else if (a.time == null) return 1;
        else if (b.time == null) return -1;
        else return b.time.getTime() - a.time.getTime()
    });

    const $ = cheerio.load(baseSrc);
    const contentRoot = $("#page-content");
    contentRoot.append('<h1>Index</h1>');
    contentRoot.append('<p>The latest articles:</p>');

    docs.forEach(props => {
        const dateStr = luxon.DateTime.fromJSDate(props.time).toFormat("dd LLL yyyy");
        contentRoot.append(`<p><code>${dateStr}</code> &mdash; <a href="/docs/${props.relPath}">${props.title}</a></p>`)
    });


    fs.writeFileSync(buildDir + "index.html", $.html());
    console.log("Wrote index");
}
