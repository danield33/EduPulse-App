import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BreakpointQuestion } from "./types";

interface BreakpointOverlayProps {
  breakpoint: BreakpointQuestion;
  onAnswerSelected: (optionIndex: number) => void;
  showCorrectAnswer?: boolean;
}

export function BreakpointOverlay({
  breakpoint,
  onAnswerSelected,
  showCorrectAnswer = false,
}: BreakpointOverlayProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleOptionClick = (index: number) => {
    if (!hasSubmitted) {
      setSelectedIndex(index);
    }
  };

  const handleSubmit = () => {
    if (selectedIndex !== null) {
      setHasSubmitted(true);

      // Wait a moment to show feedback, then proceed
      setTimeout(() => {
        onAnswerSelected(selectedIndex);
      }, 1500);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Question</CardTitle>
          <CardDescription className="text-lg mt-2">{breakpoint.question}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {breakpoint.options.map((option, index) => {
              const isSelected = selectedIndex === index;
              const isCorrect = option.isCorrect;
              const showFeedback = hasSubmitted && showCorrectAnswer;

              let buttonVariant: "default" | "outline" | "destructive" | "secondary" = "outline";
              let additionalClasses = "";

              if (showFeedback) {
                if (isCorrect && isSelected) {
                  buttonVariant = "default";
                  additionalClasses = "bg-green-600 hover:bg-green-700 border-green-600";
                } else if (!isCorrect && isSelected) {
                  buttonVariant = "destructive";
                } else if (isCorrect) {
                  buttonVariant = "secondary";
                  additionalClasses = "bg-green-100 border-green-500 text-green-900";
                }
              } else if (isSelected) {
                buttonVariant = "default";
              }

              return (
                <Button
                  key={index}
                  variant={buttonVariant}
                  className={`w-full text-left justify-start h-auto py-4 px-6 ${additionalClasses}`}
                  onClick={() => handleOptionClick(index)}
                  disabled={hasSubmitted}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option.text}</span>
                    {showFeedback && isCorrect && (
                      <span className="flex-shrink-0 text-green-600">✓</span>
                    )}
                    {showFeedback && !isCorrect && isSelected && (
                      <span className="flex-shrink-0 text-red-600">✗</span>
                    )}
                  </span>
                </Button>
              );
            })}
          </div>

          {!hasSubmitted && (
            <Button
              onClick={handleSubmit}
              disabled={selectedIndex === null}
              className="w-full"
              size="lg"
            >
              Submit Answer
            </Button>
          )}

          {hasSubmitted && (
            <div className="text-center text-sm text-muted-foreground">
              {showCorrectAnswer && selectedIndex !== null && breakpoint.options[selectedIndex].isCorrect
                ? "Correct! Continuing..."
                : showCorrectAnswer
                ? "Continuing to next segment..."
                : "Continuing..."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
