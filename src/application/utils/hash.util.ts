import * as crypto from 'crypto';

export function generateCanonicalHash(payload: Record<string, any>): string {
    const sortedPayload = Object.keys(payload).sort()
        .reduce((acc, key) => {
        acc[key] = payload[key];
        return acc;
        }, {} as Record<string, any>);

    const jsonString = JSON.stringify(sortedPayload);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
}