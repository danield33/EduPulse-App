"use client"

import {MouseEvent, useState} from "react";
import {Button} from "@/components/ui/button";
import {generateScriptFromPdf, uploadScenario} from "@/app/openapi-client";
import DialogueEditor, {Scenario} from "@/components/ui/DialogueEditor";
import {LoadingOverlay} from "@/components/ui/LoadingOverlay";
import {prepareScenarioForBackend} from "@/lib/script-editor";


export default function CreateNewLessonPage() {

    const [scenario, setScenario] = useState<Scenario>();
    const [generatingScript, setGeneratingScript] = useState<boolean>(false);

    const createScript = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setGeneratingScript(true);
        const fileInput = document.getElementById("script-upload") as HTMLInputElement;
        if (!fileInput?.files?.length) return setGeneratingScript(false);

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        const res = await generateScriptFromPdf({
            body: {
                file: fileInput.files[0],
            },
            baseURL: "http://localhost:8000"
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
        setGeneratingScript(false);
    }

    const generateLesson = async (scenario: Scenario) => {
        const token = getClientSideCookie("accessToken");
        if (!token || !scenario) return;

        setGeneratingScript(true);
        const finalScenario = await prepareScenarioForBackend(scenario);

        const res = await uploadScenario({
            body: finalScenario,
            headers: {
                Authorization: `Bearer ${token}`,
            },
            baseURL: "http://localhost:8000"
        });
        console.log(res, 'res');
        setGeneratingScript(false);
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

            <main className="flex flex-col items-center justify-center px-8 py-14">

                <section className="mt-12 w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-800 shadow p-6">

                    <div className="flex flex-col items-center">
                        <h2 className="text-2xl font-semibold mb-3">Upload Script</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Upload a framework script that you want an AI to make a scenario out of.
                        </p>

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

                            {/* Custom clickable label */}
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

                        {generatingScript ?
                            <LoadingOverlay isLoading={generatingScript} message={"Generating Script..."}/>
                            :
                            <Button className={"rounded-xl bg-lime-400 text-black hover:bg-lime-500"} type={"button"}
                                    onClick={createScript}>
                                {!!scenario ? "Generate again!" : "Submit!"}
                            </Button>
                        }


                        {scenario && (
                            <DialogueEditor scenario={scenario} generateScenario={generateLesson}/>
                        )}

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