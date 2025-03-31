"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanChangelogForNews = exports.limitKeys = exports.prependKey = void 0;
function prependKey(obj, newKey, value) {
    const ret = { [newKey]: value };
    for (const [k, v] of Object.entries(obj)) {
        ret[k] = v;
    }
    return ret;
}
exports.prependKey = prependKey;
function limitKeys(obj, count) {
    const ret = {};
    for (const [k, v] of Object.entries(obj).slice(0, count)) {
        ret[k] = v;
    }
    return ret;
}
exports.limitKeys = limitKeys;
const changelogAuthorRegex = /^[ \t]*[\*\-][ \t]*\([\p{L}\p{M}0-9@\-_,;&\+\/ ]+\)[ \t]*/gimu;
const changelogBulletPointTestRegex = /^[ \t]*[\*\-][ \t]*/;
const changelogBulletPointReplaceRegex = new RegExp(changelogBulletPointTestRegex, "mg");
function cleanChangelogForNews(changelog) {
    // Remove leading "* (Author) " from changelog entries
    changelog = changelog
        .trim()
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(changelogAuthorRegex, "* ");
    // If all changelog entries are either empty or start with a bullet point, remove that too
    const lines = changelog.split("\n");
    if (lines.every((line) => !line || changelogBulletPointTestRegex.test(line))) {
        changelog = changelog.replace(changelogBulletPointReplaceRegex, "");
    }
    return changelog;
}
exports.cleanChangelogForNews = cleanChangelogForNews;
//# sourceMappingURL=tools.js.map