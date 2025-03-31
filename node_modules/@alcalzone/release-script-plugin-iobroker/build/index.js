"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const release_script_core_1 = require("@alcalzone/release-script-core");
const typeguards_1 = require("alcalzone-shared/typeguards");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const semver_1 = __importDefault(require("semver"));
const tools_1 = require("./tools");
const translate_1 = require("./translate");
function getDesiredIoPackVersion(context) {
    const version = context.getData("version");
    if (context.argv.ioPackageNoPrerelease) {
        const s = semver_1.default.parse(version);
        return `${s.major}.${s.minor}.${s.patch}`;
    }
    else {
        return version;
    }
}
class IoBrokerPlugin {
    constructor() {
        this.id = "iobroker";
        this.stages = [
            release_script_core_1.DefaultStages.check,
            release_script_core_1.DefaultStages.edit,
            // Add others as necessary
        ];
        this.dependencies = ["package", "changelog"];
        // stageAfter?: Record<string, ConstOrDynamic<string[]>> | undefined;
        // stageBefore?: Record<string, ConstOrDynamic<string[]>> | undefined;
        this.stageAfter = {
            check: ["package"],
        };
    }
    defineCLIOptions(yargs) {
        return yargs.options({
            ioPackage: {
                alias: ["io"],
                type: "string",
                description: `The location of ioBroker's io-package.json file, relative to the current directory`,
                defaultDescription: "The current directory",
            },
            noWorkflowCheck: {
                description: "Disable checking the test-and-release.yml workflow",
                type: "boolean",
                default: false,
            },
            numNews: {
                alias: ["nn"],
                type: "number",
                description: `How many news entries should be kept in io-package.json`,
                default: 7,
            },
            ioPackageNoPrerelease: {
                description: "Remove prerelease identifiers from the version in io-package.json",
                type: "boolean",
                default: false,
            },
        });
    }
    async checkIoPackage(context) {
        var _a;
        // ensure that io-package.json exists and has a valid version
        let ioPackDirectory = context.cwd;
        if (context.argv.ioPackage) {
            ioPackDirectory = path_1.default.join(ioPackDirectory, context.argv.ioPackage);
        }
        const ioPackPath = path_1.default.join(ioPackDirectory, "io-package.json");
        if (!(await fs_extra_1.default.pathExists(ioPackPath))) {
            context.cli.fatal(`io-package.json not found in ${ioPackDirectory}!`);
        }
        const ioPack = await fs_extra_1.default.readJson(ioPackPath);
        const ioPackVersion = (_a = ioPack === null || ioPack === void 0 ? void 0 : ioPack.common) === null || _a === void 0 ? void 0 : _a.version;
        if (!ioPackVersion) {
            context.cli.error("Version missing from io-package.json!");
        }
        else if (!semver_1.default.valid(ioPackVersion)) {
            context.cli.error(`Invalid version "${ioPackVersion}" in io-package.json!`);
        }
        else {
            const packVersion = context.getData("version");
            const desiredVersion = getDesiredIoPackVersion(context);
            if (ioPackVersion !== desiredVersion) {
                context.cli.error(`Version mismatch between io-package.json (${ioPackVersion}) and package.json (${packVersion})!`);
            }
            else {
                context.cli.log(`io-package.json ok ${context.cli.colors.green("✔")}`);
            }
        }
        // Remember io-package.json contents
        context.setData("io-package.json", ioPack);
    }
    async checkWorkflow(context) {
        // ensure that the release workflow does not check for base_ref
        // This is pretty specific to ioBroker's release workflow, but better than silently failing
        const workflowPath = path_1.default.join(context.cwd, ".github/workflows/test-and-release.yml");
        const colors = context.cli.colors;
        if (await fs_extra_1.default.pathExists(workflowPath)) {
            let content = fs_extra_1.default.readFileSync(workflowPath, "utf8");
            // Find deploy step, crudely by string manipulation. TODO: This should be done with a yaml parser
            let match = /^[ \t]+deploy:/gm.exec(content);
            if (!match)
                return;
            content = content.substr(match.index);
            match = /^[ \t]+if: |/gm.exec(content);
            if (!match)
                return;
            content = content.substr(match.index);
            match = /^[ \t]+github\.event\.base_ref ==/gm.exec(content);
            if (!match)
                return;
            let line = content.substr(match.index);
            line = line.substr(0, line.indexOf("\n"));
            context.cli.error(`The ${colors.bold("deploy")} job in ${colors.bold(`.github/workflows/test-and-release.yml`)} potentially has an error, which can cause your deploy to fail.
Remove this line to fix it:
${colors.inverse(line)}

You can suppress this check with the ${colors.bold("--no-workflow-check")} flag.`);
        }
    }
    async executeEditStage(context) {
        var _a;
        var _b;
        const newVersion = context.getData("version_new");
        const ioPack = context.getData("io-package.json");
        if (context.argv.dryRun) {
            context.cli.log(`Dry run, would update io-package.json version to ${context.cli.colors.green(newVersion)}`);
        }
        else {
            context.cli.log(`updating io-package.json version to ${context.cli.colors.green(newVersion)}`);
            ioPack.common.version = newVersion;
        }
        context.cli.log(`updating news in io-package.json`);
        (_a = (_b = ioPack.common).news) !== null && _a !== void 0 ? _a : (_b.news = {});
        if (newVersion in ioPack.common.news) {
            context.cli.log(`current news is already in io-package.json, not changing it`);
        }
        else if ((0, typeguards_1.isObject)(ioPack.common.news.NEXT)) {
            if (context.argv.dryRun) {
                context.cli.log(`Dry run, would replace "NEXT" with new version number in io-package.json news`);
            }
            else {
                context.cli.log(`replacing "NEXT" with new version number in io-package.json news`);
                ioPack.common.news = (0, tools_1.prependKey)(ioPack.common.news, newVersion, ioPack.common.news.NEXT);
                delete ioPack.common.news.NEXT;
            }
        }
        else {
            if (context.argv.dryRun) {
                context.cli.log(`Dry run, would add new news to io-package.json`);
            }
            else {
                context.cli.log(`adding new news to io-package.json`);
                const newChangelog = (0, tools_1.cleanChangelogForNews)(context.getData("changelog_new"));
                try {
                    const translated = await (0, translate_1.translateText)(newChangelog);
                    ioPack.common.news = (0, tools_1.prependKey)(ioPack.common.news, newVersion, translated);
                }
                catch (e) {
                    context.cli.fatal(`Could not translate the news: ${e}`);
                }
                // If someone left this in here, also delete it
                delete ioPack.common.news.NEXT;
            }
        }
        // Make sure we don't have too many keys
        const maxNews = context.argv.numNews;
        if (Object.keys(ioPack.common.news).length > maxNews) {
            ioPack.common.news = (0, tools_1.limitKeys)(ioPack.common.news, maxNews);
        }
        if (!context.argv.dryRun) {
            let ioPackDirectory = context.cwd;
            if (context.argv.ioPackage) {
                ioPackDirectory = path_1.default.join(ioPackDirectory, context.argv.ioPackage);
            }
            const ioPackPath = path_1.default.join(ioPackDirectory, "io-package.json");
            await fs_extra_1.default.writeJson(ioPackPath, ioPack, { spaces: 2 });
        }
    }
    async executeStage(context, stage) {
        if (stage.id === "check") {
            await this.checkIoPackage(context);
            if (!context.argv.noWorkflowCheck) {
                await this.checkWorkflow(context);
            }
        }
        else if (stage.id === "edit") {
            await this.executeEditStage(context);
        }
    }
}
exports.default = IoBrokerPlugin;
//# sourceMappingURL=index.js.map