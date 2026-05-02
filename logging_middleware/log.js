const axios = require('axios');

const ALLOWED_STACKS = new Set(['backend', 'frontend']);
const ALLOWED_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal']);
const BACKEND_PACKAGES = new Set([
	'cache',
	'controller',
	'cron_job',
	'db',
	'domain',
	'handler',
	'repository',
	'route',
	'service',
]);
const SHARED_PACKAGES = new Set(['auth', 'config', 'middleware', 'utils']);

function Log(stack, level, packageName, message) {
	if (!ALLOWED_STACKS.has(stack)) {
		throw new Error('Invalid stack. Allowed values are backend and frontend.');
	}

	if (!ALLOWED_LEVELS.has(level)) {
		throw new Error('Invalid level. Allowed values are debug, info, warn, error, and fatal.');
	}

	const allowedPackages = stack === 'backend'
		? new Set([...BACKEND_PACKAGES, ...SHARED_PACKAGES])
		: SHARED_PACKAGES;

	if (!allowedPackages.has(packageName)) {
		throw new Error('Invalid package for the selected stack.');
	}

	if (typeof message !== 'string' || !message.trim()) {
		throw new Error('Message must be a non-empty string.');
	}

	const authorization = process.env.EVALUATION_SERVICE_AUTHORIZATION;

	if (!authorization) {
		throw new Error('Missing EVALUATION_SERVICE_AUTHORIZATION environment variable.');
	}

	const data = JSON.stringify({
		stack,
		level,
		package: packageName,
		message,
	});

	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: 'http://20.207.122.201/evaluation-service/logs',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authorization}`,
		},
		data,
	};

	return axios.request(config);
}

module.exports = Log;