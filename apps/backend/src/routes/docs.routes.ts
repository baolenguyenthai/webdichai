import { Router } from 'express';

const router: Router = Router();

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'WebDichAI API',
    version: '1.0.0',
    description: 'REST API for AI video translation, subtitle editing, dubbing, rendering and downloads.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/register': { post: { summary: 'Register a user' } },
    '/auth/login': { post: { summary: 'Login with email/password' } },
    '/auth/google': { post: { summary: 'Login with Google id token' } },
    '/auth/forgot-password': { post: { summary: 'Send password reset OTP' } },
    '/auth/reset-password': { post: { summary: 'Reset password using OTP' } },
    '/auth/refresh': { post: { summary: 'Refresh access token' } },
    '/auth/me': { get: { summary: 'Get current profile' } },
    '/auth/profile': { patch: { summary: 'Update profile' } },
    '/auth/change-password': { post: { summary: 'Change password' } },
    '/projects/stats/dashboard': { get: { summary: 'Get dashboard statistics' } },
    '/projects/upload': { post: { summary: 'Upload a video and start the AI pipeline' } },
    '/projects/import': { post: { summary: 'Import a public video URL and start the AI pipeline' } },
    '/projects': { get: { summary: 'List projects' } },
    '/projects/{id}': { get: { summary: 'Get project' }, patch: { summary: 'Update project' }, delete: { summary: 'Delete project permanently' } },
    '/projects/{id}/translate': { post: { summary: 'Queue translation and voice dubbing' } },
    '/projects/{id}/export': { post: { summary: 'Queue video export/render' } },
    '/projects/{id}/retry': { post: { summary: 'Retry failed pipeline' } },
    '/projects/{id}/restore': { post: { summary: 'Restore project from trash' } },
    '/projects/{id}/download/video': { get: { summary: 'Download exported video' } },
    '/projects/{id}/download/subtitle': { get: { summary: 'Download subtitle file as SRT, ASS or VTT' } },
    '/projects/{id}/download/audio': { get: { summary: 'Download AI dub audio' } },
    '/subtitles': { get: { summary: 'List project subtitles' }, post: { summary: 'Create subtitle' } },
    '/subtitles/{id}': { patch: { summary: 'Update subtitle' }, delete: { summary: 'Delete subtitle' } },
    '/payment/checkout': { post: { summary: 'Create Stripe checkout session' } },
    '/admin/stats': { get: { summary: 'Admin dashboard stats' } },
    '/admin/users': { get: { summary: 'Admin user management' } },
  },
};

router.get('/swagger.json', (_req, res) => {
  res.json(swaggerDocument);
});

router.get('/docs', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html>
  <head>
    <title>WebDichAI API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>SwaggerUIBundle({ url: '/api/swagger.json', dom_id: '#swagger-ui' });</script>
  </body>
</html>`);
});

export default router;
