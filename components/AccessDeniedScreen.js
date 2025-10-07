import React from "react";

const AccessDeniedScreen = ({ onLogout }) => {
  return (
    <div className="access-denied-screen">
      <h2>Access Denied</h2>
      <p>
        Your access request has been denied. Please contact an administrator if
        you believe this is a mistake.
      </p>
      <button onClick={onLogout} className="btn btn-secondary">
        Logout
      </button>
    </div>
  );
};

export default AccessDeniedScreen;
