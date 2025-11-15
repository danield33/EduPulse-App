import { useState, useEffect, useCallback } from "react";
import {
  LessonScenarioResponse,
  PlaybackState,
  SegmentMetadata,
  BreakpointQuestion,
  ScriptBlock,
  BranchOption,
} from "./types";

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
  branchOptions?: BranchOption[];
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
  });

  // Map of all segments: { main: [...], option_A: [...], option_B: [...] }
  const [segmentMap, setSegmentMap] = useState<Record<string, SegmentInfo[]>>({});

  // Load lesson scenario on mount
  useEffect(() => {
    async function loadScenario() {
      try {
        const response = await fetch(
          `http://localhost:8000/lessons/${lessonId}/scenario`
        );

        if (!response.ok) {
          throw new Error("Failed to load lesson scenario");
        }

        const data: LessonScenarioResponse = await response.json();
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
   * Rules:
   * - A new segment starts when there's an image
   * - A segment ends when there's a new image OR a breakpoint
   * - Multiple script blocks can be in one segment
   * - Branches are processed separately and have their own segment numbering
   */
  const buildSegmentMap = (script: ScriptBlock[]): Record<string, SegmentInfo[]> => {
    const segments: Record<string, SegmentInfo[]> = { main: [] };

    let currentSegmentNumber = 1;
    let currentSegmentBlocks: number[] = [];
    let hasImageInCurrentSegment = false;
    let currentBreakpoint: BreakpointQuestion | undefined;
    let currentBranchOptions: BranchOption[] | undefined;

    for (let i = 0; i < script.length; i++) {
      const block = script[i];

      // If this block has an image and we already have content, end the previous segment
      if (block.image && hasImageInCurrentSegment && currentSegmentBlocks.length > 0) {
        segments.main.push({
          segmentNumber: currentSegmentNumber,
          segmentType: "main",
          hasBreakpoint: !!currentBreakpoint,
          breakpoint: currentBreakpoint,
          branchOptions: currentBranchOptions,
          scriptBlockIndices: [...currentSegmentBlocks],
        });
        currentSegmentNumber++;
        currentSegmentBlocks = [];
        currentBreakpoint = undefined;
        currentBranchOptions = undefined;
        hasImageInCurrentSegment = false;
      }

      // Add this block to current segment
      if (block.image || block.dialogue || block.role) {
        currentSegmentBlocks.push(i);
        if (block.image) {
          hasImageInCurrentSegment = true;
        }
      }

      // Check for breakpoint
      if (block.breakpoint) {
        currentBreakpoint = block.breakpoint;
        currentBranchOptions = block.branch_options;

        // Breakpoint ends the segment
        if (currentSegmentBlocks.length > 0) {
          segments.main.push({
            segmentNumber: currentSegmentNumber,
            segmentType: "main",
            hasBreakpoint: true,
            breakpoint: currentBreakpoint,
            branchOptions: currentBranchOptions,
            scriptBlockIndices: [...currentSegmentBlocks],
          });
          currentSegmentNumber++;
          currentSegmentBlocks = [];
          currentBreakpoint = undefined;
          currentBranchOptions = undefined;
          hasImageInCurrentSegment = false;
        }
      }

      // Process branches
      if (block.branch_options) {
        // Before processing branches, close any open main segment
        if (currentSegmentBlocks.length > 0 && !block.breakpoint) {
          segments.main.push({
            segmentNumber: currentSegmentNumber,
            segmentType: "main",
            hasBreakpoint: false,
            scriptBlockIndices: [...currentSegmentBlocks],
          });
          currentSegmentNumber++;
          currentSegmentBlocks = [];
          hasImageInCurrentSegment = false;
        }

        // Process each branch
        for (const branch of block.branch_options) {
          const branchType = branch.type;
          if (!segments[branchType]) {
            segments[branchType] = [];
          }

          let branchSegmentNumber = 1;
          let branchSegmentHasImage = false;
          let branchDialogueIndices: number[] = [];

          for (let j = 0; j < branch.dialogue.length; j++) {
            const line = branch.dialogue[j];

            // New image starts a new segment (if we have content)
            if (line.image && branchSegmentHasImage && branchDialogueIndices.length > 0) {
              segments[branchType].push({
                segmentNumber: branchSegmentNumber,
                segmentType: branchType,
                hasBreakpoint: false,
                scriptBlockIndices: [], // Branch segments don't map to script blocks
              });
              branchSegmentNumber++;
              branchDialogueIndices = [];
              branchSegmentHasImage = false;
            }

            if (line.image || line.dialogue) {
              branchDialogueIndices.push(j);
              if (line.image) {
                branchSegmentHasImage = true;
              }
            }
          }

          // Close final branch segment
          if (branchDialogueIndices.length > 0) {
            segments[branchType].push({
              segmentNumber: branchSegmentNumber,
              segmentType: branchType,
              hasBreakpoint: false,
              scriptBlockIndices: [],
            });
          }
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
        branchOptions: currentBranchOptions,
        scriptBlockIndices: [...currentSegmentBlocks],
      });
    }

    return segments;
  };

  // Get metadata for the current segment
  const getCurrentSegmentMetadata = useCallback((): SegmentMetadata | null => {
    if (!scenario || Object.keys(segmentMap).length === 0) return null;

    const { currentSegmentNumber, currentSegmentType } = playbackState;
    const segmentType = currentSegmentType || "main";

    const segments = segmentMap[segmentType];
    if (!segments) return null;

    const segment = segments.find((s) => s.segmentNumber === currentSegmentNumber);
    if (!segment) return null;

    return {
      segmentNumber: segment.segmentNumber,
      segmentType: segment.segmentType === "main" ? undefined : segment.segmentType,
      hasBreakpoint: segment.hasBreakpoint,
      breakpoint: segment.breakpoint,
      branchOptions: segment.branchOptions,
    };
  }, [scenario, segmentMap, playbackState]);

  // Handle when a video segment ends
  const handleVideoEnded = useCallback(() => {
    if (!scenario || playbackState.hasEnded || Object.keys(segmentMap).length === 0) return;

    const metadata = getCurrentSegmentMetadata();
    console.log("Video ended, metadata:", metadata);

    // Check if this segment has a breakpoint
    if (metadata?.hasBreakpoint && metadata.breakpoint) {
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
      return;
    }

    // Check if there's a next segment in the current branch/main
    const nextSegmentNumber = playbackState.currentSegmentNumber + 1;
    const nextSegment = segments.find((s) => s.segmentNumber === nextSegmentNumber);

    if (nextSegment) {
      // Continue to next segment in current path
      setPlaybackState((prev) => ({
        ...prev,
        currentSegmentNumber: nextSegmentNumber,
      }));
      onSegmentChange(nextSegmentNumber, segmentType === "main" ? undefined : segmentType);
      return;
    }

    // If we're in a branch and no more segments, return to main
    if (segmentType !== "main") {
      // Find where we left off in main script
      const currentMainSegments = segmentMap.main;
      const currentScriptBlockIndex = playbackState.scriptBlockIndex;

      // Find the next main segment after the breakpoint
      const nextMainSegment = currentMainSegments.find(
        (s) => s.scriptBlockIndices.length > 0 &&
               Math.min(...s.scriptBlockIndices) > currentScriptBlockIndex
      );

      if (nextMainSegment) {
        setPlaybackState((prev) => ({
          ...prev,
          currentSegmentNumber: nextMainSegment.segmentNumber,
          currentSegmentType: undefined,
          scriptBlockIndex: Math.min(...nextMainSegment.scriptBlockIndices),
        }));
        onSegmentChange(nextMainSegment.segmentNumber, undefined);
        return;
      }
    }

    // No more segments - lesson complete
    setPlaybackState((prev) => ({
      ...prev,
      hasEnded: true,
      isPlaying: false,
    }));
  }, [scenario, playbackState, segmentMap, getCurrentSegmentMetadata, onSegmentChange]);

  // Handle breakpoint answer selection
  const handleBreakpointAnswer = useCallback(
    (selectedOptionIndex: number) => {
      if (!scenario || !playbackState.currentBreakpoint || Object.keys(segmentMap).length === 0) return;

      const selectedOption = playbackState.currentBreakpoint.options[selectedOptionIndex];
      const metadata = getCurrentSegmentMetadata();

      console.log("Answer selected:", selectedOption);

      // If there's a branch target, navigate to that branch
      if (selectedOption.branchTarget) {
        const targetBranch = selectedOption.branchTarget

        if (targetBranch && segmentMap[targetBranch]) {
          // Start playing the branch from segment 1
          setPlaybackState((prev) => ({
            ...prev,
            currentSegmentNumber: 1,
            currentSegmentType: targetBranch,
            isAtBreakpoint: false,
            currentBreakpoint: undefined,
            isPlaying: true,
            // Keep scriptBlockIndex to know where to return after branch
          }));
          onSegmentChange(1, targetBranch);
          return;
        }
      }

      // No branch, continue to next main segment
      const currentSegments = segmentMap.main;
      const nextSegmentNumber = playbackState.currentSegmentNumber + 1;
      const nextSegment = currentSegments.find((s) => s.segmentNumber === nextSegmentNumber);

      if (nextSegment) {
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
        // Lesson finished
        setPlaybackState((prev) => ({
          ...prev,
          hasEnded: true,
          isPlaying: false,
          isAtBreakpoint: false,
          currentBreakpoint: undefined,
        }));
      }
    },
    [scenario, playbackState, segmentMap, getCurrentSegmentMetadata, onSegmentChange]
  );

  // Reset playback to beginning
  const resetPlayback = useCallback(() => {
    setPlaybackState({
      currentSegmentNumber: 1,
      currentSegmentType: undefined,
      isAtBreakpoint: false,
      currentBreakpoint: undefined,
      scriptBlockIndex: 0,
      isPlaying: true,
      hasEnded: false,
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
