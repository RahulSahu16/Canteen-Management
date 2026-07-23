import express from 'express'
import { getTwilioStatus, staffLogin, sendOtp, verifyOtpCode } from '../controllers/authController.js'

const router = express.Router()

router.get('/twilio-status', getTwilioStatus)
router.post('/staff/login', staffLogin)
router.post('/otp/send', sendOtp)
router.post('/otp/verify', verifyOtpCode)

export default router
