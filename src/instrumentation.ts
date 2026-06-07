export async function register() {
  if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET?.trim()) {
    throw new Error('AUTH_SECRET must be set in production')
  }
}
