import React from "react";
import { InternalPagePlaceholder } from "@/components/ui/InternalPagePlaceholder";

export default function AdminConfiguracoesPage() {
  return (
    <InternalPagePlaceholder
      title="Configurações da Plataforma"
      description="Parâmetros institucionais do Método Paulo, níveis de acesso, segurança e preferências do ambiente demonstrativo."
      area="admin"
      etapaPrevista="Etapa 1 / 7"
      funcionalidadesPrevistas={[
        "Gerenciamento de papéis de usuários (Administrador, Professor e Aluno)",
        "Parâmetros da escola DEMOSTRATIVO MTD e dados institucionais",
        "Configurações de segurança, logs de auditoria e privacidade",
        "Regras de retenção de dados e políticas de backup do sistema",
      ]}
    />
  );
}
