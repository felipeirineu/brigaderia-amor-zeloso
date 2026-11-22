import './zod-csp';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import '@fontsource/dm-serif-display/400.css';
import '@fontsource-variable/figtree/wght.css';
import './styles.css';
import './theme.css';

ReactDOM.createRoot(document.getElementById('root')!, {
  // A barreira de tela registra os campos permitidos, sem mensagem ou pilha.
  onCaughtError: () => {},
}).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
