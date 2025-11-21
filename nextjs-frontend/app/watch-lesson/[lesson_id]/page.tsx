"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {useParams} from "next/navigation";
import {Button} from "@/components/ui/button";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Card, CardContent} from "@/components/ui/card";

import {streamVideoSegment} from "@/app/openapi-client";

import {usePlaybackManager} from "../usePlaybackManager";
import {BreakpointOverlay} from "../BreakpointOverlay";

export default function LessonVideoPlayer() {
    const params = useParams();
    const lessonId = params.lesson_id as string;

    const [videoUrl, setVideoUrl] = useState<string>("");
    const [isLoadingVideo, setIsLoadingVideo] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Callback to load a specific video segment
    const loadVideoSegment = useCallback(
        async (segmentNumber: number, segmentType?: string) => {
            setIsLoadingVideo(true);
            setVideoError(null);

            try {
                // Revoke previous URL to prevent memory leaks
                if (videoUrl) {
                    URL.revokeObjectURL(videoUrl);
                }

                console.log(segmentNumber, segmentType, "QUERY")
                const response = await streamVideoSegment({
                    path: {
                        lesson_id: lessonId,
                    },
                    query: {
                        segment_number: segmentNumber,
                        segment_type: segmentType,
                    },
                    responseType: "blob",
                });

                const blob = (await response.data) as Blob;
                const url = URL.createObjectURL(blob);

                setVideoUrl(url);

                // Auto-play the video when loaded
                if (videoRef.current) {
                    videoRef.current.load();
                    // Attempt to play (may be blocked by browser autoplay policy)
                    videoRef.current.play().catch((err) => {
                        console.warn("Autoplay prevented:", err);
                    });
                }
            } catch (err) {
                console.error("Error loading video segment:", err);
                setVideoError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load video segment"
                );
            } finally {
                setIsLoadingVideo(false);
            }
        },
        [lessonId, videoUrl]
    );

    // Use the playback manager hook
    const {
        playbackState,
        currentSegmentMetadata,
        scenarioLoaded,
        scenarioError,
        handleVideoEnded,
        handleBreakpointAnswer,
        resetPlayback,
    } = usePlaybackManager({
        lessonId,
        onSegmentChange: loadVideoSegment,
    });

    // Load initial video segment
    useEffect(() => {
        loadVideoSegment(
            playbackState.currentSegmentNumber,
            playbackState.currentSegmentType
        );

        // Cleanup on unmount
        return () => {
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
        };
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle scenario loading errors
    if (scenarioError) {
        return (
            <div className="max-w-3xl mx-auto p-8">
                <Alert variant="destructive">
                    <AlertTitle>Error Loading Lesson</AlertTitle>
                    <AlertDescription>{scenarioError}</AlertDescription>
                </Alert>
            </div>
        );
    }

    // Loading state
    if (!scenarioLoaded) {
        return (
            <div className="max-w-3xl mx-auto p-8">
                <div className="text-center py-12">
                    <div className="animate-pulse text-lg text-muted-foreground">
                        Loading lesson...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-6">
            <header>
                <h1 className="text-3xl font-bold mb-2">Interactive Lesson</h1>
                <p className="text-muted-foreground">
                    Lesson ID: {lessonId}
                </p>
            </header>

            {/* Video Player Container */}
            <div className="relative">
                <Card>
                    <CardContent className="p-0">
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                            {isLoadingVideo && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                                    <div className="text-white text-lg">Loading segment...</div>
                                </div>
                            )}

                            {videoError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                                    <Alert variant="destructive" className="max-w-md">
                                        <AlertTitle>Video Error</AlertTitle>
                                        <AlertDescription>{videoError}</AlertDescription>
                                    </Alert>
                                </div>
                            )}

                            {videoUrl && !videoError ? (
                                <video
                                    ref={videoRef}
                                    key={videoUrl}
                                    src={videoUrl}
                                    controls
                                    onEnded={handleVideoEnded}
                                    className="w-full h-full"
                                    autoPlay
                                />
                            ) : (
                                !isLoadingVideo &&
                                !videoError && (
                                    <div className="absolute inset-0 flex items-center justify-center text-white">
                                        No video loaded
                                    </div>
                                )
                            )}

                            {/* Breakpoint Overlay */}
                            {playbackState.isAtBreakpoint &&
                                playbackState.currentBreakpoint && (
                                    <BreakpointOverlay
                                        breakpoint={playbackState.currentBreakpoint}
                                        onAnswerSelected={handleBreakpointAnswer}
                                        showCorrectAnswer={true}
                                    />
                                )}

                            {/* Lesson Completed Overlay */}
                            {playbackState.hasEnded && (
                                <div
                                    className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
                                    <Card className="max-w-md">
                                        <CardContent className="text-center py-8 space-y-4">
                                            <div className="text-4xl mb-4">🎉</div>
                                            <h2 className="text-2xl font-bold">Lesson Complete!</h2>
                                            <p className="text-muted-foreground">
                                                You've finished this lesson.
                                            </p>
                                            <Button onClick={resetPlayback} className="w-full">
                                                Restart Lesson
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Debug Info / Playback Status */}
            <Card>
                <CardContent className="py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <div className="text-muted-foreground">Segment</div>
                            <div className="font-semibold">
                                #{playbackState.currentSegmentNumber}
                            </div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Branch</div>
                            <div className="font-semibold">
                                {playbackState.currentSegmentType || "Main"}
                            </div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Status</div>
                            <div className="font-semibold">
                                {playbackState.isAtBreakpoint
                                    ? "At Breakpoint"
                                    : playbackState.hasEnded
                                        ? "Completed"
                                        : "Playing"}
                            </div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Block Index</div>
                            <div className="font-semibold">
                                {playbackState.scriptBlockIndex + 1}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex gap-4">
                <Button onClick={resetPlayback} variant="outline" className="flex-1">
                    Restart Lesson
                </Button>
            </div>
        </div>
    );
}
