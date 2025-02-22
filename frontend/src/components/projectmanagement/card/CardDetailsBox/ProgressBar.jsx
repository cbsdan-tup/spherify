import React from 'react';
import { ProgressBar as BProgressBar } from 'react-bootstrap';
import { motion } from 'framer-motion';

const ProgressBar = ({ card }) => {
  const total = card.subtasks?.length || 0;
  const completed = card.subtasks?.filter(task => task.isDone).length || 0;
  const percentage = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="progress-wrapper">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        transition={{ duration: 0.5 }}
      >
        <BProgressBar 
          now={percentage} 
          label={`${percentage}%`}
          variant={percentage === 100 ? 'success' : 'primary'}
        />
      </motion.div>
      <small className="text-muted mt-1">
        {completed} of {total} tasks completed
      </small>
    </div>
  );
};

export default ProgressBar;
