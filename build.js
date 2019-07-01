const fs = require('fs-extra');
const sass = require('node-sass');
const marked = require('marked');
const cheerio = require("cheerio");

const buildDir = "./build/";
const buildDocsDir = "./build/docs/";
const templateBase = "./templates/base.html";
const sassFile = "./templates/style.sass";
const docsDir = "./docs/";
const baseSrc = fs.readFileSync(templateBase);

fs.removeSync(buildDir);
fs.mkdirSync(buildDir);
fs.mkdirSync(buildDocsDir);

writeStyle();
writeDocs();
writeIndex();

function writeStyle() {
    const styleResult = sass.renderSync({
        file: sassFile
    });

    fs.writeFileSync(buildDir + "style.css", styleResult.css);
}

function writeDocs() {
    fs.readdirSync(docsDir).forEach(writeDoc);
}

function writeDoc(name) {
    const raw = fs.readFileSync(docsDir + name, {encoding: "UTF-8"});
    const content = marked(raw);
    const $ = cheerio.load(baseSrc);
    const newPath = buildDocsDir + name.replace(".md", ".html");
    $("#page-content").html(content);
    fs.writeFileSync(newPath, $.html())
}

function writeIndex() {
    fs.writeFileSync(buildDir + "index.html", baseSrc);
}
