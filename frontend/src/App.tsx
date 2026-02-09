import { useState, useEffect } from "react";
import { PinPad } from "./components/PinPad";
import { DownloadForm } from "./components/DownloadForm";
import { checkAuth } from "./api";

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth().then(setAuthenticated);
  }, []);

  // Loading state while checking auth
  if (authenticated === null) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {authenticated ? (
        <DownloadForm />
      ) : (
        <PinPad onSuccess={() => setAuthenticated(true)} />
      )}
    </div>
  );
}
