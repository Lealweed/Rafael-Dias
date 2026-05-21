/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { createClient } from "./lib/supabase/client";

// Pages
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ConfigPage from "./pages/Config";
import Layout from "./components/Layout";
import Leads from "./pages/Leads";
import Conversations from "./pages/Conversations";
import Followups from "./pages/Followups";
import Pipeline from "./pages/Pipeline";
import Reports from "./pages/Reports";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const isMock = localStorage.getItem("mock_session") === "true";
    if (isMock) {
      setSession({ user: { id: "5f85d5ef-eccf-475c-b6e8-d732509f6799", email: "leal@adm.com", role: "admin" } });
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-gray-500 font-medium">Carregando CRM...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        
        {/* Rotas Autenticadas */}
        <Route element={session ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/follow-ups" element={<Followups />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
