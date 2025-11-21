"use client"

import {MouseEvent, useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {generateScriptFromPdf, getLessonScenario, updateLesson, uploadScenario} from "@/app/openapi-client";
import DialogueEditor, {Scenario} from "@/components/ui/DialogueEditor";
import {LoadingOverlay} from "@/components/ui/LoadingOverlay";
import {prepareScenarioForBackend} from "@/lib/script-editor";
import {useSearchParams} from "next/navigation";


export default function CreateNewLessonPage() {
    const searchParams = useSearchParams();
    const lessonId = searchParams.get("lessonId");
    const isEditMode = !!lessonId;

    const [scenario, setScenario] = useState<Scenario>();
    const [generatingScript, setGeneratingScript] = useState<[boolean, string | null]>([false, null]);
    const [loadingExisting, setLoadingExisting] = useState(false);

    // Load existing lesson if in edit mode
    useEffect(() => {
        if (isEditMode && lessonId) {
            loadExistingLesson(lessonId);
        }
    }, [lessonId, isEditMode]);

    const loadExistingLesson = async (lessonId: string) => {
        setLoadingExisting(true);
        try {
            const response = await getLessonScenario({
                path: {
                    lesson_id: lessonId
                },
            });

            if (response.data && "scenario" in (response.data as any)) {
                // response.data contains { lesson_id, title, scenario }
                setScenario((response.data as { scenario: Scenario }).scenario as Scenario);
            } else {
                throw new Error("Invalid response format");
            }
        } catch (error) {
            console.error("Error loading lesson:", error);
            alert("Failed to load lesson for editing");
        } finally {
            setLoadingExisting(false);
        }
    };

    const createScript = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setGeneratingScript([true, "Generating Script..."]);
        const fileInput = document.getElementById("script-upload") as HTMLInputElement;
        if (!fileInput?.files?.length) {
            setGeneratingScript([false, null]);
            alert("Please select a file first");
            return;
        }

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        try {
            const res = await generateScriptFromPdf({
                body: {
                    file: fileInput.files[0],
                },
            });

            if ("script" in (res.data as any)) {
                const scenario = JSON.parse(((res.data as any).script));
                setScenario(scenario);
            } else {
                setScenario({
                    title: "No data found",
                    script: [{role: "No data found", dialogue: "The AI couldn't generate a script"}]
                })
            }
        } catch (error) {
            console.error("Error generating script:", error);
            alert("Failed to generate script from file");
        } finally {
            setGeneratingScript([false, null]);
        }
    }

    const startFromScratch = () => {
        // Create an empty scenario template
        setScenario({
            title: "New Lesson",
            script: [
                {
                    role: "Narrator",
                    dialogue: "Welcome to the lesson",
                    image: {
                        prompt: "A classroom setting"
                    }
                }
            ]
        });
    };

    const generateLesson = async (scenario: Scenario) => {
        const token = getClientSideCookie("accessToken");
        if (!token || !scenario) return;

        const actionMessage = isEditMode
            ? "Updating Lesson...\n This may take a few minutes"
            : "Generating Video...\n This may take a few minutes";

        setGeneratingScript([true, actionMessage]);
        const finalScenario = await prepareScenarioForBackend(scenario);

        try {
            if (isEditMode && lessonId) {
                // Update existing lesson using PUT endpoint
                const response = await updateLesson({
                    path: {
                        lesson_id: lessonId
                    },
                    body: finalScenario,
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.data) {
                    alert("Lesson updated successfully!");
                    // redirect back to dashboard
                    window.location.href = "/watch-lesson/" + lessonId;
                } else {
                    throw new Error("Update failed - no data returned");
                }
            } else {
                // Create new lesson
                const res = await uploadScenario({
                    body: finalScenario,
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (res.data) {
                    alert("Lesson created successfully!");
                    // redirect to watch the lesson
                    window.location.href = `/watch-lesson/${res.data.id}`;
                }
            }
        } catch (error) {
            console.error("Error saving lesson:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            alert(`Failed to ${isEditMode ? 'update' : 'create'} lesson: ${errorMessage}`);
        } finally {
            setGeneratingScript([false, null]);
        }
    }

    if (loadingExisting) {
        return <LoadingOverlay isLoading={true} message="Loading lesson..."/>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

            <main className="flex flex-col items-center justify-center px-8 py-14">

                <section className="mt-12 w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-800 shadow p-6">

                    <div className="flex flex-col items-center">
                        <h2 className="text-2xl font-semibold mb-3">
                            {isEditMode ? "Edit Lesson" : "Upload Script"}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            {isEditMode
                                ? "Edit the scenario for your lesson below"
                                : "Upload a framework script to generate a scenario, or start from scratch."
                            }
                        </p>

                        {/* Only show upload form if not in edit mode or if user wants to regenerate */}
                        {!isEditMode && (
                            <>
                                {/* Upload script form */}
                                <form
                                    className="mb-6 flex flex-col items-center justify-center border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg p-8 bg-gray-100 dark:bg-gray-800"
                                >
                                    {/* Hidden native input */}
                                    <input
                                        id="script-upload"
                                        type="file"
                                        accept=".txt,.pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                            const label = document.getElementById("file-label");
                                            if (label && e.target.files?.[0]) {
                                                label.textContent = e.target.files[0].name;
                                            }
                                        }}
                                    />

                                    <label
                                        htmlFor="script-upload"
                                        className="cursor-pointer px-6 py-3 mb-4 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                                    >
                                        Choose File
                                    </label>

                                    {/* File name placeholder */}
                                    <p id="file-label" className="text-sm text-gray-500 mb-4">
                                        No file selected. Files supported: .txt,.pdf
                                    </p>

                                </form>

                                <div className="flex gap-4 mb-6">

                                    <Button
                                        className={"rounded-xl bg-lime-400 text-black hover:bg-lime-500"}
                                        type={"button"}
                                        onClick={createScript}
                                    >
                                        {!!scenario ? "Regenerate from File" : "Generate from File"}
                                    </Button>
                                    <Button
                                        className={"rounded-xl bg-blue-400 text-white hover:bg-blue-500"}
                                        type={"button"}
                                        onClick={startFromScratch}
                                    >
                                        Start from Scratch
                                    </Button>
                                </div>
                            </>
                        )}

                        {scenario && (
                            <DialogueEditor
                                key={JSON.stringify(scenario)}
                                scenario={scenario}
                                generateScenario={generateLesson}
                            />
                        )}

                        {generatingScript[0] && (
                            <LoadingOverlay isLoading={generatingScript[0]}
                                            message={generatingScript[1] ?? ""}/>)
                        }

                    </div>
                </section>
            </main>
        </div>
    )
}

const getClientSideCookie = (name: string): string | undefined => {
    return document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`))
        ?.split('=')[1];
};