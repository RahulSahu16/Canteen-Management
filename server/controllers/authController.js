import { staffUsers } from '../models/db.js'
import {
  createOtp,
  verifyOtp,
  canResendOtp,
} from '../utils/otpStore.js'

import {
  getTwilioConfig,
  sendOtpMessage,
} from '../utils/twilioClient.js'

// =====================================
// Twilio Status
// =====================================

export function getTwilioStatus(req, res) {
  const config = getTwilioConfig()

  return res.json({
    twilioEnabled: config.enabled,
    fromSms: config.fromSms,
    fromWhatsapp: config.fromWhatsapp,
  })
}

// =====================================
// Staff Login
// =====================================

export function staffLogin(req, res) {
  const { id, password } = req.body

  if (!id || !password) {
    return res.status(400).json({
      error: 'Staff ID and password are required.',
    })
  }

  const user = staffUsers.find(
    (staff) => staff.id === id
  )

  if (!user || user.password !== password) {
    return res.status(401).json({
      error: 'Invalid staff credentials.',
    })
  }

  return res.json({
    success: true,
    staff: {
      id: user.id,
      name: user.name,
    },
  })
}

// =====================================
// Send OTP
// =====================================

export async function sendOtp(req, res) {
  const {
    mobile,
    seatId,
    channel = 'sms',
  } = req.body

  if (!mobile) {
    return res.status(400).json({
      error: 'Mobile number is required.',
    })
  }

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return res.status(400).json({
      error: 'Enter a valid 10-digit mobile number.',
    })
  }

  if (!canResendOtp(mobile)) {
    return res.status(429).json({
      error:
        'Please wait a few seconds before requesting another OTP.',
    })
  }

  const otp = createOtp(mobile, seatId)
  const twilioConfig = getTwilioConfig()

  try {
    if (twilioConfig.enabled) {
      await sendOtpMessage(
        mobile,
        channel,
        `Your CricVerse OTP is ${otp}. It expires in 5 minutes.`
      )
    } else {
      console.log(
        `[DEV OTP] Mobile: ${mobile} | OTP: ${otp}`
      )
    }

    return res.json({
      success: true,
      message: 'OTP sent successfully.',
      twilioEnabled: twilioConfig.enabled,

      // Remove this in production
      otp: twilioConfig.enabled ? undefined : otp,
    })
  } catch (error) {
    console.error('OTP Send Error:', error)

    return res.status(500).json({
      error:
        error.message ||
        'Failed to send OTP.',
    })
  }
}

// =====================================
// Verify OTP
// =====================================

export function verifyOtpCode(req, res) {
  const { mobile, code } = req.body

  if (!mobile || !code) {
    return res.status(400).json({
      error: 'Mobile number and OTP are required.',
    })
  }

  const result = verifyOtp(
    mobile,
    code
  )

  if (!result.ok) {
    return res.status(400).json({
      error: result.message,
    })
  }

  return res.json({
    success: true,
    message: 'OTP verified successfully.',
    mobile,
    seatId: result.seatId,
  })
}