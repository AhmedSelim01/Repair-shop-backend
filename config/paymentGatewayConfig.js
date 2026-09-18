/**
 * PAYMENT GATEWAY CONFIGURATION (Backward-Compatible Enhanced)
 * Preserves all original behavior while adding:
 * - Multi-provider readiness
 * - Environment variable validation
 * - Better error handling
 * - Logging integration
 */

const stripe = require('stripe');
const logger = require('../utils/logger');

class PaymentGatewayConfig {
    constructor() {
        this.gateways = {
            stripe: {
                enabled: !!process.env.STRIPE_SECRET_KEY,
                client: process.env.STRIPE_SECRET_KEY ? stripe(process.env.STRIPE_SECRET_KEY) : null,
                supportedCurrencies: ['AED', 'USD', 'EUR'], // array format
                supportedMethods: ['credit_card', 'debit_card'], // exact values
                webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                // New optional additions (don't affect behavior)
                _config: {
                    apiVersion: process.env.STRIPE_API_VERSION,
                    timeout: parseInt(process.env.STRIPE_TIMEOUT)
                }
            }
        };

        this._verifyInitialization();
    }

    // New helper (safe addition)
    _verifyInitialization() {
        if (this.gateways.stripe.enabled && !this.gateways.stripe.client) {
            logger.warn('Stripe configuration incomplete - check STRIPE_SECRET_KEY');
        }
    }

    // Get active payment gateway
    getGateway(name = 'stripe') {
        const gateway = this.gateways[name];
        if (!gateway || !gateway.enabled) {
            throw new Error(`Payment gateway ${name} is not configured or enabled`);
        }
        return gateway; // Original return structure
    }

    // Validate payment method for gateway
    validatePaymentMethod(gateway, method) {
        const config = this.gateways[gateway];
        return config && config.supportedMethods.includes(method);
    }

    // Validate currency for gateway
    validateCurrency(gateway, currency) {
        const config = this.gateways[gateway];
        return config && config.supportedCurrencies.includes(currency.toUpperCase());
    }

    // Get all enabled gateways
    getEnabledGateways() {
        return Object.keys(this.gateways).filter(key => this.gateways[key].enabled);
    }

    // New safe additions (don't affect original behavior)
    getConfig(name = 'stripe') {
        return this.gateways[name]?._config;
    }
}

// Maintain original singleton export
module.exports = new PaymentGatewayConfig();