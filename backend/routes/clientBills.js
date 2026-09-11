const express = require('express');
const router = express.Router();
const ClientBill = require('../models/ClientBill');
const Client = require('../models/Client');
const CustomerMessage = require('../models/CustomerMessage.js');
const { authenticateToken } = require('../middleware/auth');
const { imageMulter, uploadImage } = require( "../middleware/imagemulter.js");

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });


require("dotenv").config();

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// GET /api/client-bills — list all bills (with optional clientId filter)
router.get('/', async (req, res) => {
  try {
    const { clientId = '', status = '', paymentMethod = '', dateFrom = '', dateTo = '' } = req.query;
    const where = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.$gte = dateFrom;
      if (dateTo) where.date.$lte = dateTo;
    }
    const bills = await ClientBill.find(where)
      .populate('clientId', 'name phone email')
      .populate('services.staffId', 'name')
      .sort({ createdAt: -1 });

    const result = bills.map(b => {
      const obj = b.toObject();
      // obj.client = obj.clientId;
      // Normalize staffName from populated staffId
      obj.services = obj.services.map(s => ({
        ...s,
        staffName: s.staffId?.name || s.staffName || '',
        staffId: s.staffId?._id || s.staffId,
      }));
      return obj;
    });
    res.json({ bills: result });
  } catch (err) {
    console.error('Get client bills error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/client-bills/:id — get single bill
router.get('/:id', async (req, res) => {
  try {
    const bill = await ClientBill.findById(req.params.id)
      .populate('clientId', 'name phone email')
      .populate('services.staffId', 'name');
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    const obj = bill.toObject();

    // obj.client = obj.clientId;
    obj.services = obj.services.map(s => ({
      ...s,
      staffName: s.staffId?.name || s.staffName || '',
      staffId: s.staffId?._id || s.staffId,
    }));
    res.json({ bill: obj });
  } catch (err) {
    console.error('Get bill error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/client-bills — create a new bill
router.post('/', async (req, res) => {
  try {
    const {
      clientId, services, discount, taxPercent, paymentMethod, status, date
    } = req.body;

    if (!clientId) return res.status(400).json({ error: 'Client is required' });

      if (
        services.some(
          (s) => !s.serviceId && !s.serviceComboId
        )
      ) {
        return res.status(400).json({
          error: "Each service must have either serviceId or serviceComboId",
        });
      }


    // Calculate amounts
    const billServices = services.map(s => ({
      serviceId: s.serviceId || null,
      serviceComboId: s.serviceComboId || null,
      serviceName: s.serviceName,
      amount: parseFloat(s.amount) || 0,
      quantity: parseInt(s.quantity) || 1,
      serviceAmount: (parseFloat(s.amount) || 0) * (parseInt(s.quantity) || 1),
      staffId: s.staffId || null,
      staffName: s.staffName || '',
    }));

    const subtotal = billServices.reduce((sum, s) => sum + s.serviceAmount, 0);
    const discountPercent = parseFloat(discount) || 0;

    if (discountPercent < 0 || discountPercent > 100) { return res.status(400).json({ error: 'Discount must be between 0 and 100%' }); }

    const discountAmount = (subtotal * discountPercent) / 100;

    const clientAmount = subtotal - discountAmount;
    const taxPercentVal = 5;
    const taxAmount = (clientAmount * taxPercentVal) / 100;
    const totalAmount = clientAmount + taxAmount;
    
      if (!Array.isArray(paymentMethod) || paymentMethod.length === 0) {
        return res.status(400).json({
          error: "At least one payment method is required"
        });
      }

      for (const payment of paymentMethod) { const keys = Object.keys(payment); if (keys.length === 0) { return res.status(400).json({ error: "Payment method cannot be empty" }); }

      for (const key of keys) { if ( payment[key] === "" || payment[key] === null || payment[key] === undefined ) { return res.status(400).json({ error: `${key} value is required` }); } } }
      
    const bill = await ClientBill.create({
      clientId,
      services: billServices,
      subtotal,
      discount: discountPercent,
      discountAmount,
      clientAmount,
      taxPercent: taxPercentVal,
      taxAmount,
      totalAmount,
      paymentMethod : paymentMethod,
      
      status: status || 'paid',
      date: date || new Date().toISOString().split('T')[0],
    });
    
    res.status(201).json({ 
      message : "client bill create sucessfully",
      data : bill
     });
  } catch (err) {
    console.error('Create bill error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// whatsapp Invoice send     /api/clients/whatsapp
router.post("/whatsapp", upload.single("file"), async (req, res) => {
  try {
    let { phone, billId } = req.body;

    // Validate phone
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    // Convert to WhatsApp format
    phone = phone.replace(/\D/g, "");

    if (phone.length === 10) {
      phone = "91" + phone;
    }

    // Check file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "PDF file not found",
      });
    }

    // Upload PDF
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", "application/pdf");
    form.append("file", fs.createReadStream(filePath), fileName);


    const uploadResponse = await axios.post(
      `https://omni.chennaisms.com/v24.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`,
      form,
      {
        headers: {
          authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          ...form.getHeaders(),
        },
      }
    );

    const mediaId = uploadResponse.data.id;

    if (!mediaId) {
      return res.status(400).json({
        success: false,
        message: "Media upload failed",
        data: uploadResponse.data,
      });
    }

    // WhatsApp payload
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "template",
      template: {
        name: "apicheck",
        language: {
          code: "en",
        },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "document",
                document: {
                  id: mediaId,
                  filename: fileName,
                },
              },
            ],
          },
          {
            type: "body",
            parameters: [],
          },
        ],
      },
      biz_opaque_callback_data: billId
        ? `Invoice_${billId}`
        : "Invoice",
    };

    // Send WhatsApp message
    const messageResponse = await axios.post(
      `https://omni.chennaisms.com/v24.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  
    // Delete uploaded temp file
    fs.unlink(filePath, (err) => {
      if (err) console.error("File delete error:", err);
    });

    return res.status(200).json({
      success: true,
      message: "WhatsApp message sent successfully",
      mediaId,
      response: messageResponse.data,
    });

  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});


// multiple customer whatsapp  message send 
router.post(
  "/multiple/customer",
  imageMulter.fields([
    {
      name: "image",
      maxCount: 1
    }
  ]),
  async (req, res) => {
    try {
      const { title, description } = req.body;
      const removeHtmlTags = (html) => { return String(html || "")
         .replace(/<[^>]*>/g, "") .replace(/&nbsp;/gi, " ")
         .replace(/&amp;/gi, "&") .replace(/&lt;/gi, "<") .replace(/&gt;/gi, ">") .replace(/&quot;/gi, '"') .replace(/&#39;/gi, "'")
         .replace(/\s+/g, " ").trim(); };


      const cleanDescription = removeHtmlTags(description);

      if (!title || !cleanDescription) {
        return res.status(400).json({
          status: false,
          message: "Title and description are required"
        });
      }

      let image = null;

      if (req.files?.image?.[0]) {
        const result = await uploadImage(req.files.image[0]);
        image = result.secure_url;
      }

      if (!image) {
        return res.status(400).json({
          status: false,
          message: "Image is required"
        });
      }

      const customers = await Client.find()
        .select("phone -_id")
        .lean();

      const phoneNumbers = customers
        .map((customer) => String(customer.phone).trim())
        .filter(Boolean);


      if (phoneNumbers.length === 0) {
        return res.status(404).json({
          status: false,
          message: "No customer phone numbers found"
        });
      }

      const message = await CustomerMessage.create({
        title,
        description: cleanDescription,
        image,
        phoneNumbers
      });

      const whatsappResults = [];

      for (const phone of phoneNumbers) {
        try {
          const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phone,
            type: "template",

            template: {
              name: "customer_message",

              language: {
                code: "en_GB"
              },
              components: [
                {
                  type: "header",
                  parameters: [
                    {
                      type: "image",
                      image: {
                        link: image
                      }
                    }
                  ]
                },

                {
                  type: "body",
                  parameters: [
                    {
                      type: "text",
                      text: title
                    },
                    {
                      type: "text",
                      text: cleanDescription
                    }
                  ]
                }
              ]
            },

            biz_opaque_callback_data: ""
          };

          console.log(
            `WhatsApp request for ${phone}:`,
            JSON.stringify(payload, null, 2)
          );

          const messageResponse = await axios.post(
            `https://omni.chennaisms.com/v24.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            payload,
            {
              headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
              }
            }
          );

          console.log(
            `WhatsApp response for ${phone}:`,
            messageResponse.data
          );

          whatsappResults.push({
            phone,
            success: true,
            response: messageResponse.data
          });

        } catch (error) {
          console.error(
            `WhatsApp send failed for ${phone}:`,
            error.response?.data || error.message
          );

          whatsappResults.push({
            phone,
            success: false,
            error: error.response?.data || error.message
          });
        }
      }

      return res.status(201).json({
        status: true,
        message: "Customer message created and WhatsApp messages processed",
        data: {
          message,
          totalCustomers: phoneNumbers.length,
          sent: whatsappResults.filter(
            (item) => item.success
          ).length,
          failed: whatsappResults.filter(
            (item) => !item.success
          ).length,
          whatsappResults
        }
      });

    } catch (error) {
      console.error(
        "Customer message error:",
        error.response?.data || error.message
      );

      return res.status(500).json({
        status: false,
        message: "Server error",
        error: error.response?.data || error.message
      });
    }
  }
);      


