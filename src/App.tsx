import React from 'react';
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Simple Index component test
const SimpleIndex = () => {
  React.useEffect(() => {
    console.log('SimpleIndex component mounted');
    setTimeout(() => {
      console.log('Redirecting to login...');
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
      <h1 style={{ fontSize: '3em', marginBottom: '20px' }}>� PINIT VAULT</h1>
      <p style={{ fontSize: '1.2em', marginBottom: '10px' }}>Loading...</p>
      <p style={{ fontSize: '1em', opacity: 0.7 }}>Redirecting to login...</p>
    </div>
  );
};

// Simple Login component test
const SimpleLogin = () => {
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
      <p style={{ fontSize: '1.2em', marginBottom: '20px' }}>Biometric Login Ready</p>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '20px',
        borderRadius: '10px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '1em', margin: '10px 0' }}>✅ React Router Working</p>
        <p style={{ fontSize: '1em', margin: '10px 0' }}>✅ Components Rendering</p>
        <p style={{ fontSize: '1em', margin: '10px 0' }}>🚀 Ready for Full App</p>
      </div>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<SimpleIndex />} />
      <Route path="/login" element={<SimpleLogin />} />
      <Route path="*" element={<SimpleLogin />} />
    </Routes>
  </BrowserRouter>
);

export default App;
