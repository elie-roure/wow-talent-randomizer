import express from 'express';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import path from 'path';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import wowRouter from './routes/wow';

// load env vars before requiring passport strategy to ensure env are available
dotenv.config();
// require the passport strategy after dotenv.config so it can read process.env
require('./auth/passport');

const app = express();

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(express.json());

app.use(session({
	secret: process.env.SESSION_SECRET || 'change_me',
	resave: false,
	// NOTE: saveUninitialized=true used here to ensure a session cookie is set before redirect
	// during debug. In production you may want saveUninitialized: false and a proper store.
	saveUninitialized: true,
	cookie: {
		// For local dev over HTTP, ensure secure=false so cookie is sent.
		secure: false,
		// Lax allows the cookie to be sent on top-level GET navigations (good for OAuth redirects).
		sameSite: 'lax',
	},
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRouter);
app.use('/health', healthRouter);
app.use('/data', wowRouter);

// basic 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

export default app;
