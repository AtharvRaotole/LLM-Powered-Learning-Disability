import './App.css';
import { UserProvider } from './Store/UserContext';
import { AuthProvider } from './Store/AuthContext';
import { ThemeProvider } from './Store/ThemeContext';
import UserDisplay from './Components/UserDisplay';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/*',
    element: <UserDisplay />
  }
]);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <RouterProvider router={router} />
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
