import React from 'react';

const Loading = ({ text }) => {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <div className="loading-text">{text || 'Loading...'}</div>
    </div>
  );
};

export default Loading;
