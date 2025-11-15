import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LessonScenarioResponse,
  PlaybackState,
  SegmentMetadata,
  BreakpointQuestion,
  ScriptBlock,
  BranchOption,
} from "./types";

/**
 * Props:
 *  - lessonId: the lesson identifier to fetch scenario JSON
 *  - onSegmentChange: called whenever the hook decides a new segment should be fetched/played.
 *      onSegmentChange(segmentNumber: number, segmentType?: string)
 *
 * Behavior:
 *  - The hook builds an internal representation of main segments and branch segmentation counts.
 *  - It does NOT stream content itself; it tells the parent which file to request by calling onSegmentChange.
 */
export function usePlaybackManager({
  lessonId,
  onSegmentChange,
}: {
  lessonId: string;
  onSegmentChange: (segmentNumber: number, segmentType?: string) => void;
}) {
  // scenario JSON and error
  const [scenario, setScenario] = useState<LessonScenarioResponse | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  // playback state
  const [playback, setPlayback] = useState<PlaybackState>({
    currentMainSegment: 1, // main segment index (1-indexed)
    currentBranchType: undefined, // e.g., "option_A" while inside a branch
    currentBranchIndex: 0, // branch segment index (1-indexed); 0 when not in branch
    isAtBreakpoint: false,
    currentBreakpoint: undefined,
    isPlaying: true,
    hasEnded: false,
    branchedFromMainSegment: undefined,
  });

  // map of main segments computed from scenario
  // structure: [{ segmentNumber: 1, scriptBlockIndices: [...], breakpoint?, branchOptions?: [ { type, segmentsCount } ] }, ...]
  const [mainSegments, setMainSegments] = useState<
    {
      segmentNumber: number;
      scriptBlockIndices: number[];
      hasBreakpoint: boolean;
      breakpoint?: BreakpointQuestion;
      branchOptions?: { type: string; segments: number }[];
    }[]
  >([]);

  // Load scenario JSON from backend
  useEffect(() => {
    let mounted = true;
    async function loadScenario() {
      try {
        const res = await fetch(`http://localhost:8000/lessons/${lessonId}/scenario`);
        if (!res.ok) throw new Error(`Failed to load scenario: ${res.statusText}`);
        const data: LessonScenarioResponse = await res.json();
        if (!mounted) return;
        setScenario(data);

        // build segments from script
        const built = buildMainSegmentsAndBranchCounts(data.scenario.script);
        setMainSegments(built);

        // reset playback to beginning when a new scenario loads
        setPlayback((p) => ({
          ...p,
          currentMainSegment: 1,
          currentBranchType: undefined,
          currentBranchIndex: 0,
          isAtBreakpoint: false,
          currentBreakpoint: undefined,
          isPlaying: true,
          hasEnded: false,
          branchedFromMainSegment: undefined,
        }));

        // Tell parent to load the initial main segment
        onSegmentChange(1, undefined);
      } catch (err: any) {
        setScenarioError(err instanceof Error ? err.message : String(err));
        console.error("Failed to load scenario:", err);
      }
    }
    loadScenario();
    return () => {
      mounted = false;
    };
  }, [lessonId, onSegmentChange]);

  /**
   * Build main segments and compute branch segment counts.
   * This mirrors the segmentation rules used to create videos:
   *  - A new segment starts on image
   *  - A segment ends on breakpoint
   *  - Branch dialogue is partitioned into branch segments by images in the branch dialogue (same rule)
   */
  const buildMainSegmentsAndBranchCounts = (script: ScriptBlock[]) => {
    const mains: any[] = [];
    let currentBlocks: number[] = [];
    let segNum = 1;

    const pushMainSegment = (opts: {
      hasBreakpoint?: boolean;
      breakpoint?: BreakpointQuestion;
      branchOptions?: BranchOption[] | undefined;
    }) => {
      mains.push({
        segmentNumber: segNum,
        scriptBlockIndices: [...currentBlocks],
        hasBreakpoint: !!opts.hasBreakpoint,
        breakpoint: opts.breakpoint,
        branchOptions: opts.branchOptions
          ? opts.branchOptions.map((b) => ({
              type: b.type,
              segments: countBranchSegments(b.dialogue),
            }))
          : undefined,
      });
      segNum++;
      currentBlocks = [];
    };

    for (let i = 0; i < script.length; i++) {
      const block = script[i];

      // If block has image and we already have content, flush previous
      if (block.image && currentBlocks.length > 0) {
        pushMainSegment({ hasBreakpoint: false, branchOptions: undefined });
      }

      // Add block to current accumulator if it has content
      if (block.dialogue || block.image || block.role) {
        currentBlocks.push(i);
      }

      // If block has breakpoint -> it's end of a segment containing breakpoint and branch_options
      if (block.breakpoint) {
        pushMainSegment({
          hasBreakpoint: true,
          breakpoint: block.breakpoint,
          branchOptions: block.branch_options,
        });
      }

      // If block has branch_options but wasn't a breakpoint (rare), still treat branch anchor as a segment boundary
      if (block.branch_options && !block.breakpoint) {
        if (currentBlocks.length > 0) {
          pushMainSegment({ hasBreakpoint: false, branchOptions: undefined });
        }
        // then push an empty main segment representing the anchor if desired (or leave)
      }
    }

    // flush remaining
    if (currentBlocks.length > 0) {
      pushMainSegment({ hasBreakpoint: false, branchOptions: undefined });
    }

    return mains;
  };

  // Count how many segments a branch's dialogue will be split into (by image boundaries)
  const countBranchSegments = (dialogue: { role?: string; dialogue?: string; image?: any }[]) => {
    let count = 0;
    let acc = 0;
    let imageSeen = false;

    for (let i = 0; i < dialogue.length; i++) {
      const line = dialogue[i];
      // start accumulating lines for a branch segment
      if (line.dialogue || line.image) {
        acc++;
        if (line.image) imageSeen = true;
      }

      // if a new image starts and we already have acc, close previous
      if (line.image && imageSeen && acc > 0 && acc > 1) {
        // When an image appears after we already were collecting, this ends the previous segment.
        count++;
        // start new accumulation with current line being the first of the next segment
        acc = 1; // the current line is included in next segment
        imageSeen = true; // keep note
      }
    }

    if (acc > 0) count++;
    return Math.max(1, count); // at least 1 segment if branch has dialogue
  };

  // Helper: get metadata for the currently playing segment
  const getCurrentSegmentMetadata = useCallback((): SegmentMetadata | null => {
    if (!scenario || mainSegments.length === 0) return null;

    // if we're in a branch, metadata is the branch data attached to the main segment that owns it
    if (playback.currentBranchType) {
      const mainIdx = playback.branchedFromMainSegment ?? playback.currentMainSegment;
      // Find the main segment that corresponds to the one we branched from:
      const mainSegment = mainSegments.find((m) => m.segmentNumber === mainIdx);
      if (!mainSegment) return null;
      const branch = mainSegment.branchOptions?.find((b) => b.type === playback.currentBranchType);
      return {
        segmentNumber: playback.currentBranchIndex,
        segmentType: playback.currentBranchType,
        hasBreakpoint: false,
        breakpoint: undefined,
        branchOptions: mainSegment.branchOptions,
      };
    } else {
      const mainSeg = mainSegments.find((m) => m.segmentNumber === playback.currentMainSegment);
      if (!mainSeg) return null;
      return {
        segmentNumber: mainSeg.segmentNumber,
        segmentType: undefined,
        hasBreakpoint: !!mainSeg.hasBreakpoint,
        breakpoint: mainSeg.breakpoint,
        branchOptions: mainSeg.branchOptions,
      };
    }
  }, [scenario, mainSegments, playback]);

  // Called by UI when a video ends
  const handleVideoEnded = useCallback(() => {
    // If scenario not loaded or already ended, do nothing
    if (!scenario || mainSegments.length === 0 || playback.hasEnded) return;

    // If currently at a breakpoint segment (main) -> pause and show UI
    if (!playback.currentBranchType) {
      const mainSeg = mainSegments.find((m) => m.segmentNumber === playback.currentMainSegment);
      if (!mainSeg) return;

      if (mainSeg.hasBreakpoint && mainSeg.breakpoint) {
        setPlayback((p) => ({
          ...p,
          isAtBreakpoint: true,
          currentBreakpoint: mainSeg.breakpoint,
          isPlaying: false,
        }));
        return;
      }
    }

    // If we are inside a branch currently, try to advance within the branch
    if (playback.currentBranchType) {
      // find how many segments this branch has
      const branchedFrom = playback.branchedFromMainSegment ?? playback.currentMainSegment;
      const parentMain = mainSegments.find((m) => m.segmentNumber === branchedFrom);
      if (!parentMain) return;
      const branchMeta = parentMain.branchOptions?.find((b) => b.type === playback.currentBranchType);
      const branchTotal = branchMeta?.segments ?? 0;

      const nextBranchIndex = playback.currentBranchIndex + 1;
      if (nextBranchIndex <= branchTotal) {
        // play next branch segment
        setPlayback((p) => ({
          ...p,
          currentBranchIndex: nextBranchIndex,
        }));
        // request segment from parent: branch segment numbering is 1..N
        onSegmentChange(nextBranchIndex, playback.currentBranchType);
        return;
      } else {
        // Branch is finished -> resume main at next main segment after branchedFrom
        const resumeMain = (playback.branchedFromMainSegment ?? playback.currentMainSegment) + 1;
        const nextMain = mainSegments.find((m) => m.segmentNumber === resumeMain);
        if (nextMain) {
          setPlayback((p) => ({
            ...p,
            currentMainSegment: nextMain.segmentNumber,
            currentBranchType: undefined,
            currentBranchIndex: 0,
            isAtBreakpoint: false,
            currentBreakpoint: undefined,
            isPlaying: true,
            branchedFromMainSegment: undefined,
          }));
          onSegmentChange(nextMain.segmentNumber, undefined);
          return;
        } else {
          // no next main segment => lesson finished
          setPlayback((p) => ({
            ...p,
            hasEnded: true,
            isPlaying: false,
          }));
          return;
        }
      }
    }

    // Normal main playback: advance main segment number by 1
    const nextMainNumber = playback.currentMainSegment + 1;
    const nextMain = mainSegments.find((m) => m.segmentNumber === nextMainNumber);
    if (nextMain) {
      setPlayback((p) => ({
        ...p,
        currentMainSegment: nextMain.segmentNumber,
      }));
      onSegmentChange(nextMain.segmentNumber, undefined);
      return;
    }

    // End of lesson
    setPlayback((p) => ({
      ...p,
      hasEnded: true,
      isPlaying: false,
    }));
  }, [scenario, mainSegments, playback, onSegmentChange]);

  // Called by UI when user answers a breakpoint question
  const handleBreakpointAnswer = useCallback((selectedOptionIndex: number) => {
    if (!scenario || mainSegments.length === 0) return;
    // current main segment metadata
    const mainSeg = mainSegments.find((m) => m.segmentNumber === playback.currentMainSegment);
    if (!mainSeg || !mainSeg.hasBreakpoint || !mainSeg.breakpoint) {
      // nothing to do
      setPlayback((p) => ({ ...p, isAtBreakpoint: false, currentBreakpoint: undefined }));
      return;
    }

    const option = mainSeg.breakpoint.options[selectedOptionIndex];
    if (!option) {
      // invalid selection -> just resume to next main
      setPlayback((p) => ({ ...p, isAtBreakpoint: false, currentBreakpoint: undefined }));
      // proceed like ended
      handleVideoEnded();
      return;
    }

    // If option maps to a branch type, start playing that branch
    if (option.branchTarget) {
      const branchType = option.branchTarget;
      // find how many segments branch has
      const branchMeta = mainSeg.branchOptions?.find((b) => b.type === branchType);
      const branchTotal = branchMeta?.segments ?? 0;

      if (branchTotal <= 0) {
        // No branch content -> continue to next main
        setPlayback((p) => ({
          ...p,
          isAtBreakpoint: false,
          currentBreakpoint: undefined,
        }));
        handleVideoEnded();
        return;
      }

      // Start branch playback at index 1
      setPlayback((p) => ({
        ...p,
        currentBranchType: branchType,
        currentBranchIndex: 1,
        isAtBreakpoint: false,
        currentBreakpoint: undefined,
        isPlaying: true,
        branchedFromMainSegment: p.currentMainSegment,
      }));

      // Inform parent to fetch branch segment 1
      onSegmentChange(1, branchType);
      return;
    }

    // If option does not branch to some alternative, treat it as continuing main:
    setPlayback((p) => ({
      ...p,
      isAtBreakpoint: false,
      currentBreakpoint: undefined,
    }));
    // continue as if the main segment ended
    handleVideoEnded();
  }, [scenario, mainSegments, playback.currentMainSegment, onSegmentChange, handleVideoEnded]);

  // Reset playback
  const resetPlayback = useCallback(() => {
    setPlayback({
      currentMainSegment: 1,
      currentBranchType: undefined,
      currentBranchIndex: 0,
      isAtBreakpoint: false,
      currentBreakpoint: undefined,
      isPlaying: true,
      hasEnded: false,
      branchedFromMainSegment: undefined,
    });
    // request initial main segment
    onSegmentChange(1, undefined);
  }, [onSegmentChange]);

  // Expose metadata convenient for the UI
  const currentSegmentMetadata = useMemo<SegmentMetadata | null>(() => {
    if (!scenario || mainSegments.length === 0) return null;

    if (playback.currentBranchType) {
      // branch metadata is derived from the main segment we branched from
      const mainIdx = playback.branchedFromMainSegment ?? playback.currentMainSegment;
      const mainSeg = mainSegments.find((m) => m.segmentNumber === mainIdx);
      if (!mainSeg) return null;
      const branchMeta = mainSeg.branchOptions?.find((b) => b.type === playback.currentBranchType);
      return {
        segmentNumber: playback.currentBranchIndex,
        segmentType: playback.currentBranchType,
        hasBreakpoint: false,
        breakpoint: undefined,
        branchOptions: mainSeg.branchOptions ?? undefined,
      };
    } else {
      const mainSeg = mainSegments.find((m) => m.segmentNumber === playback.currentMainSegment);
      if (!mainSeg) return null;
      return {
        segmentNumber: mainSeg.segmentNumber,
        segmentType: undefined,
        hasBreakpoint: mainSeg.hasBreakpoint,
        breakpoint: mainSeg.breakpoint,
        branchOptions: mainSeg.branchOptions ?? undefined,
      };
    }
  }, [scenario, mainSegments, playback]);

  return {
    playbackState: playback,
    currentSegmentMetadata,
    scenarioLoaded: scenario !== null && mainSegments.length > 0,
    scenarioError,
    handleVideoEnded,
    handleBreakpointAnswer,
    resetPlayback,
  };
}