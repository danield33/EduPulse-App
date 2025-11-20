import {useMemo, useState} from "react";
import DialogueBox from "@/components/ui/DialogueBox";
import {Card} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {arrayMove, SortableContext, sortableKeyboardCoordinates} from "@dnd-kit/sortable";
import {closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors} from "@dnd-kit/core";
import {ScriptContentButton} from "@/components/ui/ScriptContentButton";
import {ImageUploadModal} from "@/components/modals/ImageUploadModal";
import {EditDialogueModal} from "@/components/modals/EditDialogueModal";
import {BreakpointModal} from "@/components/modals/BreakpointModal";
import {VoiceManagementModal} from "@/components/modals/VoiceManagementModal";
import {getAvailableBranches, hasValidBreakpoint, isBeforeBranching, isBranchingBlock} from "@/lib/script-editor";
import {SortableItem} from "./SortableItem";
import {Mic} from "lucide-react";

export interface DialogueLine {
    role: string;
    dialogue: string;
    image?: {
        url?: string;
        prompt?: string;
        base64?: string;
    };
}

export interface BranchOption {
    type: string;
    dialogue: DialogueLine[];
}

export interface ScriptBlock {
    role: string;
    dialogue: string;
    branch_options?: BranchOption[];
    image?: {
        url?: string;
        prompt?: string;
        base64?: string;
    };
    breakpoint?: BreakpointQuestion;
}

export interface Scenario {
    title: string;
    script: ScriptBlock[];
    characters?: Record<string, string>; // Added: voice descriptions
}

export interface BreakpointOption {
    text: string;
    isCorrect: boolean,
    branchTarget?: string | null;
}

export interface BreakpointQuestion {
    question: string;
    options: BreakpointOption[];
}


