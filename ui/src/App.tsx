import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.tsx';
import ToastContainer from './components/ToastContainer.tsx';
import Dashboard from './pages/Dashboard.tsx';
import AgentsPage from './pages/AgentsPage.tsx';
import WorkflowRunner from './pages/WorkflowRunner.tsx';
import RunHistory from './pages/RunHistory.tsx';
import RisksPage from './pages/RisksPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import { useToast } from './hooks/useToast.ts';

export default function App() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workflows" element={<WorkflowRunner />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/runs" element={<RunHistory />} />
          <Route path="/runs/:id" element={<RunHistory />} />
          <Route path="/risks" element={<RisksPage />} />
          <Route path="/security" element={<RisksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
