const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { trustProxy } = require('./config/env');
const originCheck = require('./middleware/originCheck');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', trustProxy);
// Plain key=value query strings only: `?a[$ne]=x` stays a string key instead of
// becoming a nested operator object.
app.set('query parser', 'simple');

// The API is same-origin (Vite proxy in development), so there is no CORS middleware:
// browsers block cross-origin reads by default.
app.use(helmet());
app.use(originCheck);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use('/api', require('./routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
