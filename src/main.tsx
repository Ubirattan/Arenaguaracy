import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SetupRequiredPage } from "@/pages/SetupRequiredPage";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isSupabaseConfigured ? <App /> : <SetupRequiredPage />}</StrictMode>,
);
