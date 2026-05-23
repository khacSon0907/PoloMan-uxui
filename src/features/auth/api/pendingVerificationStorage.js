const PENDING_VERIFICATION_EMAIL_KEY = 'pendingVerificationEmail'

export const pendingVerificationStorage = {
  getEmail() {
    return sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY) || ''
  },

  setEmail(email) {
    sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email)
  },

  clearEmail() {
    sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY)
  },
}
