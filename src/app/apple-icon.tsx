import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1c1712 100%)',
        }}
      >
        <div
          style={{
            width: 126,
            height: 126,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '6px solid #c8a84b',
            borderRadius: 32,
            color: '#e6c56a',
            fontSize: 48,
            fontWeight: 900,
            fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          }}
        >
          TS
        </div>
      </div>
    ),
    { ...size },
  )
}
