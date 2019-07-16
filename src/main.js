/*
 * Copyright (c) 2019 Frederik Ar. Mikkelsen
 * Licensed under MIT. See https://github.com/Frederikam/blog/blob/master/LICENSE
 */

const prep = require('./prep.js');
const assembler = require('./assembler.js');
const util = require('./util.js');
const fs = require('fs-extra');

fs.removeSync(util.buildDir);
fs.copySync(util.staticDir, util.buildDir);
console.log("Cleaned build dir");

const docs = prep.getDocuments();
assembler.writeDocs(docs);

const docsNoDrafts = docs.filter(it => !it.draft);
assembler.writeIndex(docsNoDrafts);