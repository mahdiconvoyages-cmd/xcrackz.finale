interface StepNavigationProps {
  currentStep: number;
  steps: {
    number: number;
    label: string;
    photoCount: number;
    isCompleted?: boolean;
  }[];
  onStepClick: (stepNumber: number) => void;
}

export default function StepNavigation({ currentStep, steps, onStepClick }: StepNavigationProps) {
  return (
    <div className="bg-white border-b border-[#CCFBF1] sticky top-0 z-20 shadow-sm">
      <div className="flex justify-around items-center py-3 px-4">
        {steps.map((step) => (
          <button
            key={step.number}
            onClick={() => onStepClick(step.number)}
            className={`
              flex flex-col items-center gap-1 transition-all
              ${currentStep === step.number ? 'scale-110' : 'opacity-70 hover:opacity-100'}
            `}
          >
            {/* Numéro de l'étape avec badge de comptage */}
            <div className="relative">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                  transition-colors
                  ${currentStep === step.number
                    ? 'bg-[#14B8A6] text-white shadow-lg'
                    : step.isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-[#CCFBF1] text-[#14B8A6]'
                  }
                `}
              >
                {step.number}
              </div>
              
              {/* Badge compteur de photos */}
              {step.photoCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-[#FF4D6D] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {step.photoCount}
                </div>
              )}
            </div>

            {/* Label de l'étape (toujours visible) */}
            <span className="text-xs text-[#2D2A3E] font-medium">
              {step.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
