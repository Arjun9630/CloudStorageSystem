import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute, AdminProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { MyFiles } from './pages/MyFiles';
import { Recent } from './pages/Recent';
import { Starred } from './pages/Starred';
import { Trash } from './pages/Trash';
import { AdminDashboard } from './pages/AdminDashboard';
export const router = createBrowserRouter([
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/signup',
        element: <Signup />,
    },
    {
        path: '/',
        element: (<ProtectedRoute>
        <Layout />
      </ProtectedRoute>),
        children: [
            {
                index: true,
                element: <Dashboard />,
            },
            {
                path: 'files',
                element: <MyFiles />,
            },
            {
                path: 'recent',
                element: <Recent />,
            },
            {
                path: 'starred',
                element: <Starred />,
            },
            {
                path: 'trash',
                element: <Trash />,
            },
            {
                path: 'admin',
                element: (<AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>),
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/" replace/>,
    },
]);
