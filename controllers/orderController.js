// controllers/orderController
const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const mongoose = require('mongoose');

exports.getAllOrders = asyncHandler(async(req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const query={};

        if(!['admin', 'employee'].includes(req.user.role)) {
            query.userId = req.user._id;
        }

        const orders = await Order.find(query).sort({createdAt: -1}).skip(skip).limit(limit);
        const total = await Order.countDocuments(query);

        return res.status(200).json({
            success: true,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total/limit)
            },
            data: orders
        });
        
        
    } catch (error) {
        next(error);
    }
})

exports.getOrderById = asyncHandler(async(req, res, next) => {
    try {
        const { id } = req.params;

        if(!mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({ success: false, message: "Invalid Order ID" });
        }

        const order = await Order.findById(id);

        if(!order){
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        
        if(!["admin", "employee"].includes(req.user.role)&& order.userId.toString() !==req.user._id.toString()){
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        return res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
})


exports.updateOrderStatus = asyncHandler(async(req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if(!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid Order ID" }); 
        }

        if(!["admin", "employee"].includes(req.user.role)){
            return res.status(403).json({ success: false, message: "Access denied"});
        }
        
        const allowedStatus = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

        if(!allowedStatus.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status value" });
        }

        const order = await Order.findByIdAndUpdate(id, {status}, { new: true});

        if(!order){
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        return res.status(200).json({ success: true, message: "Order status updated", data: order})

    } catch (error) {
        next(error);
    }
})

exports.deleteOrder = asyncHandler(async(req, res, next) => {
    try {
        const { id } = req.params;

        //first we check if the user is an admin
       if(req.user.role !== "admin") {
           return res.status(403).json({ success: false, message: "Access denied, only admin can delete orders"});
        }

        //then we will check if the id is valid or not
        if(!mongoose.Types.ObjectId.isValid(id)) {
           return res.status(400).json({ success: false, message: "Invalid Order ID" });
        }

        //then we will get the order by the id and delete it 
        const order = await Order.findByIdAndDelete(id);

       //if the order does not exist we will return an error otherwise we will return success
       if(!order) {
           return res.status(404).json({ success: false, message: "Order not found" });
        }
        
        return res.status(200).json({ success: true, message: "Order deleted successfully" });

    } catch (error) {
        next(error);
    }
})