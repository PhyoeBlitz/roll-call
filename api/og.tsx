import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #e0e7ff 0%, #f0fdfa 100%)',
        }}
      >
        <div style={{
          fontSize: 80,
          fontWeight: 700,
          color: '#1e293b',
          marginBottom: 24,
          letterSpacing: '-2px',
        }}>
          Roll Call
        </div>
        <div style={{
          fontSize: 36,
          color: '#334155',
          fontWeight: 400,
          marginBottom: 32,
        }}>
          Real-time Attendance Tracking
        </div>
        <div style={{
          fontSize: 28,
          color: '#64748b',
        }}>
          Secure, open source, and easy to use.
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}