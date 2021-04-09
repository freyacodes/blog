/*
 * Copyright (c) 2019 Freya Arbjerg
 * Licensed under MIT. See https://github.com/freyacodes/blog/blob/master/LICENSE
 */

const prep = require('./prep.js');
const assembler = require('./assembler.js');
const util = require('./util.js');
const feed = require('./feed.js');
const fs = require('fs-extra');

fs.removeSync(util.buildDir);
fs.copySync(util.staticDir, util.buildDir);
console.log("Cleaned build dir");

const docs = prep.getDocuments();
assembler.writeDocs(docs);

const docsNoDrafts = docs.filter(it => !it.draft);
assembler.writeIndex(docsNoDrafts);

feed.buildFeed(docsNoDrafts.slice(0, 4));
