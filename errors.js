class UnauthorizedError extends Error {
    constructor(url, message) {
        super(`Access to ${url} unauthorized: ${message}`);
    }
}

// Indicates that the user application sent an invalid request.
// This type of error is permanent, and should not be retried.
class UserError extends Error {
    constructor(message) {
        super(`Invalid request: ${message}`);
    }
}

module.exports = {
    UnauthorizedError,
    UserError,
};
