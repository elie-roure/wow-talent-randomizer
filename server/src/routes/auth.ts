import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { getClientCredentialsToken } from '../services/bnetService';

const router = Router();

// Debug helper: show current session (temporary)
router.get('/debug-session', (req: Request, res: Response) => {
  res.json({ sessionID: (req as any).sessionID, session: req.session });
});

// Start the Battle.net OAuth flow
// Log session info before redirect to help debugging missing `state` issues.
router.get('/bnet', (req: Request, _res: Response, next: NextFunction) => {
  // small debug log (will appear in server console)
  // eslint-disable-next-line no-console
  console.log('[/auth/bnet] session before auth:', (req as any).sessionID, req.session);
  next();
}, passport.authenticate('bnet', { state: true } as any));

// Callback URL Battle.net will redirect to
router.get('/bnet/callback', passport.authenticate('bnet', { failureRedirect: '/' }), (req: Request, res: Response) => {
  res.json({ ok: true, user: (req as any).user, session: req.session });
});

router.get('/logout', (req: Request, res: Response) => {
  (req as any).logout?.();
  res.redirect('/');
});

// Client credentials token (server-to-server)
// Returns the raw token response from Battle.net's /token endpoint.
router.get('/token', async (_req: Request, res: Response) => {
  try {
    const token = await getClientCredentialsToken();
    res.json(token);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch client credentials token:', err);
    res.status(500).json({ error: 'failed_fetching_token', message: String(err) });
  }
});

export default router;
