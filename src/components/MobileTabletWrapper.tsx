import { ReactNode } from 'react';

interface MobileTabletWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper qui définit les dimensions pour mobile et tablette
 * Desktop (>1024px) : affichage normal pleine largeur
 * Mobile/Tablette (≤1024px) : 772px x 795px centrée
 */
export default function MobileTabletWrapper({ children }: MobileTabletWrapperProps) {
  return (
    <div className="lg:w-full">
      <div className="max-lg:w-[772px] max-lg:h-[795px] max-lg:mx-auto max-lg:overflow-auto">
        {children}
      </div>
    </div>
  );
}
