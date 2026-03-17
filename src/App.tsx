import { RouterProvider } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { StorageProvider } from './contexts/StorageContext';
import { router } from './routes';

export default function App() {
  return (
    <AuthProvider>
      <StorageProvider>
        <RouterProvider router={router} />
      </StorageProvider>
    </AuthProvider>
  );
}
