import React from "react";

const PendingApprovalScreen = ({ onLogout }) => {
  return (
    <div className="pending-approval-screen">
      <h2>Your request is pending approval.</h2>
      <p>
        An administrator will review your request soon. Thank you for your
        patience.
      </p>
      <button onClick={onLogout} className="btn btn-secondary">
        Logout
      </button>
    </div>
  );
};

export default PendingApprovalScreen;
