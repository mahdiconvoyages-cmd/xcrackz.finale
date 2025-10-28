import { Copy, Share2, Check } from 'lucide-react';
import { useState } from 'react';
import { copyShareCode, shareMission } from '../lib/shareCode';

interface MissionShareCodeBadgeProps {
  code: string;
  missionTitle?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function MissionShareCodeBadge({ 
  code, 
  missionTitle, 
  size = 'md',
  showLabel = true 
}: MissionShareCodeBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la propagation au parent
    const success = await copyShareCode(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await shareMission(code, missionTitle);
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-xs text-gray-500 font-medium">Code:</span>
      )}
      
      <div className="flex items-center gap-1 bg-cyan-50 border border-cyan-200 rounded-lg overflow-hidden">
        {/* Code Display */}
        <div className={`font-mono font-bold text-cyan-700 ${sizeClasses[size]}`}>
          {code}
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          title="Copier le code"
          className={`${sizeClasses[size]} bg-cyan-100 hover:bg-cyan-200 text-cyan-700 transition-colors flex items-center justify-center border-l border-cyan-200`}
        >
          {copied ? (
            <Check className={`${iconSizes[size]} text-green-600`} />
          ) : (
            <Copy className={iconSizes[size]} />
          )}
        </button>

        {/* Share Button (optionnel, seulement sur md et lg) */}
        {size !== 'sm' && (
          <button
            onClick={handleShare}
            title="Partager"
            className={`${sizeClasses[size]} bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors flex items-center justify-center border-l border-cyan-200`}
          >
            <Share2 className={iconSizes[size]} />
          </button>
        )}
      </div>
    </div>
  );
}