export default function DialogueEditor({scenario: globalScenario, generateScenario}: {
    scenario: Scenario,
    generateScenario: (scenario: Scenario) => void
}) {
    const [scenario, setScenario] = useState<Scenario>(globalScenario);
    const [editing, setEditing] = useState<{ speaker?: string; line?: string; path?: string } | null>(null);
    const [newText, setNewText] = useState("");
    const [imageEdit, setImageEdit] = useState<{
        path: string;
        currentImage: { url?: string; prompt?: string } | null;
    } | null>(null);
    const [breakpointEdit, setBreakpointEdit] = useState<{ path: string, data?: BreakpointQuestion } | null>(null);
    const [voiceModalOpen, setVoiceModalOpen] = useState(false);

    const branches = useMemo(() => getAvailableBranches(scenario, breakpointEdit?.path), [scenario, breakpointEdit]);

    // Extract all unique roles from the script
    const availableRoles = useMemo(() => {
        const roles = new Set<string>();

        scenario.script.forEach((block) => {
            if (block.role) roles.add(block.role);

            if (block.branch_options) {
                block.branch_options.forEach((branch) => {
                    branch.dialogue.forEach((line) => {
                        if (line.role) roles.add(line.role);
                    });
                });
            }
        });

        return Array.from(roles);
    }, [scenario]);


    const handleEdit = (speaker: string, line: string, path: string) => {
        setEditing({speaker, line, path});
        setNewText(line);
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates})
    );

    const saveEdit = (speaker: string, dialogue: string) => {
        if (!editing) return;

        const updated = structuredClone(scenario);
        const pathParts = editing.path!.split(".");
        let target: any = updated;

        for (let i = 0; i < pathParts.length - 1; i++) {
            target = target[pathParts[i]];
        }

        const lastKey = pathParts[pathParts.length - 1];
        target[lastKey].role = speaker;
        target[lastKey].dialogue = dialogue;

        setScenario(updated);
        setEditing(null);
    };


    const handleDragEnd = (event: any) => {
        const {active, over} = event;
        if (!over || active.id === over.id) return;

        const oldIndex = scenario.script.findIndex(
            (_, i) => `item-${i}` === active.id
        );
        const newIndex = scenario.script.findIndex(
            (_, i) => `item-${i}` === over.id
        );

        if (oldIndex === -1 || newIndex === -1) return;

        const newScript = arrayMove(scenario.script, oldIndex, newIndex);
        setScenario({...scenario, script: newScript});
    };

    const handleAddDialogueBox = (
        scriptIndex: number,
        branchIndex?: number,
        dialogueIndex?: number
    ) => {
        const updated = structuredClone(scenario);

        const newDialogue = {
            role: "Narrator",
            dialogue: "New dialogue line...",
        };

        if (
            branchIndex !== undefined &&
            updated.script[scriptIndex].branch_options &&
            updated.script[scriptIndex].branch_options![branchIndex]
        ) {
            const branch = updated.script[scriptIndex].branch_options![branchIndex];
            branch.dialogue.splice((dialogueIndex ?? branch.dialogue.length) + 1, 0, newDialogue);
        } else if (scriptIndex === 0) {
            updated.script.unshift(newDialogue);
        } else {
            updated.script.splice(scriptIndex + 1, 0, newDialogue);
        }

        setScenario(updated);
    };

    const handleAddBranchingDialogue = (scriptIndex: number, branchIndex?: number) => {
        const updated = structuredClone(scenario);

        const newBranchOption: BranchOption = {
            type: "New Branch Option",
            dialogue: [
                {
                    role: "Narrator",
                    dialogue: "New branch dialogue line...",
                },
            ],
        };

        if (
            branchIndex !== undefined &&
            updated.script[scriptIndex].branch_options &&
            Array.isArray(updated.script[scriptIndex].branch_options)
        ) {
            updated.script[scriptIndex].branch_options!.splice(
                branchIndex + 1,
                0,
                newBranchOption
            );
        } else {
            const newBranchGroup: ScriptBlock = {
                branch_options: [newBranchOption],
                dialogue: '',
                role: ''
            };

            updated.script.splice(scriptIndex + 1, 0, newBranchGroup);
        }

        setScenario(updated);
    };

    const handleEditBranchType = (scriptIndex: number, branchIndex: number, newType: string) => {
        const updated = structuredClone(scenario);
        updated.script[scriptIndex].branch_options![branchIndex].type = newType;
        setScenario(updated);
    };

    const handleAddImage = (data: { url?: string, prompt?: string }) => {
        const updated = structuredClone(scenario);
        const pathParts = imageEdit!.path.split(".").map((p) =>
            /^\d+$/.test(p) ? Number(p) : p
        );

        let target: any = updated;
        for (const key of pathParts)
            target = target[key];

        target.image = data;
        setScenario(updated);
        setImageEdit(null);
    };

    const handleDeleteDialogueBox = () => {
        if (!editing?.path) return;

        const updated: any = typeof structuredClone === "function"
            ? structuredClone(scenario)
            : JSON.parse(JSON.stringify(scenario));

        const pathParts = editing.path.split(".").map((p) => {
            return /^\d+$/.test(p) ? Number(p) : p;
        });

        let parent: any = null;
        let cur: any = updated;
        let key: string | number | null = null;

        for (let i = 0; i < pathParts.length; i++) {
            parent = cur;
            key = pathParts[i];
            if (parent == null) break;
            cur = parent[key as any];
        }

        if (parent == null || key == null) {
            console.warn("Delete: could not resolve path", editing.path);
            setEditing(null);
            return;
        }

        if (Array.isArray(parent) && typeof key === "number") {
            if (key >= 0 && key < parent.length) {
                parent.splice(key, 1);
            } else {
                console.warn("Delete: index out of range", key);
            }
        } else if (typeof parent === "object" && (key in parent)) {
            if (typeof key === "number") {
                delete parent[String(key)];
            } else {
                delete parent[key as string];
            }
        } else {
            console.warn("Delete: parent container mismatch", parent, key);
        }

        setScenario(updated);
        setEditing(null);
    };

    const handleSaveVoices = (characters: Record<string, string>) => {
        setScenario({
            ...scenario,
            characters,
        });
    };

    return (
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    EduPulse Scenario Editor
                </h2>
                <Button
                    onClick={() => setVoiceModalOpen(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <Mic className="h-4 w-4"/>
                    Manage Voices
                    {scenario.characters && Object.keys(scenario.characters).length > 0 && (
                        <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                            {Object.keys(scenario.characters).length}
                        </span>
                    )}
                </Button>
            </div>

            {/* Main Dialogue */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={scenario.script.map((_, i) => `item-${i}`)}>
                    {scenario.script.map((block, i) =>
                        <SortableItem key={`item-${i}`} id={`item-${i}`}>
                            {isBranchingBlock(scenario.script[0]) && i === 0 && (
                                <div
                                    className="w-full border border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-md p-3 text-sm flex items-center justify-between">
                                    <span>⚠️ Misconfigured start — a branching dialogue cannot be the first item.</span>
                                    <button
                                        onClick={() => handleAddDialogueBox(0)}
                                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium ml-2"
                                    >
                                        Add Intro Dialogue
                                    </button>
                                </div>
                            )}
                            {block.branch_options ? (
                                <div key={i} className="mt-4">
                                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                        Branching Dialogue Options
                                    </h3>
                                    {block.branch_options?.map((branch, j) => (
                                        <div key={j} className="group realtive items-center flex flex-col w-full">
                                            <Card className="p-4 mt-3 bg-gray-50 dark:bg-gray-800 w-full">
                                                <div className="
                                                      font-semibold text-blue-700 dark:text-blue-300
                                                      bg-transparent border-b border-transparent
                                                      hover:border-blue-300 focus:border-blue-400
                                                      focus:outline-none w-full">
                                                    <input
                                                        type="text"
                                                        value={branch.type}
                                                        onChange={(e) =>
                                                            handleEditBranchType(i, j, e.target.value)
                                                        }
                                                        className="font-semibold text-blue-700 dark:text-blue-300 bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none w-full"
                                                    />
                                                </div>
                                                {branch.dialogue.map((line: any, k: number) => (
                                                    <div key={k}>
                                                        <DialogueBox
                                                            key={k}
                                                            speaker={line.role}
                                                            line={line.dialogue}
                                                            image={scenario.script[i].branch_options?.[j].dialogue[k].image}
                                                            breakpoint={block.breakpoint}
                                                            onEdit={() =>
                                                                handleEdit(
                                                                    line.role,
                                                                    line.dialogue,
                                                                    `script.${i}.branch_options.${j}.dialogue.${k}`
                                                                )
                                                            }
                                                        />

                                                        <ScriptContentButton
                                                            onAddDialogue={() => handleAddDialogueBox(i, j, k)}
                                                            onAddBranching={() => handleAddBranchingDialogue(i, j)}
                                                            onAddImage={() => setImageEdit({
                                                                path: `script.${i}.branch_options.${j}.dialogue.${k}`,
                                                                currentImage: scenario.script[i].branch_options?.[j].dialogue[k].image || null,
                                                            })}
                                                            onAddBreakpoint={() =>
                                                                setBreakpointEdit({
                                                                    path: `script.${i}.branch_options.${j}.dialogue.${k}`,
                                                                    data: block.breakpoint
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                ))}
                                            </Card>
                                        </div>
                                    ))}
                                    <ScriptContentButton onAddDialogue={() => handleAddDialogueBox(i)}
                                                         onAddBranching={() => handleAddBranchingDialogue(i)}
                                                         onAddBreakpoint={() =>
                                                             setBreakpointEdit({
                                                                 path: `script.${i}`,
                                                                 data: block.breakpoint
                                                             })
                                                         }

                                    />
                                </div>
                            ) : (
                                <div className="group realtive items-center flex flex-col">
                                    <DialogueBox
                                        key={i}
                                        speaker={block.role!}
                                        line={block.dialogue!}
                                        image={scenario.script[i].image}
                                        breakpoint={block.breakpoint}
                                        onEdit={() => handleEdit(block.role, block.dialogue, `script.${i}`)}
                                    />
                                    {isBeforeBranching(scenario.script, i) && !hasValidBreakpoint(block) && (
                                        <div
                                            className="my-2 w-full border border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-md p-3 text-sm flex items-center justify-between">
                                            <span>⚠️ Misconfigured Breakpoint — no branch selected for next dialogue.</span>
                                            <button
                                                onClick={() =>
                                                    setBreakpointEdit({
                                                        path: `script.${i}`,
                                                        data: block.breakpoint
                                                    })
                                                }
                                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium ml-2"
                                            >
                                                Fix
                                            </button>
                                        </div>
                                    )}
                                    <ScriptContentButton onAddDialogue={() => handleAddDialogueBox(i)}
                                                         onAddBranching={() => handleAddBranchingDialogue(i)}
                                                         onAddImage={() => {
                                                             setImageEdit({
                                                                 path: `script.${i}`,
                                                                 currentImage: scenario.script[i].image || null,
                                                             })
                                                         }}
                                                         onAddBreakpoint={() =>
                                                             setBreakpointEdit({
                                                                 path: `script.${i}`,
                                                                 data: block.breakpoint
                                                             })
                                                         }
                                    />

                                </div>
                            )}
                        </SortableItem>
                    )}
                </SortableContext>

            </DndContext>

            {scenario && (
                <>
                    <div className="pt-6 border-t w-full flex flex-row justify-between">
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
                            Download JSON
                        </Button>

                        <Button
                            className="rounded-xl bg-lime-400 text-black hover:bg-lime-500 font-bold"
                            onClick={() => generateScenario(scenario)}
                        >
                            Generate Video
                        </Button>
                    </div>
                </>
            )}

            <EditDialogueModal
                isOpen={!!editing}
                speaker={editing?.speaker || ""}
                text={newText}
                onClose={() => setEditing(null)}
                onSave={({speaker, dialogue}) => {
                    saveEdit(speaker, dialogue);
                }}
                onDelete={handleDeleteDialogueBox}
            />

            <ImageUploadModal
                isOpen={!!imageEdit}
                onClose={() => setImageEdit(null)}
                currentImage={imageEdit?.currentImage || null}
                onSave={handleAddImage}
            />

            <BreakpointModal
                isOpen={!!breakpointEdit}
                onClose={() => setBreakpointEdit(null)}
                breakpoint={breakpointEdit?.data}
                onSave={(data) => {
                    if (!breakpointEdit) return;
                    const updated = structuredClone(scenario);

                    const pathParts = breakpointEdit.path.split(".").map((p) =>
                        /^\d+$/.test(p) ? Number(p) : p
                    );
                    let target: any = updated;
                    for (const key of pathParts) target = target[key];

                    target.breakpoint = data;
                    setScenario(updated);
                    setBreakpointEdit(null);
                }}
                availableBranches={branches}
            />

            <VoiceManagementModal
                isOpen={voiceModalOpen}
                onClose={() => setVoiceModalOpen(false)}
                characters={scenario.characters || {}}
                onSave={handleSaveVoices}
                availableRoles={availableRoles}
            />

        </div>
    );
}