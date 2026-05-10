import React from 'react';

const SimpleApp = () => {
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
      fontFamily: 'Arial, sans-serif',
      margin: 0,
      padding: 0
    }}>
      <h1 style={{ fontSize: '3em', marginBottom: '20px' }}>🔐 PINIT Vault</h1>
      <div style={{
        background: 'rgba(0,0,0,0.3)',
        padding: '30px',
        borderRadius: '20px',
        textAlign: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ fontSize: '1.5em', marginBottom: '15px' }}>React App Working!</h2>
        <p style={{ fontSize: '1.2em', margin: '10px 0' }}>✅ Web View: Functional</p>
        <p style={{ fontSize: '1.2em', margin: '10px 0' }}>⚛️ React: Rendering</p>
        <p style={{ fontSize: '1.2em', margin: '10px 0' }}>📱 Capacitor: Connected</p>
        <p style={{ fontSize: '1.2em', margin: '10px 0' }}>🚀 Ready for Full App</p>
      </div>
    </div>
  );
};

export default SimpleApp;
