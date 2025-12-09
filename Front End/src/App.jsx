import { useState } from 'react'
import './App.css'

const API_BASE_URL = 'http://localhost:5000'

function App() {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [answers, setAnswers] = useState({})
  const [score, setScore] = useState(null)
  const [currentStep, setCurrentStep] = useState('input') // 'input' | 'quiz' | 'results'

  const handleGenerateQuiz = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL')
      return
    }

    setLoading(true)
    setError(null)
    setQuestions(null)
    setAnswers({})
    setScore(null)

    try {
      // Step 1: Get transcript
      const transcriptRes = await fetch(`${API_BASE_URL}/api/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl }),
      })

      if (!transcriptRes.ok) {
        const errData = await transcriptRes.json()
        throw new Error(errData.error || 'Failed to get transcript')
      }

      const { transcript } = await transcriptRes.json()

      // Step 2: Generate quiz
      const quizRes = await fetch(`${API_BASE_URL}/api/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, maxQuestions: 5 }),
      })

      if (!quizRes.ok) {
        const errData = await quizRes.json()
        throw new Error(errData.error || 'Failed to generate quiz')
      }

      const { questions: generatedQuestions } = await quizRes.json()
      setQuestions(generatedQuestions)
      setCurrentStep('quiz')
    } catch (err) {
      setError(err.message || 'Something went wrong')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId, selectedOption) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: selectedOption,
    }))
  }

  const handleSubmitQuiz = async () => {
    if (!questions) return

    // Check if all questions are answered
    const unanswered = questions.filter((q) => !answers[q.id])
    if (unanswered.length > 0) {
      setError(`Please answer all ${questions.length} questions`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const scoreRes = await fetch(`${API_BASE_URL}/api/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions, answers }),
      })

      if (!scoreRes.ok) {
        const errData = await scoreRes.json()
        throw new Error(errData.error || 'Failed to score quiz')
      }

      const scoreData = await scoreRes.json()
      setScore(scoreData)
      setCurrentStep('results')
    } catch (err) {
      setError(err.message || 'Failed to submit quiz')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setYoutubeUrl('')
    setQuestions(null)
    setAnswers({})
    setScore(null)
    setError(null)
    setCurrentStep('input')
  }

  return (
    <div className="min-h-screen bg-gray-700 text-slate-100 flex flex-col">
      {/* NAVBAR */}
      <nav className="w-full border-b border-slate-800 bg-gray-900 backdrop-blur">
        <div className="w-full mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-sm font-bold">
              Q
            </div>
            <span className="font-semibold text-lg tracking-tight">Quizify</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <button className="hidden sm:inline-block px-4 py-1.5 rounded-lg border border-slate-600 hover:border-slate-300 hover:bg-slate-900 transition">
              Login
            </button>
            <button className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 font-medium transition">
              Register
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="grow w-full">
        <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-12">
          {/* HEADER SECTION */}
          {currentStep === 'input' && (
            <section>
              <p className="text-xl uppercase tracking-[0.25em] text-blue-400 mb-3">
                Turn videos into practice
              </p>

              <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
                Convert any <span className="text-blue-400">YouTube video</span> into a quiz in seconds.
              </h1>

              <p className="text-slate-300 mb-8 max-w-lg">
                Paste a YouTube link, and we'll generate smart questions so you can revise,
                practice, or test your understanding instantly.
              </p>
            </section>
          )}

          {/* INPUT SECTION */}
          {currentStep === 'input' && (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl shadow-blue-500/10">
              <label className="block text-xs font-medium text-slate-400 mb-2">
                YOUTUBE LINK
              </label>

              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleGenerateQuiz()
                  }
                }}
              />

              {error && (
                <div className="mt-3 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerateQuiz}
                disabled={loading}
                className="mt-4 w-full px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 
                         font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating Quiz...' : 'Convert to Quiz'}
              </button>

              <p className="mt-3 text-xs text-slate-400">
                We'll extract key concepts, generate MCQs, and create a quiz you can share.
              </p>
            </section>
          )}

          {/* QUIZ SECTION */}
          {currentStep === 'quiz' && questions && (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Quiz Questions</h2>
                <button
                  onClick={handleReset}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  Start Over
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                {questions.map((q) => (
                  <div key={q.id} className="border-b border-slate-800 pb-6 last:border-0">
                    <h3 className="text-lg font-semibold mb-4">
                      {q.id}. {q.question}
                    </h3>
                    <div className="space-y-2">
                      {q.options.map((option, idx) => (
                        <label
                          key={idx}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition
                            ${
                              answers[q.id] === option
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-slate-700 hover:border-slate-600 bg-slate-950'
                            }`}
                        >
                          <input
                            type="radio"
                            name={`question-${q.id}`}
                            value={option}
                            checked={answers[q.id] === option}
                            onChange={() => handleAnswerChange(q.id, option)}
                            className="w-4 h-4 text-blue-500"
                          />
                          <span className="flex-1">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubmitQuiz}
                disabled={loading || Object.keys(answers).length !== questions.length}
                className="mt-6 w-full px-5 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 
                         font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </section>
          )}

          {/* RESULTS SECTION */}
          {currentStep === 'results' && score && (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Quiz Results</h2>
                <div className="text-5xl font-bold text-blue-400 mb-2">
                  {score.correct}/{score.total}
                </div>
                <p className="text-slate-400">
                  {((score.correct / score.total) * 100).toFixed(0)}% Correct
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {score.details.map((detail) => (
                  <div
                    key={detail.id}
                    className={`p-4 rounded-lg border ${
                      detail.isCorrect
                        ? 'border-green-700 bg-green-900/20'
                        : 'border-red-700 bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span
                        className={`text-xl ${detail.isCorrect ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {detail.isCorrect ? '✓' : '✗'}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold mb-1">{detail.question}</p>
                        <p className="text-sm text-slate-300">
                          <span className="text-green-400">Correct:</span> {detail.correctAnswer}
                        </p>
                        {!detail.isCorrect && (
                          <p className="text-sm text-slate-300 mt-1">
                            <span className="text-red-400">Your answer:</span> {detail.userAnswer || 'Not answered'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleReset}
                className="w-full px-5 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 font-medium transition"
              >
                Create New Quiz
              </button>
            </section>
          )}

          {/* HOW IT WORKS SECTION (only show on input step) */}
          {currentStep === 'input' && (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg text-blue-500 font-semibold mb-3">How it works</h2>
              <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
                <li>Paste any public YouTube video link.</li>
                <li>Our engine analyzes the content and key moments.</li>
                <li>We generate multiple-choice questions and answers.</li>
                <li>Review, edit, and share your quiz with others.</li>
              </ol>
            </section>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-slate-200 flex justify-between items-center">
          <span>© {new Date().getFullYear()} Quizify. All rights reserved.</span>
          <span className="hidden sm:inline">Built to make learning from videos smarter.</span>
        </div>
      </footer>
    </div>
  )
}

export default App



