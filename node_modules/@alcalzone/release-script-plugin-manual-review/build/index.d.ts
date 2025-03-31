import type { Context, Plugin, Stage } from "@alcalzone/release-script-core/types";
declare class ManualReviewPlugin implements Plugin {
    readonly id = "manual-review";
    readonly stages: Stage[];
    readonly stageBefore: {
        commit: "*";
    };
    executeStage(context: Context, stage: Stage): Promise<void>;
}
export default ManualReviewPlugin;
//# sourceMappingURL=index.d.ts.map