import { MathQuiz } from "./MathQuiz";

export const metadata = {
  title: "Maths au poker",
};

// Pure client-side maths — no range data to load, unlike the other quizzes.
export default function MathPage() {
  return <MathQuiz />;
}
