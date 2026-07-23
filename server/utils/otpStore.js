const otpStore = new Map()
const OTP_TTL_MS = 5 * 60 * 1000
const RESEND_COOLDOWN_MS = 30 * 1000

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function createOtp(mobile, seatId = 'unknown') {
  const code = generateOtp()
  const expiresAt = Date.now() + OTP_TTL_MS
  otpStore.set(mobile, {
    code,
    seatId,
    createdAt: Date.now(),
    expiresAt,
    resendAt: Date.now() + RESEND_COOLDOWN_MS,
    attempts: 0,
  })
  return code
}

export function getOtpMeta(mobile) {
  return otpStore.get(mobile)
}

export function canResendOtp(mobile) {
  const meta = otpStore.get(mobile)
  return !meta || Date.now() >= meta.resendAt
}

export function verifyOtp(mobile, code) {
  const meta = otpStore.get(mobile)
  if (!meta) {
    return { ok: false, message: 'No OTP request found for this mobile number.' }
  }

  if (Date.now() > meta.expiresAt) {
    otpStore.delete(mobile)
    return { ok: false, message: 'OTP expired. Please request a new code.' }
  }

  if (meta.attempts >= 5) {
    otpStore.delete(mobile)
    return { ok: false, message: 'Too many invalid attempts. Please request a new OTP.' }
  }

  if (meta.code !== String(code).trim()) {
    meta.attempts += 1
    otpStore.set(mobile, meta)
    return { ok: false, message: 'Incorrect OTP. Please try again.' }
  }

  otpStore.delete(mobile)
  return { ok: true, seatId: meta.seatId }
}
