export enum ErrorKind {
    Unauthorized,
    UserError,
};

export class ReplicacheError extends Error {
    kind: ErrorKind;
    constructor(kind: ErrorKind, msg:string) {
        super(msg);
        this.kind = kind;
    }
}

export function unauthorizedError(url: string, message: string) {
    return new ReplicacheError(ErrorKind.Unauthorized, `Access to ${url} unauthorized: ${message}`);
}

export function userError(message: string) {
    return new ReplicacheError(ErrorKind.UserError, message);
}
