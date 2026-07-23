import Twilio from 'twilio'

// ==============================
// Environment Variables
// ==============================

const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
const fromSms = process.env.TWILIO_FROM_SMS?.trim()
const fromWhatsapp = process.env.TWILIO_FROM_WHATSAPP?.trim()

// ==============================
// Helper Functions
// ==============================

function isPlaceholderValue(value) {
  return (
    !value ||
    /^(your_|replace_me|example|dummy|test)/i.test(value)
  )
}

function hasRealCredentials() {
  return (
    accountSid &&
    authToken &&
    accountSid.startsWith('AC') &&
    !isPlaceholderValue(accountSid) &&
    !isPlaceholderValue(authToken)
  )
}

// ==============================
// Twilio Client
// ==============================

const client = hasRealCredentials()
  ? Twilio(accountSid, authToken)
  : null

if (!client) {
  console.warn(
    '⚠️ Twilio is disabled. Please configure valid TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env file.'
  )
}

// ==============================
// Mobile Number Formatter
// Supports:
// 9876543210
// 919876543210
// +919876543210
// ==============================

export function normalizeMobile(mobile) {
  const digits = String(mobile ?? '').replace(/\D/g, '')

  if (digits.length === 10) {
    return `+91${digits}`
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`
  }

  if (digits.length === 13 && digits.startsWith('91')) {
    return `+${digits}`
  }

  return null
}

// ==============================
// Public Configuration
// ==============================

export function getTwilioConfig() {
  return {
    enabled: !!client,
    fromSms,
    fromWhatsapp,
  }
}

// ==============================
// Send OTP
// ==============================

export async function sendOtpMessage(mobile, channel = 'sms', message) {
  if (!client) {
    throw new Error(
      'Twilio is not configured. Please check your environment variables.'
    )
  }

  if (!['sms', 'whatsapp'].includes(channel)) {
    throw new Error(
      'Invalid channel. Allowed values are "sms" or "whatsapp".'
    )
  }

  const normalizedMobile = normalizeMobile(mobile)

  if (!normalizedMobile) {
    throw new Error('Invalid mobile number.')
  }

  let from
  let to

  if (channel === 'whatsapp') {
    if (!fromWhatsapp) {
      throw new Error(
        'TWILIO_FROM_WHATSAPP is not configured.'
      )
    }

    from = `whatsapp:${fromWhatsapp}`
    to = `whatsapp:${normalizedMobile}`
  } else {
    if (!fromSms) {
      throw new Error(
        'TWILIO_FROM_SMS is not configured.'
      )
    }

    from = fromSms
    to = normalizedMobile
  }

  try {
    const response = await client.messages.create({
      body: message,
      from,
      to,
    })

    return {
      success: true,
      sid: response.sid,
      status: response.status,
      to: response.to,
    }
  } catch (error) {
    console.error('Twilio Error:', error)

    throw new Error(
      error.message || 'Failed to send OTP via Twilio.'
    )
  }
}