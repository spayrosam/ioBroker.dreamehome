import type { Context, Plugin, Stage } from "@alcalzone/release-script-core/types";
import type { Argv } from "yargs";
declare class IoBrokerPlugin implements Plugin {
    readonly id = "iobroker";
    readonly stages: Stage[];
    readonly dependencies: string[];
    readonly stageAfter: {
        check: string[];
    };
    defineCLIOptions(yargs: Argv<any>): Argv<any>;
    private checkIoPackage;
    private checkWorkflow;
    private executeEditStage;
    executeStage(context: Context, stage: Stage): Promise<void>;
}
export default IoBrokerPlugin;
//# sourceMappingURL=index.d.ts.map