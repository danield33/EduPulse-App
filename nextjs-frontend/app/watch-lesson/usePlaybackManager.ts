import {useCallback, useEffect, useState} from "react";
import {BreakpointQuestion, LessonScenarioResponse, PlaybackState, ScriptBlock, SegmentMetadata,} from "./types";
import {getLessonScenario} from "@/app/openapi-client";

interface UsePlaybackManagerProps {
    lessonId: string;
    onSegmentChange: (segmentNumber: number, segmentType?: string) => void;
}

interface UsePlaybackManagerReturn {
    playbackState: PlaybackState;
    currentSegmentMetadata: SegmentMetadata | null;
    scenarioLoaded: boolean;
    scenarioError: string | null;
    handleVideoEnded: () => void;
    handleBreakpointAnswer: (selectedOptionIndex: number) => void;
    resetPlayback: () => void;
}

// Represents a video segment in the lesson
interface SegmentInfo {
    segmentNumber: number;
    segmentType: string; // "main" or branch type like "option_A"
    hasBreakpoint: boolean;
    breakpoint?: BreakpointQuestion;
    scriptBlockIndices: number[]; // Which script blocks are included in this segment
}

export function usePlaybackManager({
                                       lessonId,
                                       onSegmentChange,
                                   }: UsePlaybackManagerProps): UsePlaybackManagerReturn {
    const [scenario, setScenario] = useState<LessonScenarioResponse | null>(null);
    const [scenarioError, setScenarioError] = useState<string | null>(null);
    const [playbackState, setPlaybackState] = useState<PlaybackState>({
        currentSegmentNumber: 1,
        currentSegmentType: undefined,
        isAtBreakpoint: false,
        currentBreakpoint: undefined,
        scriptBlockIndex: 0,
        isPlaying: true,
        hasEnded: false,
        branchedFromSegmentNumber: undefined,
    });

    // Map of all segments: { main: [...], option_A: [...], option_B: [...] }
    const [segmentMap, setSegmentMap] = useState<Record<string, SegmentInfo[]>>({});

    // Load lesson scenario on mount
    useEffect(() => {
        async function loadScenario() {
            try {
                const response: {data: LessonScenarioResponse} = (await getLessonScenario({
                    path: {
                        lesson_id: lessonId
                    },
                })) as {data: LessonScenarioResponse}

                if (!response.data) {
                    throw new Error("Failed to load lesson scenario");
                }

                const data: LessonScenarioResponse = response.data;
                setScenario(data);

                // Build segment map by analyzing the scenario
                const segments = buildSegmentMap(data.scenario.script);
                console.log("Segment Map:", segments);
                setSegmentMap(segments);
            } catch (err) {
                setScenarioError(
                    err instanceof Error ? err.message : "Unknown error loading scenario"
                );
                console.error("Error loading scenario:", err);
            }
        }

        loadScenario();
    }, [lessonId]);

    /**
     * Build a complete map of all video segments from the script.
     *
     * RULES:
     * 1. A new segment starts when there's a new image
     * 2. A segment ends at a breakpoint OR when a new image appears
     * 3. Branches are SEPARATE video files with own segment numbering from 1
     * 4. Multiple script blocks WITHOUT images belong to the SAME segment
     */
    const buildSegmentMap = (script: ScriptBlock[]): Record<string, SegmentInfo[]> => {
        const segments: Record<string, SegmentInfo[]> = {main: []};

        let currentSegmentNumber = 1;
        let currentSegmentBlocks: number[] = [];
        let hasImageInCurrentSegment = false;
        let currentBreakpoint: BreakpointQuestion | undefined;

        for (let i = 0; i < script.length; i++) {
            const block = script[i];

            // If this block is ONLY branch_options (no dialogue/role/image)
            if (block.branch_options && !block.dialogue && !block.role && !block.image) {
                // Close any pending main segment before processing branches
                if (currentSegmentBlocks.length > 0) {
                    segments.main.push({
                        segmentNumber: currentSegmentNumber,
                        segmentType: "main",
                        hasBreakpoint: !!currentBreakpoint,
                        breakpoint: currentBreakpoint,
                        scriptBlockIndices: [...currentSegmentBlocks],
                    });
                    currentSegmentNumber++;
                    currentSegmentBlocks = [];
                    currentBreakpoint = undefined;
                    hasImageInCurrentSegment = false;
                }

                // Process each branch as separate video path
                for (const branch of block.branch_options) {
                    const branchType = branch.type;

                    if (!segments[branchType]) {
                        segments[branchType] = [];
                    }

                    let branchSegmentNumber = 1;
                    let branchSegmentBlocks: number[] = [];
                    let branchHasImage = false;

                    // Analyze branch dialogue to determine segments
                    // Rule: New image = new segment (if we already have content)
                    // Lines without images belong to the current/previous segment
                    for (let j = 0; j < branch.dialogue.length; j++) {
                        const line = branch.dialogue[j];

                        // If this line has an image and we already have content in the current segment,
                        // close the current segment and start a new one
                        if (line.image) {
                            // If we have accumulated blocks, close the previous segment first
                            if (branchSegmentBlocks.length > 0) {
                                segments[branchType].push({
                                    segmentNumber: branchSegmentNumber,
                                    segmentType: branchType,
                                    hasBreakpoint: false,
                                    scriptBlockIndices: [],
                                });
                                branchSegmentNumber++;
                                branchSegmentBlocks = [];
                            }
                            branchHasImage = true;
                        }

                        // Add line to current branch segment (has dialogue or role)
                        if (line.dialogue || line.role) {
                            branchSegmentBlocks.push(j);
                        }
                    }

                    // Close final branch segment
                    if (branchSegmentBlocks.length > 0) {
                        segments[branchType].push({
                            segmentNumber: branchSegmentNumber,
                            segmentType: branchType,
                            hasBreakpoint: false,
                            scriptBlockIndices: [],
                        });
                    }
                }

                // Skip to next block (don't process branch_options block as main content)
                continue;
            }

            // Check if we need to close the previous segment due to NEW image
            if (block.image && hasImageInCurrentSegment && currentSegmentBlocks.length > 0) {
                segments.main.push({
                    segmentNumber: currentSegmentNumber,
                    segmentType: "main",
                    hasBreakpoint: !!currentBreakpoint,
                    breakpoint: currentBreakpoint,
                    scriptBlockIndices: [...currentSegmentBlocks],
                });
                currentSegmentNumber++;
                currentSegmentBlocks = [];
                currentBreakpoint = undefined;
                hasImageInCurrentSegment = false;
            }

            // Add this block to current segment if it has main content
            if (block.image || block.dialogue || block.role) {
                currentSegmentBlocks.push(i);
                if (block.image) {
                    hasImageInCurrentSegment = true;
                }
            }

            // Handle breakpoint (ends the segment)
            if (block.breakpoint) {
                currentBreakpoint = block.breakpoint;

                // Close the segment with breakpoint
                if (currentSegmentBlocks.length > 0) {
                    segments.main.push({
                        segmentNumber: currentSegmentNumber,
                        segmentType: "main",
                        hasBreakpoint: true,
                        breakpoint: currentBreakpoint,
                        scriptBlockIndices: [...currentSegmentBlocks],
                    });
                    currentSegmentNumber++;
                    currentSegmentBlocks = [];
                    currentBreakpoint = undefined;
                    hasImageInCurrentSegment = false;
                }
            }
        }

        // Close any remaining main segment
        if (currentSegmentBlocks.length > 0) {
            segments.main.push({
                segmentNumber: currentSegmentNumber,
                segmentType: "main",
                hasBreakpoint: !!currentBreakpoint,
                breakpoint: currentBreakpoint,
                scriptBlockIndices: [...currentSegmentBlocks],
            });
        }

        return segments;
    };

    // Get metadata for the current segment
    const getCurrentSegmentMetadata = useCallback((): SegmentMetadata | null => {
        if (!scenario || Object.keys(segmentMap).length === 0) return null;

        const {currentSegmentNumber, currentSegmentType} = playbackState;
        const segmentType = currentSegmentType || "main";

        const segments = segmentMap[segmentType];
        if (!segments) {
            console.warn(`No segments found for type: ${segmentType}`);
            return null;
        }

        const segment = segments.find((s) => s.segmentNumber === currentSegmentNumber);
        if (!segment) {
            console.warn(`Segment ${currentSegmentNumber} not found in ${segmentType}`);
            return null;
        }

        return {
            segmentNumber: segment.segmentNumber,
            segmentType: segment.segmentType === "main" ? undefined : segment.segmentType,
            hasBreakpoint: segment.hasBreakpoint,
            breakpoint: segment.breakpoint,
        };
    }, [scenario, segmentMap, playbackState]);

    // Handle when a video segment ends
    const handleVideoEnded = useCallback(() => {
        if (!scenario || playbackState.hasEnded || Object.keys(segmentMap).length === 0) return;

        const metadata = getCurrentSegmentMetadata();
        console.log("Video ended. Current segment:", playbackState.currentSegmentNumber,
            "Type:", playbackState.currentSegmentType || "main",
            "Metadata:", metadata);

        // Check if this segment has a breakpoint
        if (metadata?.hasBreakpoint && metadata.breakpoint) {
            console.log("Pausing at breakpoint:", metadata.breakpoint.question);
            setPlaybackState((prev) => ({
                ...prev,
                isAtBreakpoint: true,
                currentBreakpoint: metadata.breakpoint,
                isPlaying: false,
            }));
            return;
        }

        const segmentType = playbackState.currentSegmentType || "main";
        const segments = segmentMap[segmentType];

        if (!segments) {
            console.error("No segments found for type:", segmentType);
            setPlaybackState((prev) => ({...prev, hasEnded: true, isPlaying: false}));
            return;
        }

        // Check if there's a next segment in the current path
        const nextSegmentNumber = playbackState.currentSegmentNumber + 1;
        const nextSegment = segments.find((s) => s.segmentNumber === nextSegmentNumber);

        if (nextSegment) {
            console.log(`Continuing to next segment: ${nextSegmentNumber} (${segmentType})`);
            setPlaybackState((prev) => ({
                ...prev,
                currentSegmentNumber: nextSegmentNumber,
            }));
            onSegmentChange(nextSegmentNumber, segmentType === "main" ? undefined : segmentType);
            return;
        }

        // If we're in a branch and there are no more segments, return to main
        if (segmentType !== "main") {
            console.log(`Branch ${segmentType} complete. Returning to main path.`);

            // Find the next main segment after the branch_options block
            const mainSegments = segmentMap.main;

            // We branched from a breakpoint segment. The branch_options block is separate.
            // We need to continue from the NEXT segment after the branch_options block.
            // Since branch_options blocks don't become segments, we continue from branchedFromSegmentNumber + 1
            const nextMainSegmentNumber = (playbackState.branchedFromSegmentNumber || 0) + 1;

            console.log(`Looking for main segment ${nextMainSegmentNumber} (branched from ${playbackState.branchedFromSegmentNumber})`);

            const nextMainSegment = mainSegments.find((s) => s.segmentNumber === nextMainSegmentNumber);

            if (nextMainSegment) {
                console.log(`✓ Resuming main path at segment ${nextMainSegmentNumber}`);
                setPlaybackState((prev) => ({
                    ...prev,
                    currentSegmentNumber: nextMainSegment.segmentNumber,
                    currentSegmentType: undefined,
                    scriptBlockIndex: nextMainSegment.scriptBlockIndices.length > 0
                        ? Math.min(...nextMainSegment.scriptBlockIndices)
                        : prev.scriptBlockIndex + 1,
                    branchedFromSegmentNumber: undefined,
                    isPlaying: true,
                }));
                onSegmentChange(nextMainSegment.segmentNumber, undefined);
                return;
            } else {
                console.log("* No more main segments after branch. Lesson complete.");
            }
        }

        // No more segments - lesson complete
        console.log("Lesson complete.");
        setPlaybackState((prev) => ({
            ...prev,
            hasEnded: true,
            isPlaying: false,
        }));
    }, [scenario, playbackState, segmentMap, getCurrentSegmentMetadata, onSegmentChange]);

    // Handle breakpoint answer selection
    const handleBreakpointAnswer = useCallback(
        (selectedOptionIndex: number) => {
            if (!scenario || !playbackState.currentBreakpoint || Object.keys(segmentMap).length === 0) {
                console.error("Cannot handle breakpoint answer: missing data");
                return;
            }

            const selectedOption = playbackState.currentBreakpoint.options[selectedOptionIndex];
            console.log("User selected answer:", selectedOption.text,
                "Branch target:", selectedOption.branchTarget);

            // If there's a branch target, navigate to that branch
            if (selectedOption.branchTarget) {
                const targetBranch = selectedOption.branchTarget;

                if (segmentMap[targetBranch]) {
                    const branchSegments = segmentMap[targetBranch];
                    console.log(`Branching to ${targetBranch}, starting at segment 1`);
                    console.log(`Branch has ${branchSegments.length} segment(s):`, branchSegments.map(s => s.segmentNumber));
                    console.log(`Calling onSegmentChange(1, "${targetBranch}")`);

                    setPlaybackState((prev) => ({
                        ...prev,
                        currentSegmentNumber: 1,
                        currentSegmentType: targetBranch,
                        isAtBreakpoint: false,
                        currentBreakpoint: undefined,
                        isPlaying: true,
                        branchedFromSegmentNumber: prev.currentSegmentNumber,
                    }));
                    onSegmentChange(1, targetBranch);
                    return;
                } else {
                    console.error(`✗ Branch ${targetBranch} not found in segment map. Available branches:`, Object.keys(segmentMap));
                }
            }

            // No branch or branch not found - continue to next main segment
            const nextSegmentNumber = playbackState.currentSegmentNumber + 1;
            const mainSegments = segmentMap.main;
            const nextSegment = mainSegments.find((s) => s.segmentNumber === nextSegmentNumber);

            if (nextSegment) {
                console.log(`No branch selected. Continuing to main segment ${nextSegmentNumber}`);
                setPlaybackState((prev) => ({
                    ...prev,
                    currentSegmentNumber: nextSegmentNumber,
                    isAtBreakpoint: false,
                    currentBreakpoint: undefined,
                    isPlaying: true,
                    scriptBlockIndex: nextSegment.scriptBlockIndices.length > 0
                        ? Math.min(...nextSegment.scriptBlockIndices)
                        : prev.scriptBlockIndex + 1,
                }));
                onSegmentChange(nextSegmentNumber, undefined);
            } else {
                console.log("No more segments after breakpoint. Lesson complete.");
                setPlaybackState((prev) => ({
                    ...prev,
                    hasEnded: true,
                    isPlaying: false,
                    isAtBreakpoint: false,
                    currentBreakpoint: undefined,
                }));
            }
        },
        [scenario, playbackState, segmentMap, onSegmentChange]
    );

    // Reset playback to beginning
    const resetPlayback = useCallback(() => {
        console.log("Resetting playback to beginning");
        setPlaybackState({
            currentSegmentNumber: 1,
            currentSegmentType: undefined,
            isAtBreakpoint: false,
            currentBreakpoint: undefined,
            scriptBlockIndex: 0,
            isPlaying: true,
            hasEnded: false,
            branchedFromSegmentNumber: undefined,
        });
        onSegmentChange(1, undefined);
    }, [onSegmentChange]);

    return {
        playbackState,
        currentSegmentMetadata: getCurrentSegmentMetadata(),
        scenarioLoaded: scenario !== null && Object.keys(segmentMap).length > 0,
        scenarioError,
        handleVideoEnded,
        handleBreakpointAnswer,
        resetPlayback,
    };
}