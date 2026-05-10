import React from 'react';
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Simple diagnostic components to isolate black screen issue
const DiagnosticIndex = () => {
  React.useEffect(() => {
    console.log('🔍 DiagnosticIndex: Component mounted');
    setTimeout(() => {
      console.log('🔄 DiagnosticIndex: Redirecting to login...');
      window.location.href = '/login';
    }, 2000);
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '3em', marginBottom: '20px' }}>🔐 PINIT VAULT</h1>
      <p style={{ fontSize: '1.2em', marginBottom: '10px' }}>Diagnostic Mode</p>
      <p style={{ fontSize: '1em', opacity: 0.7 }}>Testing component loading...</p>
    </div>
  );
};

const DiagnosticLogin = () => {
  React.useEffect(() => {
    console.log('🔍 DiagnosticLogin: Component mounted');
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '3em', marginBottom: '20px' }}>🔐 Login</h1>
      <p style={{ fontSize: '1.2em', marginBottom: '20px' }}>Diagnostic Login Page</p>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '20px',
        borderRadius: '10px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '1em', margin: '10px 0' }}>✅ React Router Working</p>
        <p style={{ fontSize: '1em', margin: '10px 0' }}>✅ Components Rendering</p>
        <p style={{ fontSize: '1em', margin: '10px 0' }}>🔍 Testing biometric components...</p>
      </div>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<DiagnosticIndex />} />
      <Route path="/login" element={<DiagnosticLogin />} />
      <Route path="*" element={<DiagnosticLogin />} />
    </Routes>
  </BrowserRouter>
);

export default App;
