const mongoose = require('mongoose');

const tProductSchema = new mongoose.Schema({

    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    fBranchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    tBranchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    brand: { type: String, required: true },
    count: { type: Number, required: true },
    f_b_s_name: { type: String, required: true },
    t_b_s_name: { type: String, required: true },
    notes: { type: String, required: false },
    notes: { type: String, required: false },
}, { timestamps: true });


module.exports = mongoose.model('TProduct', tProductSchema);
