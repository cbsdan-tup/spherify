import React from 'react';
import PropTypes from 'prop-types';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Alert = ({ message, type }) => {
  React.useEffect(() => {
    if (message) {
      if (type === 'success') {
        toast.success(message, {
          position: "bottom-right",
          autoClose: 3000,
        });
      } else if (type === 'error') {
        toast.error(message, {
          position: "bottom-right",
          autoClose: 3000,
        });
      }
    }
  }, []);

  return (
    <>
    </>
  );
};

Alert.propTypes = {
  message: PropTypes.string.isRequired, 
  type: PropTypes.oneOf(['success', 'error']).isRequired,
};

export default Alert;
