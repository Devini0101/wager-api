import Decimal from 'decimal.js';

export interface MoneyProps {
  amount: string;   // ex.: "25.00"
  currency: string; // ISO-4217, ex.: "BRL"
}

export class Money {
    private constructor( private readonly value: Decimal, public readonly currency: string) {}

    static from(props: MoneyProps): Money {
        Money.validateProps(props);
        const dec = new Decimal(props.amount.trim());
        return new Money(dec, props.currency.trim().toUpperCase());
    }

    static zero(currency: string): Money {
        if (!currency || currency.trim().length !== 3) {
            throw new Error('Currency code must be a valid 3-letter ISO code');
        }
        return new Money(new Decimal('0.00'), currency.trim().toUpperCase());
    }

    private static validateProps(props: MoneyProps): void {
        if (!props || typeof props.amount !== 'string' || typeof props.currency !== 'string') {
            throw new Error('Invalid Money payload structure');
        }

        const currency = props.currency.trim();
        if (currency.length !== 3) {
            throw new Error(`Invalid ISO-4217 currency code: "${props.currency}"`);
        }

        const rawAmount = props.amount.trim();
        if (!rawAmount) {
            throw new Error('Amount cannot be empty');
        }

        // Rejeita NaN, Infinity e caracteres invalidos
        if (/[eE]/.test(rawAmount) || rawAmount === 'NaN' || rawAmount.includes('Infinity')) {
            throw new Error(`Invalid numeric format: "${rawAmount}"`);
        }

        // Valida escala máxima de 2 casas decimais
        const parts = rawAmount.split('.');
        if (parts.length > 2 || (parts.length === 2 && parts[1].length > 2)) {
            throw new Error(`Amount must have at most 2 decimal places: "${rawAmount}"`);
        }

        let dec: Decimal;

        try {
          dec = new Decimal(rawAmount);
        } catch {
            throw new Error(`Invalid decimal amount: "${rawAmount}"`);
        }

        if (dec.isNaN() || !dec.isFinite()) {
            throw new Error(`Amount is not a valid finite number: "${rawAmount}"`);
        }

        if (dec.isNegative()) {
            throw new Error(`Amount cannot be negative in creation contract: "${rawAmount}"`);
        }
    }

    private static createInternal(value: Decimal, currency: string): Money {
        return new Money(value, currency);
    }

    get amount(): string {
        return this.value.toFixed(2);
    }

    add(other: Money): Money {
        this.assertSameCurrency(other);
        return Money.createInternal(this.value.plus(other.value), this.currency);
    }

    subtract(other: Money): Money {
        this.assertSameCurrency(other);
        return Money.createInternal(this.value.minus(other.value), this.currency);
    }

    negate(): Money {
        return Money.createInternal(this.value.negated(), this.currency);
    }

    isZero(): boolean {
        return this.value.isZero();
    }

    isPositive(): boolean {
        return this.value.isPositive() && !this.value.isZero();
    }

    isNegative(): boolean {
        return this.value.isNegative();
    }

    isLessThan(other: Money): boolean {
        this.assertSameCurrency(other);
        return this.value.lessThan(other.value);
    }

    equals(other: Money): boolean {
        return this.currency === other.currency && this.value.equals(other.value);
    }

    toJSON(): MoneyProps {
        return {
        amount: this.amount,
        currency: this.currency,
        };
    }

    toString(): string {
        return `${this.amount} ${this.currency}`;
    }

    private assertSameCurrency(other: Money): void {
        if (this.currency !== other.currency) {
        throw new Error(`Currency mismatch error: ${this.currency} !== ${other.currency}`);
        }
    }
}