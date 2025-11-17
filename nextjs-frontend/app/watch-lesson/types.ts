// TypeScript types for lesson scenario structure

export interface ImageData {
  url?: string;
  prompt?: string;
  base64?: string;
}

export interface DialogueLine {
  role: string;
  dialogue: string;
  image?: ImageData;
}

export interface BranchOption {
  type: string;
  dialogue: DialogueLine[];
}

export interface BreakpointOption {
  text: string;
  isCorrect: boolean;
  branchTarget?: string; // name or index of branch to go to
}

export interface BreakpointQuestion {
  question: string;
  options: BreakpointOption[];
}

export interface ScriptBlock {
  role?: string;
  dialogue?: string;
  branch_options?: BranchOption[];
  image?: ImageData;
  breakpoint?: BreakpointQuestion;
}

export interface Scenario {
  title: string;
  script: ScriptBlock[];
}

export interface LessonScenarioResponse {
  lesson_id: string;
  title: string;
  scenario: Scenario;
}

// Internal state types for playback management
export interface PlaybackState {
  currentSegmentNumber: number;
  currentSegmentType?: string; // "main", "option_A", "option_B", etc.
  isAtBreakpoint: boolean;
  currentBreakpoint?: BreakpointQuestion;
  scriptBlockIndex: number; // Which script block we're currently on
  isPlaying: boolean;
  hasEnded: boolean;
  branchedFromSegmentNumber?: number; // Track which main segment we branched from
}

export interface SegmentMetadata {
  segmentNumber: number;
  segmentType?: string;
  hasBreakpoint: boolean;
  breakpoint?: BreakpointQuestion;
  branchOptions?: BranchOption[];
}
