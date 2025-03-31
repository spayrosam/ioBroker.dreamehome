"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const release_script_core_1 = require("@alcalzone/release-script-core");
class ManualReviewPlugin {
    constructor() {
        this.id = "manual-review";
        this.stages = [release_script_core_1.DefaultStages.commit];
        // dependencies?: string[] | undefined;
        this.stageBefore = {
            commit: "*",
        };
    }
    // stageBefore?: Record<string, ConstOrDynamic<string[]>> | undefined;
    async executeStage(context, stage) {
        if (stage.id === "commit" && !context.argv.dryRun) {
            context.cli.log("Please review the changes and correct them manually if necessary.");
            let result;
            do {
                result =
                    (await context.cli.select("Are you done?", [
                        { value: "no", label: "no" },
                        { value: "yes", label: "yes" },
                    ])) === "yes";
            } while (!result);
        }
    }
}
exports.default = ManualReviewPlugin;
//# sourceMappingURL=index.js.map