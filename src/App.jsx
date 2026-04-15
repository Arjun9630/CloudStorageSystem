import { RouterProvider } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { StorageProvider } from './contexts/StorageContext';
import { router } from './routes';
import { ToastProvider } from './contexts/ToastContext';

export default function App() {
    return (
      <ToastProvider>
        <AuthProvider>
          <StorageProvider>
            <RouterProvider router={router}/>
          </StorageProvider>
        </AuthProvider>
      </ToastProvider>
    );
}
