interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export default function ProgressBar({ currentStep, totalSteps, steps }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="mb-8">
      <div className="flex justify-between mb-4">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex-1 text-center transition-all duration-300 ${
              index < currentStep
                ? 'text-teal-600 font-bold'
                : index === currentStep
                ? 'text-teal-500 font-bold scale-110'
                : 'text-slate-400'
            }`}
          >
            <div
              className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                index < currentStep
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/50'
                  : index === currentStep
                  ? 'bg-gradient-to-br from-teal-400 to-cyan-400 text-white shadow-xl shadow-teal-500/60 animate-pulse'
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              {index + 1}
            </div>
            <p className="text-xs hidden sm:block">{step}</p>
          </div>
        ))}
      </div>

      <div className="relative w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500 shadow-lg shadow-teal-500/50"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
