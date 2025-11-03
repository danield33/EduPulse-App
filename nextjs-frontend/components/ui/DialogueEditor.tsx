import {useState} from "react";
import DialogueBox from "@/components/ui/DialogueBox";
import {Card} from "@/components/ui/card";
import {AnimatePresence, motion} from "framer-motion";
import {Button} from "@/components/ui/button";

export interface DialogueLine {
    role: string;
    dialogue: string;
}

export interface BranchOption {
    type: string;
    dialogue: DialogueLine[];
}

export interface ScriptBlock {
    role: string;
    dialogue: string;
    branch_options?: BranchOption[];
}

export interface Scenario {
    title: string;
    script: ScriptBlock[];
}

export default function DialogueEditor({scenario: globalScenario}: {scenario: Scenario}) {
    const [scenario, setScenario] = useState<Scenario>(globalScenario);
    const [editing, setEditing] = useState<{ speaker?: string; line?: string; path?: string } | null>(null);
    const [newText, setNewText] = useState("");

    const handleEdit = (speaker: string, line: string, path: string) => {
        setEditing({ speaker, line, path });
        setNewText(line);
    };

    const saveEdit = () => {
        if (!editing || !editing.path) return;

        const updated = structuredClone(scenario);

        const pathParts = editing.path.split(".");
        let target: any = updated;

        for (let i = 0; i < pathParts.length - 1; i++) {
            target = target[pathParts[i]];
        }

        target[pathParts[pathParts.length - 1]].dialogue = newText;

        setScenario(updated);
        setEditing(null);
    };

    return (
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                EduPulse Scenario Editor
            </h2>

            {/* Main Dialogue */}
            {scenario.script.map((block, i) =>
                block.branch_options ? (
                    <div key={i} className="mt-4">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                            Branching Dialogue Options
                        </h3>
                        {block.branch_options.map((branch, j) => (
                            <div className="group realtive items-center flex flex-col w-full">
                                <Card key={j} className="p-4 mt-3 bg-gray-50 dark:bg-gray-800 w-full">
                                    <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
                                        {branch.type}
                                    </h4>
                                    {branch.dialogue.map((line: any, k: number) => (
                                        <DialogueBox
                                            key={k}
                                            speaker={line.role}
                                            line={line.dialogue}
                                            onEdit={() =>
                                                handleEdit(
                                                    line.role,
                                                    line.dialogue,
                                                    `script.${i}.branch_options.${j}.dialogue.${k}`
                                                )
                                            }
                                        />
                                    ))}
                                </Card>
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-sm
                                  text-blue-600 dark:text-blue-400 hover:underline mt-2 w-full">
                                    + Add Breakpoint
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="group realtive items-center flex flex-col">
                        <DialogueBox
                            key={i}
                            speaker={block.role!}
                            line={block.dialogue!}
                            onEdit={() => handleEdit(block.role, block.dialogue, `script.${i}`)}
                        />
                        <button  className="opacity-0 group-hover:opacity-100 transition-opacity text-sm
                                  text-blue-600 dark:text-blue-400 hover:underline mt-2">
                            + Add Breakpoint
                        </button>
                    </div>
                )
            )}

            {/* Edit Modal */}
            <AnimatePresence>
                {editing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    >
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 shadow-lg">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                Edit Dialogue ({editing.speaker})
                            </h3>
                            <textarea
                                value={newText}
                                onChange={(e) => setNewText(e.target.value)}
                                className="w-full h-32 border rounded-md p-2 mb-4 bg-gray-50 dark:bg-gray-900 dark:text-white resize-none focus:ring focus:ring-blue-300"
                            />
                            <div className="flex justify-end space-x-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setEditing(null)}
                                    className="text-gray-600"
                                >
                                    Cancel
                                </Button>
                                <Button onClick={saveEdit}>Save</Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Save JSON */}
            <div className="pt-6 border-t">
                <Button
                    onClick={() => {
                        const blob = new Blob([JSON.stringify(scenario, null, 2)], {
                            type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "scenario.json";
                        a.click();
                    }}
                >
                    Download Updated JSON
                </Button>
            </div>
        </div>
    );
}