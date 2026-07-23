(async () => {
  const base = 'http://localhost:4000'
  const staffId = process.env.STAFF_USER_ID || 'staff001'
  const staffPassword = process.env.STAFF_LOGIN_PASSWORD

  if (!staffPassword) {
    console.error('STAFF_LOGIN_PASSWORD is not set')
    process.exit(1)
  }

  try {
    console.log('Testing staff login...')
    let res = await fetch(`${base}/api/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: staffId, password: staffPassword }),
    })
    const staff = await res.json()
    console.log('staff login status:', res.status, staff)

    console.log('Testing OTP send...')
    res = await fetch(`${base}/api/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210', seatId: 'A1', channel: 'sms' }),
    })
    const send = await res.json()
    console.log('otp send status:', res.status, send)

    if (!send.otp) {
      console.error('No OTP returned; cannot verify automatically.')
      process.exit(1)
    }

    console.log('Testing OTP verify...')
    res = await fetch(`${base}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210', code: String(send.otp) }),
    })
    const verify = await res.json()
    console.log('otp verify status:', res.status, verify)

    console.log('All API tests completed.')
    process.exit(0)
  } catch (err) {
    console.error('API test error:', err)
    process.exit(1)
  }
})()
