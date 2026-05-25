import express from 'express';
const app = express();
import userRouter from "./routes/userRoutes.js"
import addressRouter from "./routes/addressRoutes.js"
import assetRouter from "./routes/assetRoutes.js"
import vehicleRouter from "./routes/machinaryRoutes.js"
import paymentRouter from "./routes/paymentRoutes.js"
import kycRoutes from "./routes/kycRoutes.js";
import "./config/passport.js";
import cookieParser from 'cookie-parser';
import cors from "cors"

import passport from "passport"
import { Strategy as GoogleStrategy } from 'passport-google-oauth2';
import config from "./config/config.js"


app.use(
   "/api/payment/webhook",
   express.raw({ type: "*/*" })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use(cors({
  origin: true,   // reflects request origin
  credentials: true
}));



app.use(passport.initialize());
passport.use( new GoogleStrategy({
    clientID: config.CLIENT_ID,
    clientSecret: config.CLIENT_SECRET,
    callbackURL: '/api/user/google/callback',
  
},
function(request, accessToken, refreshToken, profile, done) {
    // userModel.findOrCreate({ googleId: profile.id }, function (err, user) {
    //   return done(err, user);
    // });
    return done(null, profile);
}
));



app.use("/api/user", userRouter);
app.use("/api/address", addressRouter)
app.use("/api/asset",assetRouter)
app.use("/api/machine",vehicleRouter)
app.use("/api/payment", paymentRouter)
app.use("/api/kyc", kycRoutes)



export default app