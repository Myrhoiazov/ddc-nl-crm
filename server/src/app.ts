import express from 'express';
import path from 'path';
import { createServer } from 'http';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import routes from './routes';
import errorMiddleware from './middlewares/middlewares.Error';
import { csrfProtection } from './middlewares/middleware.Csrf';
import { logger } from './logger';
import { env } from 'process';
import { verifyRequestSignature } from './controllers/controller.Instagram';

dotenv.config();
const ROOT_DIR = process.cwd();
const app = express();
const server = createServer(app);
const isDev = env.MODE === 'development';

const allowedClientOrigins = [
    env.CLIENT_URL,
    ...(isDev ? ['http://localhost:3000'] : []),
].filter((origin): origin is string => Boolean(origin));

if (!isDev) {
    app.set('trust proxy', 1);
}

app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            fontSrc: ["'self'", 'data:'],
            connectSrc: ["'self'", ...allowedClientOrigins, 'https://api.mollie.com', 'https://*.mollie.com'],
            frameSrc: ["'self'", 'blob:'],
            frameAncestors: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: isDev ? null : [],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isDev ? false : {
        maxAge: 15552000,
        includeSubDomains: true,
        preload: false,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(morgan('combined', {
    stream: {
        write: message => logger.info(message.trim())
    }
}));
app.use(bodyParser.json({
    limit: '1mb',
    verify: (req, res, buf) => {
        const expressReq = req as express.Request;
        if (expressReq.originalUrl.startsWith('/api/v1/instagram/webhook')) {
            verifyRequestSignature(expressReq, res as express.Response, buf);
        }
    },
}));
app.use(cookieParser());

const corsOptions = {
    origin: allowedClientOrigins,
    credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(compression());
app.use(express.static(path.join(ROOT_DIR, 'public'), { maxAge: 31557600000 }));

app.use('/api/v1', csrfProtection);
app.use('/api/v1', routes());
app.use(errorMiddleware);

export default server;
