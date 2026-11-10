import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireAuth, RequireRole } from "@/components/layout/guards";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { ComingSoonPage } from "@/pages/ComingSoonPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

const soon = (title: string, stage: number, description: string) => <ComingSoonPage title={title} stage={stage} description={description} />;

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
            <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="perfil" element={<ProfilePage />} />
                <Route path="turmas" element={soon("Turmas e horários", 3, "Criação de turmas, horários sem conflito e lista de atletas.")} />
                <Route path="comunicados" element={soon("Comunicados", 6, "Avisos gerais, por turma e individuais.")} />

                <Route element={<RequireRole roles={["admin", "professor"]} />}>
                  <Route path="atletas" element={soon("Atletas", 2, "Cadastro completo de atletas com busca, filtros e arquivamento.")} />
                  <Route path="presenca" element={soon("Presença", 4, "Chamada por turma e data, com justificativas e percentual de frequência.")} />
                </Route>

                <Route element={<RequireRole roles={["admin"]} />}>
                  <Route path="responsaveis" element={soon("Responsáveis", 2, "Cadastro de responsáveis e vínculo com um ou mais atletas.")} />
                  <Route path="professores" element={soon("Professores", 3, "Cadastro de professores e vínculo com turmas.")} />
                  <Route path="financeiro" element={soon("Financeiro", 5, "Geração de mensalidades, registro de pagamentos e inadimplência.")} />
                  <Route path="relatorios" element={soon("Relatórios", 7, "Gráficos e relatórios administrativos e financeiros.")} />
                  <Route path="configuracoes" element={soon("Configurações", 5, "Valores dos planos, vencimento e logomarca.")} />
                  <Route path="usuarios" element={<UsersPage />} />
                </Route>

                <Route element={<RequireRole roles={["responsavel"]} />}>
                  <Route path="meus-atletas" element={soon("Meus atletas", 2, "Dados dos seus filhos cadastrados na escola.")} />
                  <Route path="frequencia" element={soon("Frequência", 4, "Presenças e faltas dos seus filhos.")} />
                  <Route path="mensalidades" element={soon("Mensalidades", 5, "Mensalidades e pagamentos dos seus filhos.")} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
