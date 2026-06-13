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
import Patients from "./pages/Patients";
import Conversations from "./pages/Conversations";
import Followups from "./pages/Followups";
import Pipeline from "./pages/Pipeline";
import Reports from "./pages/Reports";
import CalendarPage from "./pages/CalendarPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Home from "./pages/Home";
import ClientPortal from "./pages/ClientPortal";
import ScrollToTop from "./components/ScrollToTop";
import { ThemeProvider } from "./components/ThemeContext";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
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
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/portal" element={<ClientPortal />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/painel" element={<Navigate to={session ? "/dashboard" : "/login"} />} />
        <Route path="/paiel" element={<Navigate to={session ? "/dashboard" : "/login"} />} />

        {/* Rotas Autenticadas */}
        <Route element={session ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/follow-ups" element={<Followups />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/config" element={<ConfigPage />} />
        </Route>

        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
