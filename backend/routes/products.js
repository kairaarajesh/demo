const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const TProduct = require('../models/TProduct');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search = '' } = req.query;
    const where = {};
    if (search) {
      where.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }
    const products = await Product.find(where).sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { vName, vNumber, vAddress, brand, pName, count, discount, pricePerUnit, dateAdded } = req.body;

    if (!pName || !brand ) 
      return res.status(400).json({ error: 'Brand and product name are required' });


    const productCount = parseInt(count) || 0;
    const productPrice = parseFloat(pricePerUnit) || 0;
    const discountAmount = parseFloat(discount) || 0;

    const subTotal = productCount * productPrice;

    const totalAmount = subTotal - discountAmount;

    const product = await Product.create({
     vName,
     vNumber,
     vAddress,
      brand,
      pName,
      count: productCount,
      pricePerUnit: productPrice,
      subTotal: subTotal,
      discount: discountAmount,
      totalAmount: totalAmount,
      dateAdded: dateAdded || new Date().toISOString().split('T')[0],
    });
    res.status(201).json({ product });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.body.count) req.body.count = parseInt(req.body.count);
    if (req.body.pricePerUnit) req.body.pricePerUnit = parseFloat(req.body.pricePerUnit);
    if (req.body.totalQuantity) req.body.totalQuantity = parseInt(req.body.totalQuantity);
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.post('/tproduct', async (req, res) => {
  try {
    const { productId, fBranchId, tBranchId,f_b_s_name, t_b_s_name,count,brand, notes } = req.body;

    if (!productId || !fBranchId || !tBranchId|| !count || !brand) {
      return res.status(400).json({ error: 'Product ID, from branch ID, to branch ID, count, and brand are required' });
    }

    const product = await Product.findById(productId).select('brand pName count');

    if( !product) {
      return res.status(404).json({ 
        status: "false",
        message: 'Product not found'
       });
    }

    if(product.count <= 0) {
      return res.status(400).json({
        status: "false",
        message: 'Insufficient product quantity for transfer'
      });
    }

    const tProduct = await TProduct.create({
      productId: productId,
      fBranchId,
      tBranchId,
      f_b_s_name,
      t_b_s_name,
      brand: product.brand,
      pName: product.pName,
      count,
      notes,
    });

    product .count -= count;
    await product.save();

    return res.status(201).json({ 
      status :"true",
      message: 'Transfer product created successfully',
      tProduct 
    });
  } catch (err) {
    console.error('Create transfer product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 

router.get('/tproduct', async (req, res) => {
  try {
    const tProducts = await TProduct.find().populate('productId', 'pName brand count').sort({ createdAt: -1 });
    res.json({ tProducts });
  }catch(error){
    return res.status(500).json({
      error: 'Internal server error', 
    })
  }
  });



module.exports = router;
