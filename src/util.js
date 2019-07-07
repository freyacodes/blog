/*
 * Copyright (c) 2019 Frederik Ar. Mikkelsen
 * Licensed under MIT. See https://github.com/Frederikam/blog/blob/master/LICENSE
 */

const luxon = require("luxon");

exports.buildDir = "./build/";
exports.templateBase = "./templates/base.html";
exports.staticDir = "./static/";
exports.sassFile = "./templates/style.sass";
exports.docsDir = "./docs/";

exports.formatDate = function(date) {
    return luxon.DateTime.fromJSDate(date, {zone: "Europe/Copenhagen"})
        .toFormat("dd LLL yyyy");
};
