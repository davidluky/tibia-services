export const metadata = {
  title: 'Termos de Uso — Tibia Services',
}

export default function TermosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-8">Termos de Uso</h1>

      <div className="space-y-6 text-text-muted">
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">1. Aceitação dos Termos</h2>
          <p className="text-sm leading-relaxed">Ao acessar e usar o Tibia Services, você concorda com estes Termos de Uso. Se não concordar, não utilize a plataforma.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">2. Descrição do Serviço</h2>
          <p className="text-sm leading-relaxed">O Tibia Services é uma plataforma que conecta jogadores de Tibia que oferecem serviços (serviceiros) com clientes que desejam contratar esses serviços. A plataforma atua apenas como intermediária e não se responsabiliza pelas transações realizadas.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">3. Responsabilidades do Usuário</h2>
          <p className="text-sm leading-relaxed">O usuário é responsável por manter a confidencialidade de sua conta, fornecer informações verídicas, e cumprir os acordos feitos com outros usuários. É proibido usar a plataforma para atividades ilegais, fraudes, ou violações dos Termos de Serviço do jogo Tibia.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">4. Pagamentos</h2>
          <p className="text-sm leading-relaxed">Os pagamentos entre clientes e serviceiros são realizados em Tibia Coins (moeda do jogo) e são de responsabilidade exclusiva das partes envolvidas. O Tibia Services não processa pagamentos em dinheiro real e não se responsabiliza por disputas relacionadas a pagamentos.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">5. Condutas Proibidas</h2>
          <p className="text-sm leading-relaxed">É proibido: criar perfis falsos, realizar spam, assediar outros usuários, publicar conteúdo ofensivo ou ilegal, ou tentar manipular o sistema de avaliações.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">6. Moderação e Banimentos</h2>
          <p className="text-sm leading-relaxed">A plataforma reserva-se o direito de remover conteúdo e banir usuários que violem estes termos, sem aviso prévio.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">7. Alterações nos Termos</h2>
          <p className="text-sm leading-relaxed">Estes termos podem ser alterados a qualquer momento. O uso contínuo da plataforma após as alterações constitui aceitação dos novos termos.</p>
        </section>

        <p className="text-xs text-text-muted/60 pt-4 border-t border-border">Última atualização: março de 2026</p>
      </div>
    </div>
  )
}
