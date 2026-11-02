import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: '0.625rem',
    paddingRight: '0.625rem',
  },
  animate: (isSelected) => ({
    gap: isSelected ? '0.5rem' : 0,
    paddingLeft: isSelected ? '0.875rem' : '0.625rem',
    paddingRight: isSelected ? '0.875rem' : '0.625rem',
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: 'auto', opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { type: 'spring', bounce: 0, duration: 0.4 };

/**
 * Componente ExpandableActionButton
 * Baseado na animação do ExpandableTabs:
 * - Em repouso (fechado): exibe apenas o ícone centralizado com dimensões compactas.
 * - Ao clicar (aberto/ativo): expande suavemente com spring animation revelando o texto completo.
 */
export const ExpandableActionButton = ({
  icon: Icon,
  label,
  isOpen = false,
  onClick,
  badge = null,
  activeColor = 'border-[#0D223A] bg-[#0D223A] text-white shadow-xs',
  inactiveColor = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-2xs',
  className = '',
  title = '',
}) => {
  return (
    <motion.button
      type="button"
      variants={buttonVariants}
      initial={false}
      animate="animate"
      custom={isOpen}
      onClick={onClick}
      transition={transition}
      title={title || label}
      className={cn(
        'relative inline-flex h-9 sm:h-10 items-center justify-center rounded-xl border text-xs font-semibold select-none cursor-pointer transition-colors duration-200',
        isOpen ? activeColor : inactiveColor,
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.span
            variants={spanVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            className="overflow-hidden whitespace-nowrap leading-none"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {badge}
    </motion.button>
  );
};

export default ExpandableActionButton;

