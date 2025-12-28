import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import MedicalRequests from './pages/MedicalRequests';
import MasterData from './pages/MasterData';
import Reports from './pages/Reports';
import Backup from './pages/Backup';
import ActivityLog from './pages/ActivityLog';
import Help from './pages/Help';
import Settings from './pages/Settings';
import DatabaseManagement from './pages/DatabaseManagement';
import Handover from './pages/Handover';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/requests" element={<MedicalRequests />} />
        <Route path="/handover" element={<Handover />} />
        <Route path="/master" element={<MasterData />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/backup" element={<Backup />} />
        <Route path="/activity-log" element={<ActivityLog />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/database" element={<DatabaseManagement />} />
        <Route path="/help" element={<Help />} />
      </Routes>
    </Router>
  );
}

export default App;
