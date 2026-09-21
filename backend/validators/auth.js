const { z } = require('zod');
const { email, newPassword, phone, name } = require('./common');

// Existing passwords are only compared, never validated for strength.
const existingPassword = z.string().min(1, 'Password is required').max(200);

const register = z.strictObject({ name, email, phone, password: newPassword });

const login = z.strictObject({ email, password: existingPassword });

const changePassword = z.strictObject({ currentPassword: existingPassword, newPassword });

const createAdmin = z.strictObject({ name, email, temporaryPassword: newPassword });

module.exports = { register, login, changePassword, createAdmin };
