const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StoreItem',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        // This is the subtotal for THIS item
        totalPrice: {
            type: Number,
            required: true,
            min: 0
        },
    }],

    status: {
        type: String,
        enum: ['active', 'checked-out', 'cancelled'],
        default: 'active',
    },

    // Grand total of the cart
    totalPrice: {
        type: Number,
        default: 0,
        min: 0,
    },

}, {
    timestamps: true,
});

/**
 * Auto-calculate grand total before saving.
 */
CartSchema.pre('save', function (next) {
    this.totalPrice = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    next();
});

/**
 * Static: Get user's active cart
 */
CartSchema.statics.getActiveCart = function (userId) {
    return this.findOne({ userId, status: 'active' });
};

/**
 * Instance: Mark this cart as checked out
 */
CartSchema.methods.checkoutCart = async function () {
    this.status = 'checked-out';
    await this.save();
    return this;
};

const Cart = mongoose.model('Cart', CartSchema);
module.exports = Cart;