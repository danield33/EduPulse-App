"use client";

import { getLesson, getVideoByIndex, hasNextVideo } from "@/app/clientService";
import { notFound } from "next/navigation";
import { useState, useEffect, use } from "react";
import { getApiBaseUrl } from "@/lib/clientConfig";
import type { LessonVideoRead } from "@/app/openapi-client/types.gen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function WatchLessonPage({params}: {params: Promise<{lesson_id: string}>}) {

    const {lesson_id} = use(params);
    const [loading, setLoading] = useState(true);
    const [lessonNotFound, setLessonNotFound] = useState<boolean>(false);
    const [lessonVideoIndex, setLessonVideoIndex] = useState(0);

    const [videoId, setVideoId] = useState<string | null>(null);
    const [videoData, setVideoData] = useState<LessonVideoRead | null>(null);
    const [showQuestionDialog, setShowQuestionDialog] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [currentBreakpointIndex, setCurrentBreakpointIndex] = useState(0);
    const [answeredBreakpoints, setAnsweredBreakpoints] = useState<Set<number>>(new Set());

    useEffect(() => {
        const checkLesson = async () => {
            const response = await getLesson({
                path: {
                    lesson_id: lesson_id
                }
            });
            if (response.error) {
                setLessonNotFound(true);
            }
            setLoading(false);
        };
        void checkLesson();
    }, [lesson_id]);


    useEffect(() => {
        const getVideoId = async () => {
            const response = await getVideoByIndex({
            path: {
                lesson_id: lesson_id,
                index: lessonVideoIndex
            }
        });
            if (response.error) {
                notFound();
            }
            console.log(response);
            setVideoId(response.data?.video_id);
            setVideoData(response.data || null);
            // Reset breakpoint state when video changes
            setCurrentBreakpointIndex(0);
            setAnsweredBreakpoints(new Set());
            setShowQuestionDialog(false);
            setSelectedAnswer(null);
            setShowResult(false);
        };
        void getVideoId();
    }, [lessonVideoIndex, lesson_id]);

    const handleVideoEnd = async () => {
        // If there are breakpoints, show the first one
        if (videoData?.breakpoints && videoData.breakpoints.length > 0) {
            setCurrentBreakpointIndex(0);
            setShowQuestionDialog(true);
            setSelectedAnswer(null);
            setShowResult(false);
        } else {
            // No breakpoints, check if there's a next video and advance
            await checkAndAdvanceToNextVideo();
        }
    };

    // Construct the video stream URL
    const videoStreamUrl = videoId 
        ? `${getApiBaseUrl()}/videos/${videoId}/stream`
        : null;

    if (loading) {
        return <div>Loading...</div>;
    }

    if (lessonNotFound) {
        return <div>Lesson not found</div>;
    }

    const handleAnswerSelect = (choiceIndex: number) => {
        setSelectedAnswer(choiceIndex);
        setShowResult(true);
        // Mark this breakpoint as answered
        setAnsweredBreakpoints(prev => new Set(prev).add(currentBreakpointIndex));
    };

    const checkAndAdvanceToNextVideo = async () => {
        const response = await hasNextVideo({
            path: {
                lesson_id: lesson_id,
                index: lessonVideoIndex
            }
        });
        
        if (!response.error && response.data) {
            // The response is {has_next: boolean} - access via bracket notation
            const hasNext = (response.data as Record<string, boolean>)['has_next'] ?? false;
            if (hasNext) {
                // Advance to next video
                setLessonVideoIndex(prev => prev + 1);
            }
        }
    };

    const handleCloseDialog = async () => {
        setShowQuestionDialog(false);
        setSelectedAnswer(null);
        setShowResult(false);

        // Check if all breakpoints have been answered
        const allBreakpointsAnswered = videoData?.breakpoints 
            ? videoData.breakpoints.every((_, index) => answeredBreakpoints.has(index))
            : true;

        if (allBreakpointsAnswered) {
            // All questions answered, check if there's a next video and advance
            await checkAndAdvanceToNextVideo();
        } else {
            // Move to next unanswered breakpoint
            const nextBreakpointIndex = videoData?.breakpoints?.findIndex((_, index) => !answeredBreakpoints.has(index));
            if (nextBreakpointIndex !== undefined && nextBreakpointIndex !== -1) {
                setCurrentBreakpointIndex(nextBreakpointIndex);
                setShowQuestionDialog(true);
            } else {
                // All breakpoints answered (shouldn't happen, but just in case)
                await checkAndAdvanceToNextVideo();
            }
        }
    };

    // Get the current breakpoint based on currentBreakpointIndex
    const currentBreakpoint = videoData?.breakpoints?.[currentBreakpointIndex] || null;

    // If lesson is found and video is available, play the video
    if (videoStreamUrl) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
                <div className="w-full max-w-6xl">
                    <video
                        key={videoId}
                        className="w-full rounded-lg shadow-lg"
                        style={{ aspectRatio: "16 / 9" }}
                        controls
                        autoPlay
                        onEnded={handleVideoEnd}
                    >
                        <source src={videoStreamUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </div>

                {/* Question Dialog Modal */}
                {showQuestionDialog && currentBreakpoint && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                        <Card className="w-full max-w-2xl mx-4">
                            <CardHeader>
                                <CardTitle>Question</CardTitle>
                                <CardDescription>{currentBreakpoint.question}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    {currentBreakpoint.choices.map((choice, index) => {
                                        const isSelected = selectedAnswer === index;
                                        const isCorrect = index === currentBreakpoint.correct_choice;
                                        let buttonVariant: "default" | "outline" | "secondary" | "destructive" = "outline";
                                        
                                        if (showResult) {
                                            if (isCorrect) {
                                                buttonVariant = "default";
                                            } else if (isSelected && !isCorrect) {
                                                buttonVariant = "destructive";
                                            }
                                        }

                                        return (
                                            <Button
                                                key={index}
                                                variant={buttonVariant}
                                                className="w-full justify-start text-left h-auto py-3 px-4"
                                                onClick={() => !showResult && handleAnswerSelect(index)}
                                                disabled={showResult}
                                            >
                                                <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span>
                                                <span>{choice}</span>
                                                {showResult && isCorrect && (
                                                    <span className="ml-auto">✓ Correct</span>
                                                )}
                                                {showResult && isSelected && !isCorrect && (
                                                    <span className="ml-auto">✗ Incorrect</span>
                                                )}
                                            </Button>
                                        );
                                    })}
                                </div>
                                {showResult && (
                                    <div className="pt-4 border-t">
                                        <p className={`text-sm font-medium ${selectedAnswer === currentBreakpoint.correct_choice ? 'text-green-600' : 'text-red-600'}`}>
                                            {selectedAnswer === currentBreakpoint.correct_choice
                                                ? "Correct! Well done."
                                                : `Incorrect. The correct answer is: ${currentBreakpoint.choices[currentBreakpoint.correct_choice]}`}
                                        </p>
                                    </div>
                                )}
                                <div className="flex justify-end pt-4">
                                    <Button onClick={handleCloseDialog}>
                                        {showResult ? (
                                            (() => {
                                                // Check if there are more unanswered questions
                                                const allBreakpointsAnswered = videoData?.breakpoints 
                                                    ? videoData.breakpoints.every((_, index) => answeredBreakpoints.has(index))
                                                    : true;
                                                
                                                if (allBreakpointsAnswered) {
                                                    return "Done";
                                                } else {
                                                    return "Next Question";
                                                }
                                            })()
                                        ) : "Skip"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        );
    }

    return <div>Loading video...</div>;
}