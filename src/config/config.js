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
  from: process.env.EMAIL_FROM

};

export default _config;