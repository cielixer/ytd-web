import { useState, useCallback, useEffect } from "react";

interface PinPadProps {
  onSuccess: () => void;
}

export function PinPad({ onSuccess }: PinPadProps) {
  const [digits, setDigits] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((s) => {
        if (s <= 1) {
          setError("");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleDigit = useCallback(
    (digit: string) => {
      if (loading || lockoutSeconds > 0) return;
      setError("");

      const newDigits = digits + digit;
      setDigits(newDigits);

      // Auto-submit when 4 digits entered
      if (newDigits.length === 4) {
        submitPin(newDigits);
      }
    },
    [digits, loading, lockoutSeconds],
  );

  const handleBackspace = useCallback(() => {
    if (loading || lockoutSeconds > 0) return;
    setDigits((d) => d.slice(0, -1));
    setError("");
  }, [loading, lockoutSeconds]);

  const submitPin = async (pin: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (res.ok && data.authenticated) {
        onSuccess();
        return;
      }

      if (res.status === 429 && data.lockoutSeconds) {
        setLockoutSeconds(data.lockoutSeconds);
        setError(`Locked for ${data.lockoutSeconds}s`);
      } else {
        setError("Wrong PIN");
      }

      triggerShake();
      setDigits("");
    } catch {
      setError("Connection error");
      triggerShake();
      setDigits("");
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const isLocked = lockoutSeconds > 0;

  return (
    <div className="pin-container">
      <div className="pin-title">Enter PIN</div>

      {/* Dot indicators */}
      <div className={`pin-dots ${shake ? "shake" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`pin-dot ${i < digits.length ? "filled" : ""} ${
              error && digits.length === 0 ? "error" : ""
            }`}
          />
        ))}
      </div>

      {/* Error / lockout message */}
      <div className="pin-message">
        {isLocked
          ? `Locked for ${lockoutSeconds}s`
          : error
            ? error
            : "\u00A0"}
      </div>

      {/* Numeric keypad */}
      <div className="pin-grid">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            className="pin-btn"
            onClick={() => handleDigit(d)}
            disabled={isLocked || loading || digits.length >= 4}
            type="button"
          >
            {d}
          </button>
        ))}

        {/* Empty cell */}
        <div className="pin-btn-placeholder" />

        <button
          className="pin-btn"
          onClick={() => handleDigit("0")}
          disabled={isLocked || loading || digits.length >= 4}
          type="button"
        >
          0
        </button>

        {/* Backspace */}
        <button
          className="pin-btn pin-btn-back"
          onClick={handleBackspace}
          disabled={isLocked || loading || digits.length === 0}
          type="button"
          aria-label="Backspace"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </button>
      </div>

      {loading && <div className="pin-loading">Verifying...</div>}
    </div>
  );
}
