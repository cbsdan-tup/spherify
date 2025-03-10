import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "../../index.css";

const OtpVerification = ({ userId, email, onSuccess }) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const inputs = useRef([]);

  useEffect(() => {
    // Focus on first input on component mount
    if (inputs.current[0]) {
      inputs.current[0].focus();
    }
    
    // Start resend timer
    let timer;
    if (resendDisabled) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setResendDisabled(false);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      clearInterval(timer);
    };
  }, [resendDisabled]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    
    // Only accept numbers
    if (!/^\d*$/.test(value)) return;
    
    // Update the OTP array
    const newOtp = [...otp];
    newOtp[index] = value.substring(0, 1);
    setOtp(newOtp);
    
    // Auto-focus next input if value is entered
    if (value && index < 5 && inputs.current[index + 1]) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Handle backspace to clear current field and focus previous
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0 && inputs.current[index - 1]) {
        inputs.current[index - 1].focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();
    
    // Check if pasted content is a 6-digit number
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split("");
      setOtp(digits);
      
      // Focus the last input
      if (inputs.current[5]) {
        inputs.current[5].focus();
      }
    }
  };

  const handleVerify = async () => {
    const otpValue = otp.join("");
    
    // Check if OTP is complete (6 digits)
    if (otpValue.length !== 6) {
      toast.error("Please enter the complete 6-digit code", {
        position: "bottom-right",
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API}/verify-otp`, {
        userId,
        otp: otpValue
      });
      
      if (response.data.success) {
        onSuccess();
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      const errorMessage = error.response?.data?.message || "Failed to verify OTP";
      toast.error(errorMessage, {
        position: "bottom-right",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API}/resend-otp`, {
        userId
      });
      
      if (response.data.success) {
        toast.success("A new verification code has been sent to your email", {
          position: "bottom-right",
        });
        
        // Reset the OTP input fields
        setOtp(["", "", "", "", "", ""]);
        if (inputs.current[0]) {
          inputs.current[0].focus();
        }
        
        // Reset the timer
        setTimeLeft(60);
        setResendDisabled(true);
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast.error("Failed to resend verification code", {
        position: "bottom-right",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-verification-container">
      <div className="otp-verification-card">
        <div className="otp-header">
          <h2>Email Verification</h2>
          <div className="otp-animation">
            <div className="envelope">
              <div className="paper">
                <span>✓</span>
              </div>
            </div>
          </div>
        </div>
        
        <p>
          We've sent a verification code to <strong>{email}</strong>
        </p>
        
        <div className="otp-input-group">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => inputs.current[index] = el}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={index === 0 ? handlePaste : null}
              className="otp-input"
              disabled={loading}
            />
          ))}
        </div>
        
        <button 
          className="verify-button"
          onClick={handleVerify}
          disabled={loading}
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
        
        <div className="resend-container">
          <p>
            Didn't receive the code? {" "}
            {resendDisabled ? (
              <span>Resend in {timeLeft}s</span>
            ) : (
              <button 
                className="resend-button" 
                onClick={handleResendOtp}
                disabled={loading}
              >
                Resend
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
