import passport from 'passport';
import { Strategy as BnetStrategy } from 'passport-bnet';

// use `any` here to keep the example small and avoid strict type issues
passport.serializeUser((user: any, done: any) => done(null, user));
passport.deserializeUser((obj: any, done: any) => done(null, obj));

const clientID = process.env.BNET_CLIENT_ID;
const clientSecret = process.env.BNET_CLIENT_SECRET;
const callbackURL = process.env.BNET_CALLBACK_URL || 'http://localhost:3000/auth/bnet/callback';
const region = process.env.BNET_REGION || 'eu';

if (!clientID || !clientSecret) {
  // Provide a clearer runtime error than the generic OAuth2Strategy one.
  throw new Error(
    'BNET_CLIENT_ID and BNET_CLIENT_SECRET must be set. See .env.example and set these environment variables before starting the app.'
  );
}

passport.use(
  new BnetStrategy(
    {
      clientID,
      clientSecret,
      callbackURL,
      region,
    },
    (accessToken: string, refreshToken: string, profile: any, done: any) => {
      // For now we return a simple object with profile + tokens.
      process.nextTick(() => done(null, { profile, accessToken, refreshToken }));
    }
  )
);

export default passport;
