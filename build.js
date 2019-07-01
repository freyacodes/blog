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
    fs.writeFileSync(buildDir + "index.html", baseSrc);
    console.log("Wrote index");
}
