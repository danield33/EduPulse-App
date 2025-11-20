import {Scenario, ScriptBlock} from "@/components/ui/DialogueEditor";

export function isBeforeBranching(script: ScriptBlock[], index: number) {
    return !!script[index + 1]?.branch_options;
}

export function hasValidBreakpoint(block: ScriptBlock) {
    if (!block.breakpoint) return false;
    const opts = block.breakpoint.options || [];
    return opts.some((opt) => opt.branchTarget);
}

export function getAvailableBranches(scenario: Scenario, path?: string|null): string[] | null {
    if(!path) return null;
    // Find the parent script block index
    const parts = path.split(".");
    const idx = Number(parts[1]);
    const nextBlock = scenario.script[idx + 1];

    if (nextBlock?.branch_options) {
        return nextBlock.branch_options.map((b: any) => b.type);
    }

    return null;
}

// checks to see if a branching dialogue option has a dialogue box before it to specify which branch to go to
function validateScenarioBreakpoints(scenario: Scenario) {
    const errors: string[] = [];

    scenario.script.forEach((block, i) => {
        if (isBeforeBranching(scenario.script, i) && !hasValidBreakpoint(block)) {
            errors.push(`Block ${i}: Missing branching breakpoint before next section.`);
        }
    });

    return errors;
}

export function isBranchingBlock(block: ScriptBlock) {
    return Array.isArray(block.branch_options);
}

export function ensureBranchSafety(script: ScriptBlock[]) {
    for (let i = 0; i < script.length - 1; i++) {
        const block = script[i];
        const next = script[i + 1];

        if (next?.branch_options && !hasValidBreakpoint(block)) {
            const defaultBranch = next.branch_options[0]?.type;
            if (defaultBranch) {
                if (!block.breakpoint) {
                    block.breakpoint = {
                        question: "Auto-generated branch decision",
                        options: [
                            {
                                text: `Continue to "${defaultBranch}"`,
                                isCorrect: true,
                                branchTarget: defaultBranch,
                            },
                        ],
                    };
                } else {
                    // Add fallback option
                    block.breakpoint.options.push({
                        text: `Default: continue to "${defaultBranch}"`,
                        isCorrect: true,
                        branchTarget: defaultBranch,
                    });
                }
            }
        }
    }
}


export async function prepareScenarioForBackend(scenario: Scenario) {
    const clone = structuredClone(scenario);

    async function convertUrlToBase64(url: string) {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    }

    for (const block of clone.script) {
        if (block.image?.url?.startsWith("blob:")) {
            block.image.base64 = await convertUrlToBase64(block.image.url);
            delete block.image.url;
        }

        if (block.branch_options) {
            for (const branch of block.branch_options) {
                for (const line of branch.dialogue) {
                    if (line.image?.url?.startsWith("blob:")) {
                        line.image.base64 = await convertUrlToBase64(line.image.url);
                        delete line.image.url;
                    }
                }
            }
        }
    }

    return clone;
}
