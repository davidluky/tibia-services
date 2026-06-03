export const metadata = {
  title: 'Política de Privacidade — Tibia Services',
}

export default function PrivacidadePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-8">Política de Privacidade</h1>

      <div className="space-y-6 text-text-muted">
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">1. Dados Coletados</h2>
          <p className="text-sm leading-relaxed">Coletamos: endereço de e-mail (para autenticação), nome de exibição, bio, informações de disponibilidade, e dados de uso da plataforma (reservas, avaliações, mensagens).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">2. Uso dos Dados</h2>
          <p className="text-sm leading-relaxed">Seus dados são usados para: operar a plataforma, exibir seu perfil para outros usuários, enviar notificações relacionadas às suas reservas, e melhorar o serviço.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">3. Compartilhamento de Dados</h2>
          <p className="text-sm leading-relaxed">Não vendemos seus dados. Suas informações de contato (WhatsApp, Discord) são visíveis apenas para usuários logados que as solicitarem. Seus dados são armazenados no Supabase (infraestrutura em nuvem segura).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">4. Seus Direitos (LGPD)</h2>
          <p className="text-sm leading-relaxed">De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a: acessar seus dados, corrigir dados incorretos, solicitar a exclusão de sua conta e dados, e revogar seu consentimento. Para exercer esses direitos, entre em contato conosco.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">5. Cookies</h2>
          <p className="text-sm leading-relaxed">Utilizamos cookies essenciais para autenticação (gerenciados pelo Supabase). Não utilizamos cookies de rastreamento ou publicidade.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">6. Segurança</h2>
          <p className="text-sm leading-relaxed">Adotamos medidas de segurança técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito (HTTPS) e controle de acesso baseado em roles (RLS).</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">7. Retenção de Dados</h2>
          <p className="text-sm leading-relaxed">Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir sua conta, seus dados pessoais são removidos, exceto registros necessários para obrigações legais.</p>
        </section>

        <p className="text-xs text-text-muted/60 pt-4 border-t border-border">Última atualização: março de 2026</p>
      </div>
    </div>
  )
}
