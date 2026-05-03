import type React from "react";

interface ToastProps {
  message: React.ReactNode;
}

const Toast = ({ message }: ToastProps) => {
  return <div className="toast-notification">{message}</div>;
};

export default Toast;
