import { ImageResponse } from 'next/og'

export const alt = 'Tibia Services — marketplace seguro para encontrar serviceiros'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 76px',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1c1712 54%, #101828 100%)',
          color: '#e8e8f0',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 52,
                height: 52,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #c8a84b',
                borderRadius: 14,
                color: '#c8a84b',
                fontSize: 28,
                fontWeight: 800,
              }}
            >
              TS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: '#e6c56a' }}>
                Tibia Services
              </div>
              <div style={{ display: 'flex', fontSize: 18, color: '#9a9ab8' }}>
                tibia.davidluky.com
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, color: '#c8a84b', fontSize: 24 }}>
            <span>Hunts</span>
            <span>•</span>
            <span>Quests</span>
            <span>•</span>
            <span>TC</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 60 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 720 }}>
            <div style={{ display: 'flex', fontSize: 86, fontWeight: 900, lineHeight: 1.02, color: '#f4f4f5' }}>
              Encontre seu Serviceiro de Confiança
            </div>
            <div style={{ display: 'flex', fontSize: 30, lineHeight: 1.25, color: '#c6c6d8' }}>
              Marketplace para contratar players experientes com verificação, reservas e avaliações reais.
            </div>
          </div>

          <div
            style={{
              width: 250,
              height: 250,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(200, 168, 75, 0.55)',
              borderRadius: 32,
              background: 'rgba(19, 19, 26, 0.82)',
            }}
          >
            <div
              style={{
                width: 142,
                height: 142,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '8px solid #c8a84b',
                borderRadius: 28,
                transform: 'rotate(45deg)',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRight: '8px solid #e6c56a',
                  borderBottom: '8px solid #e6c56a',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: '#9a9ab8' }}>
          <div style={{ display: 'flex' }}>Verificação de personagem • confirmação dupla de pagamento</div>
          <div style={{ display: 'flex', color: '#e6c56a', fontWeight: 800 }}>Pré-lançamento</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