// PUT /api/client-bills/:id — update a bill
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      services, discount, taxPercent, paymentMethod, status, date
    } = req.body;

    const updateData = {};

    if (services && services.length) {
      const billServices = services.map(s => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        amount: parseFloat(s.amount) || 0,
        quantity: parseInt(s.quantity) || 1,
        serviceAmount: (parseFloat(s.amount) || 0) * (parseInt(s.quantity) || 1),
        staffId: s.staffId || null,
        staffName: s.staffName || '',
      }));
      updateData.services = billServices;
      updateData.subtotal = billServices.reduce((sum, s) => sum + s.serviceAmount, 0);
    }

    if (discount !== undefined) {
      updateData.discount = parseFloat(discount) || 0;
    }

    if (taxPercent !== undefined) {
      updateData.taxPercent = parseFloat(taxPercent) || 0;
    }

    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (status) updateData.status = status;
    if (date) updateData.date = date;

    // Recalculate amounts
    const bill = await ClientBill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const sub = updateData.subtotal !== undefined ? updateData.subtotal : bill.subtotal;
    const disc = updateData.discount !== undefined ? updateData.discount : bill.discount;
    const clientAmount = sub - disc;
    const taxP = updateData.taxPercent !== undefined ? updateData.taxPercent : bill.taxPercent;
    const taxAmount = (clientAmount * taxP) / 100;
    const totalAmount = clientAmount + taxAmount;

    updateData.clientAmount = clientAmount;
    updateData.taxAmount = taxAmount;
    updateData.totalAmount = totalAmount;

    const updated = await ClientBill.findByIdAndUpdate(req.params.id, updateData, { returnDocument: "after", runValidators: true })
      .populate('clientId', 'name phone email')
      .populate('services.staffId', 'name');

    const obj = updated.toObject();
    obj.client = obj.clientId;
    obj.services = obj.services.map(s => ({
      ...s,
      staffName: s.staffId?.name || s.staffName || '',
      staffId: s.staffId?._id || s.staffId,
    }));

    res.json({ bill: obj });
  } catch (err) {
    console.error('Update bill error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/client-bills/:id — delete a bill
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const bill = await ClientBill.findByIdAndDelete(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete bill error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});






module.exports = router;