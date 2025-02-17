import React from 'react';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import Subtask from './Subtask';
import SubtaskForm from './SubtaskForm';

const Checklist = ({ cardId, subtasks }) => {
  const dispatch = useDispatch();

  return (
    <div className="checklist mt-3">
      <h6>Checklist</h6>
      <AnimatePresence>
        {subtasks.map((subtask) => (
          <motion.div
            key={subtask._id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Subtask subtask={subtask} />
          </motion.div>
        ))}
      </AnimatePresence>
      <SubtaskForm cardId={cardId} />
    </div>
  );
};

export default Checklist;
