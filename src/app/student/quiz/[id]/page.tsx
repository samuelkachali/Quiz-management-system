import QuizTaker from '@/components/QuizTaker';

export default function TakeQuizPage({ params }: { params: { id: string } }) {
  return <QuizTaker quizId={params.id} />;
}
