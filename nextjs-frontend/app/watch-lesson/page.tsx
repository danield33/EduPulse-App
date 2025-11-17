"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle } from "lucide-react";

export default function WatchLesson() {
    const [lessonId, setLessonId] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!lessonId.trim()) {
            setError("Please enter a lesson ID");
            return;
        }

        // Basic UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(lessonId.trim())) {
            setError("Please enter a valid lesson ID (UUID format)");
            return;
        }

        router.push(`/watch-lesson/${lessonId.trim()}`);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLessonId(e.target.value);
        if (error) setError(""); // Clear err when onType
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <main className="flex flex-col items-center justify-center px-8 py-14 min-h-screen">
                <Card className="w-full max-w-2xl">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <PlayCircle className="h-16 w-16 text-blue-500" />
                        </div>
                        <CardTitle className="text-3xl font-bold">
                            Watch a Lesson
                        </CardTitle>
                        <CardDescription className="text-lg mt-2">
                            Enter a lesson ID to start watching
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label 
                                    htmlFor="lesson-id" 
                                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                    Lesson ID
                                </label>
                                <Input
                                    id="lesson-id"
                                    type="text"
                                    placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                                    value={lessonId}
                                    onChange={handleInputChange}
                                    className={`w-full ${error ? 'border-red-500' : ''}`}
                                    autoFocus
                                />
                                {error && (
                                    <p className="text-sm text-red-500 mt-1">
                                        {error}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    You can find the lesson ID in the URL or from your dashboard
                                </p>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                                size="lg"
                            >
                                Watch Lesson
                            </Button>
                        </form>

                        {/*Quick access */}
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Quick Access
                            </h3>
                            <div className="space-y-2">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => router.push("/dashboard")}
                                >
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    View My Lessons
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Info */}
                <div className="mt-8 text-center max-w-2xl">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Don't have a lesson ID?{" "}
                        <a 
                            href="/dashboard/new-lesson" 
                            className="text-blue-500 hover:text-blue-600 underline"
                        >
                            Create a new lesson
                        </a>
                        {" "}or{" "}
                        <a 
                            href="/dashboard" 
                            className="text-blue-500 hover:text-blue-600 underline"
                        >
                            browse your lessons
                        </a>
                    </p>
                </div>
            </main>
        </div>
    );
}