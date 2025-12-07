import React from 'react';
import { BLUR, ANIMATION, Z_INDEX } from '../design-tokens';

export interface OverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  closeOnBackdropClick?: boolean;
  className?: string;
}

export const Overlay: React.FC<OverlayProps> = ({
  isOpen,
  onClose,
  children,
  closeOnBackdropClick = true,
  className = ''
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`
        fixed inset-0 ${Z_INDEX.modal}
        flex items-center justify-center
        bg-black/80 ${BLUR.strong}
        ${ANIMATION.fadeInUp}
        ${className}
      `}
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative"
      >
        {children}
      </div>
    </div>
  );
};

export default Overlay;
