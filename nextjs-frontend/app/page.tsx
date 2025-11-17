import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brain, Video, BookOpen } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="flex flex-col items-center px-8 py-20">
        
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-gray-900 dark:text-white">
            Edpulse: AI-Powered Lesson Video Creation
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mb-10">
            Turn PDFs, outlines, and teaching scenarios into fully narrated, 
            branching educational videos - complete with AI speech, visuals, and interactivity.
            Built for educators. Designed for learners. Powered by AI.
          </p>

          <div className="flex gap-4">
            <Link href="/login">
              <Button className="rounded-xl bg-lime-400 text-black hover:bg-lime-500 px-6 py-3 text-lg">
                Log In
              </Button>
            </Link>

            <Link href="/register">
              <Button
                variant="outline"
                className="rounded-xl border-gray-900 dark:border-white dark:text-white text-gray-900 px-6 py-3 text-lg hover:bg-gray-800 hover:text-white"
              >
                Sign Up
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          <FeatureCard
            icon={<Brain className="h-10 w-10 text-lime-500" />}
            title="AI-Generated Scripts"
            desc="Upload a PDF or outline and Edpulse transforms it into a structured, high-quality teaching script."
          />

          <FeatureCard
            icon={<Video className="h-10 w-10 text-lime-500" />}
            title="Automatic Video Creation"
            desc="Your script becomes a narrated, image-driven MP4 video - broken into segments for branching and flexibility."
          />

          <FeatureCard
            icon={<BookOpen className="h-10 w-10 text-lime-500" />}
            title="Branching Lessons"
            desc="Build interactive decision points that adapt the learner’s path, encouraging deeper engagement."
          />
        </section>

        {/* Secondary Section */}
        <section className="mt-24 w-full max-w-4xl text-center">
          <div className="rounded-2xl bg-white dark:bg-gray-800 shadow p-10">
            <h2 className="text-3xl font-semibold mb-4 text-gray-900 dark:text-white">
              Designed for Educators. Powered by AI.
            </h2>

            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Whether you're training nurses, teaching communication skills, or 
              creating interactive scenarios, Edpulse provides the tools to 
              create engaging, emotionally intelligent lessons - without needing 
              editing software, actors, or expensive equipment.
            </p>

            <Link href="/register">
              <Button className="rounded-xl bg-lime-400 text-black hover:bg-lime-500 px-6 py-3 text-lg">
                Start Creating
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 shadow p-6 text-center flex flex-col items-center">
      <div className="mb-4">{icon}</div>
      <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">{desc}</p>
    </div>
  );
}
