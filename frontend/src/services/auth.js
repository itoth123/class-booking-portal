import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js'
import { config } from '../config'

const userPool = new CognitoUserPool({
  UserPoolId: config.cognito.userPoolId,
  ClientId: config.cognito.clientId,
})

export const authService = {
  // Sign in user
  signIn: (email, password) => {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      })

      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      })

      user.authenticateUser(authDetails, {
        onSuccess: (result) => {
          resolve({
            accessToken: result.getAccessToken().getJwtToken(),
            idToken: result.getIdToken().getJwtToken(),
            refreshToken: result.getRefreshToken().getToken(),
          })
        },
        onFailure: (err) => {
          reject(err)
        },
        newPasswordRequired: (userAttributes) => {
          // Handle new password required (first login)
          reject({ code: 'NewPasswordRequired', userAttributes })
        },
      })
    })
  },

  // Sign out user
  signOut: () => {
    const user = userPool.getCurrentUser()
    if (user) {
      user.signOut()
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('idToken')
  },

  // Get current session
  getSession: () => {
    return new Promise((resolve, reject) => {
      const user = userPool.getCurrentUser()
      if (!user) {
        reject(new Error('No user logged in'))
        return
      }

      user.getSession((err, session) => {
        if (err) {
          reject(err)
          return
        }

        if (!session.isValid()) {
          reject(new Error('Session expired'))
          return
        }

        resolve({
          accessToken: session.getAccessToken().getJwtToken(),
          idToken: session.getIdToken().getJwtToken(),
          user: {
            email: session.getIdToken().payload.email,
            sub: session.getIdToken().payload.sub,
          },
        })
      })
    })
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      await authService.getSession()
      return true
    } catch {
      return false
    }
  },

  // Change password (for new password required)
  completeNewPassword: (email, oldPassword, newPassword) => {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      })

      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: oldPassword,
      })

      user.authenticateUser(authDetails, {
        onSuccess: (result) => {
          resolve(result)
        },
        onFailure: (err) => {
          reject(err)
        },
        newPasswordRequired: (userAttributes) => {
          delete userAttributes.email_verified
          delete userAttributes.email
          
          user.completeNewPasswordChallenge(newPassword, userAttributes, {
            onSuccess: (result) => {
              resolve(result)
            },
            onFailure: (err) => {
              reject(err)
            },
          })
        },
      })
    })
  },
}
