import { motion } from 'framer-motion';

const Card = ({ children, className = '', animate = true, delay = 0, onClick, noPadding = false }) => {
  const cardClasses = `bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ease-out border border-white/50 ${
    !noPadding ? 'p-5' : ''
  } ${
    onClick ? 'cursor-pointer hover:scale-[1.02] hover:border-primary-200' : ''
  } ${className}`;

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: 'easeOut' }}
        className={cardClasses}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={cardClasses} onClick={onClick}>
      {children}
    </div>
  );
};

export default Card;
