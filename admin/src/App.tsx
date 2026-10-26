import { BrowserRouter } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { AppRouter } from './router/AppRouter';

export function App() {
  return <BrowserRouter>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </BrowserRouter>;
}
