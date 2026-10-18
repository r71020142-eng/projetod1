import React from "react";
import { InternalPagePlaceholder } from "@/components/ui/InternalPagePlaceholder";

export default function PerfilAlunoPage() {
  return (
    <InternalPagePlaceholder
      title="Meu Perfil"
      description="Dados cadastrais do estudante, preferências de estudo, professor vinculado e nível CEFR mapeado."
      area="aluno"
      etapaPrevista="Etapa 1 / 7"
      funcionalidadesPrevistas={[
        "Gerenciamento de dados pessoais e foto de perfil",
        "Visualização do professor tutor designado e horários de mentoria",
        "Configurações de lembretes de aulas e revisões de flashcards",
        "Garantia de privacidade estrita: o aluno visualiza exclusivamente seus próprios dados e materiais autorizados",
      ]}
    />
  );
}
