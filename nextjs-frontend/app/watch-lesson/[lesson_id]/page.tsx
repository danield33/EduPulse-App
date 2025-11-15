"use client";

import {useEffect, useRef, useState} from "react";
import {useParams, useSearchParams} from "next/navigation";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
// import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";

// OpenAPI client
import {streamVideoSegment} from "@/app/openapi-client";

export default function LessonVideoPlayer() {
    const params = useParams();
    const lessonId = params.lesson_id as string;

    const searchParams = useSearchParams();

    const [segmentNumber, setSegmentNumber] = useState<number>(
        Number(searchParams.get("segment") || 1)
    );

    const [segmentType, setSegmentType] = useState<string | undefined>(
        searchParams.get("branch") || undefined
    );

    const [videoUrl, setVideoUrl] = useState<string>("");
    const [autoAdvance, setAutoAdvance] = useState(true);

    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Fetch video using OpenAPI client
    useEffect(() => {
        async function loadVideo() {
            try {
                const response = await streamVideoSegment({
                    path: {
                        lesson_id: lessonId
                    },
                    query: {
                        segment_number: segmentNumber,
                        segment_type: segmentType,
                    },
                    baseURL: "http://localhost:8000",
                    responseType: "blob"
                });

                // @ts-ignore
                console.log(response)
                const blob = await response.data as Blob;
                const url = URL.createObjectURL(blob);

                setVideoUrl(url);
            } catch (err) {
                console.error("Error loading video segment:", err);
            }
        }

        loadVideo();

        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    }, [lessonId, segmentNumber, segmentType]);

    const nextSegment = () => {
        setSegmentNumber((n) => n + 1);
    };

    const handleVideoEnded = () => {
        if (autoAdvance) {
            nextSegment();
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-semibold mb-2">Lesson Video Player</h1>
                <p className="text-gray-600">Lesson ID: {lessonId}</p>
            </header>

            <div>
                {videoUrl ? (
                    <video
                        ref={videoRef}
                        key={videoUrl}
                        src={videoUrl}
                        controls
                        onEnded={handleVideoEnded}
                        className="rounded-xl border w-full"
                    />
                ) : (
                    <div className="text-gray-500">Loading video...</div>
                )}
            </div>

            <section className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                    <div className="flex flex-col space-y-2">
                        <Label>Segment Number</Label>
                        <Input
                            type="number"
                            min={1}
                            value={segmentNumber}
                            onChange={(e) => setSegmentNumber(Number(e.target.value))}
                        />
                    </div>

                    <div className="flex flex-col space-y-2">
                        <Label>Branch Type (optional)</Label>
                        <Select
                            value={segmentType || "main"}
                            onValueChange={(v) => setSegmentType(v === "main" ? undefined : v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Main script"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="main">Main</SelectItem>
                                <SelectItem value="option_A">option_A</SelectItem>
                                <SelectItem value="option_B">option_B</SelectItem>
                                <SelectItem value="option_C">option_C</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    {/*<Switch checked={autoAdvance} onCheckedChange={setAutoAdvance}/>*/}
                    <Label>Auto-advance to next segment</Label>
                </div>

                <Button onClick={nextSegment} className="w-full">
                    Next Segment
                </Button>
            </section>
        </div>
    );
}
