"use client"

import {FormEvent, FormEventHandler} from "react";
import {Button} from "@/components/ui/button";

export default function CreateNewLessonPage() {


    const createScript = async (e:  FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fileInput = document.getElementById("script-upload") as HTMLInputElement;
        if (!fileInput?.files?.length) return;

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        const res = await fetch("/api/generate-lessons", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        // setLessons(data.lessons || []);
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
                                onSubmit={createScript}
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

                            <Button className={"rounded-xl bg-lime-400 text-black hover:bg-lime-500"}>
                                Submit!
                            </Button>


                            {/*/!* Generated Lessons *!/*/}
                            {/*{lessons.length > 0 && (*/}
                            {/*    <div className="mt-6 w-full max-w-2xl">*/}
                            {/*        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">*/}
                            {/*            Generated Lesson Plan*/}
                            {/*        </h3>*/}
                            {/*        <ul className="space-y-3">*/}
                            {/*            {lessons.map((lesson, idx) => (*/}
                            {/*                <li*/}
                            {/*                    key={idx}*/}
                            {/*                    className="p-4 border rounded-lg shadow bg-white dark:bg-gray-700"*/}
                            {/*                >*/}
                            {/*                    <h4 className="font-bold text-gray-800 dark:text-white">*/}
                            {/*                        {lesson.title || `Lesson ${idx + 1}`}*/}
                            {/*                    </h4>*/}
                            {/*                    <p className="text-gray-600 dark:text-gray-300">*/}
                            {/*                        {lesson.description}*/}
                            {/*                    </p>*/}
                            {/*                </li>*/}
                            {/*            ))}*/}
                            {/*        </ul>*/}
                            {/*    </div>*/}
                            {/*)}*/}
                        </div>
                </section>
            </main>
        </div>
    )
}