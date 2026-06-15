import React from "react";

interface LoginScreenProps {
  onLoginRequest: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginRequest }) => {
  return (
    <div className="login-screen">
      <div className="login-content">
        <h2>Access Required</h2>
        <p>
          You do not have access to this vanshavali. You can request access from the administrator
          by logging in.
        </p>
        <button onClick={onLoginRequest} className="btn btn-primary">
          Login with Google to Request Access
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
