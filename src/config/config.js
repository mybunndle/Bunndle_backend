import {config as dotenvConfig} from 'dotenv';



dotenvConfig();


const _config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'secret',
  MONGO_URI: process.env.MONGO_URI ,
  
  reset_scrt:process.env.RESET_SECRET,
  IMAGEKIT_PUBLIC_KEY:process.env.IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_PRIVATE_KEY:process.env.IMAGEKIT_PRIVATE_KEY,
  IMAGEKIT_URL_ENDPOINT:process.env.IMAGEKIT_URL_ENDPOINT,
  CLIENT_ID:process.env.CLIENT_ID,
  CLIENT_SECRET:process.env.CLIENT_SECRET,
  ANDROID_CLIENT_ID:process.env.ANDROID_CLIENT_ID,
  APPLE_AUDIENCE:process.env.APPLE_AUDIENCE,
  jwt_expire:process.env.JWT_EXPIRE,
  IOS_CLIENT_ID:process.env.IOS_CLIENT_ID,
  ANDROID_RELEASE_CLIENT_ID:process.env.ANDROID_RELEASE_CLIENT_ID,
  email: process.env.EMAIL_FROM,

  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,

  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  from: process.env.EMAIL_FROM,


  ids_base_url:process.env.IDSPAY_BASE_URL,
  ids_api_key:process.env.IDSPAY_API_KEY,
  ids_api_id:process.env.IDSPAY_API_ID,
  ids_token_id:process.env.IDSPAY_TOKEN_ID,

  msg91_authkey:process.env.MSG91_AUTHKEY,
  msg91_flow_id:process.env.MSG91_FLOW_ID,
  msg91_sender_id:process.env.MSG91_SENDER_ID,
  use_real_sms:process.env.USE_REAL_SMS,
  otp_expire_minutes:process.env.OTP_EXPIRE_MINUTES

};

export default _config;