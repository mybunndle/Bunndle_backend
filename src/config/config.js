import {config as dotenvConfig} from 'dotenv';



dotenvConfig();


const _config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'secret',
  MONGO_URI: process.env.MONGO_URI ,
  email: process.env.EMAIL_USER ,
  password: process.env.APP_PASSWORD,
  reset_scrt:process.env.RESET_SECRET,
  IMAGEKIT_PUBLIC_KEY:process.env.IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_PRIVATE_KEY:process.env.IMAGEKIT_PRIVATE_KEY,
  IMAGEKIT_URL_ENDPOINT:process.env.IMAGEKIT_URL_ENDPOINT,
  CLIENT_ID:process.env.CLIENT_ID,
  CLIENT_SECRET:process.env.CLIENT_SECRET,
  ANDROID_CLIENT_ID:process.env.ANDROID_CLIENT_ID
};

export default _config;