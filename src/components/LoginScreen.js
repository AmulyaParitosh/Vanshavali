
import React from 'react';

const LoginScreen = ({ onLoginRequest }) => {
  return (
    <div className="no-access-container">
      <div className="no-access-content">
        <h2>Access Required</h2>
        <p>You do not have access to this family tree (vanshavali).</p>
        <p>You can request access from the administrator by logging in.</p>
        <button onClick={onLoginRequest} className="btn-primary">
          Login with Google to Request Access
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
