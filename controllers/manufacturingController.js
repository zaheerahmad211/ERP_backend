const BillOfMaterial = require('../models/BillOfMaterial');
const ProductionOrder = require('../models/ProductionOrder');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logAudit } = require('../middleware/auditLogger');

// ==========================================
// BILL OF MATERIALS (BOM)
// ==========================================
const getBOMs = async (req, res, next) => {
  try {
    const boms = await BillOfMaterial.find()
      .populate('finishedProduct', 'name sku sellingPrice stockQuantity')
      .populate('components.component', 'name sku purchasePrice stockQuantity')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Bills of Materials retrieved', boms);
  } catch (error) {
    next(error);
  }
};

const createBOM = async (req, res, next) => {
  try {
    const { finishedProduct, name, components, notes } = req.body;

    const count = await BillOfMaterial.countDocuments();
    const bomNumber = `BOM-${(count + 1001).toString()}`;

    let totalCost = 0;
    const processedComponents = components.map((c) => {
      const lineCost = c.quantity * c.unitCost;
      totalCost += lineCost;
      return {
        component: c.component,
        quantity: c.quantity,
        unitCost: c.unitCost,
        totalCost: lineCost,
      };
    });

    const bom = await BillOfMaterial.create({
      bomNumber,
      finishedProduct,
      name,
      components: processedComponents,
      totalCost,
      notes,
    });

    return successResponse(res, 'Bill of Material created successfully', bom, 201);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PRODUCTION ORDERS
// ==========================================
const getProductionOrders = async (req, res, next) => {
  try {
    const orders = await ProductionOrder.find()
      .populate('bom', 'bomNumber name')
      .populate('finishedProduct', 'name sku')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Production orders retrieved', orders);
  } catch (error) {
    next(error);
  }
};

const createProductionOrder = async (req, res, next) => {
  try {
    const { bomId, targetQuantity, dueDate, notes } = req.body;

    const bom = await BillOfMaterial.findById(bomId).populate('components.component');
    if (!bom) return errorResponse(res, 'Bill of Material not found', [], 404);

    const count = await ProductionOrder.countDocuments();
    const orderNumber = `PROD-${(count + 1001).toString()}`;

    const prodOrder = await ProductionOrder.create({
      orderNumber,
      bom: bom._id,
      finishedProduct: bom.finishedProduct,
      targetQuantity,
      dueDate,
      status: 'Planned',
      createdBy: req.user._id,
      notes,
    });

    return successResponse(res, 'Production order created', prodOrder, 201);
  } catch (error) {
    next(error);
  }
};

const updateProductionStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const prodOrder = await ProductionOrder.findById(req.params.id)
      .populate('bom')
      .populate('finishedProduct');

    if (!prodOrder) return errorResponse(res, 'Production order not found', [], 404);

    const prevStatus = prodOrder.status;
    prodOrder.status = status;

    if (status === 'Completed' && prevStatus !== 'Completed') {
      prodOrder.completionDate = new Date();
      prodOrder.producedQuantity = prodOrder.targetQuantity;

      // 1. Consume raw materials stock
      const bom = await BillOfMaterial.findById(prodOrder.bom._id || prodOrder.bom).populate('components.component');
      if (bom) {
        for (const item of bom.components) {
          const rawProd = await Product.findById(item.component._id || item.component);
          if (rawProd) {
            const consumedQty = item.quantity * prodOrder.targetQuantity;
            const prevStock = rawProd.stockQuantity;
            rawProd.stockQuantity = Math.max(0, rawProd.stockQuantity - consumedQty);
            await rawProd.save();

            await InventoryTransaction.create({
              product: rawProd._id,
              warehouse: rawProd.warehouse || null,
              type: 'OUT',
              quantity: consumedQty,
              previousStock: prevStock,
              currentStock: rawProd.stockQuantity,
              reference: prodOrder.orderNumber,
              notes: `Consumed for Production Order ${prodOrder.orderNumber}`,
              user: req.user._id,
            });
          }
        }
      }

      // 2. Increase finished product stock
      const finishedProd = await Product.findById(prodOrder.finishedProduct._id || prodOrder.finishedProduct);
      if (finishedProd) {
        const prevFinishedStock = finishedProd.stockQuantity;
        finishedProd.stockQuantity += prodOrder.targetQuantity;
        await finishedProd.save();

        await InventoryTransaction.create({
          product: finishedProd._id,
          warehouse: finishedProd.warehouse || null,
          type: 'IN',
          quantity: prodOrder.targetQuantity,
          previousStock: prevFinishedStock,
          currentStock: finishedProd.stockQuantity,
          reference: prodOrder.orderNumber,
          notes: `Finished goods output from Production Order ${prodOrder.orderNumber}`,
          user: req.user._id,
        });
      }
    }

    await prodOrder.save();

    await logAudit({
      req,
      action: 'UPDATE',
      moduleName: 'Manufacturing',
      recordId: prodOrder._id.toString(),
      newData: { orderNumber: prodOrder.orderNumber, status },
    });

    return successResponse(res, `Production Order status updated to '${status}'`, prodOrder);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBOMs,
  createBOM,
  getProductionOrders,
  createProductionOrder,
  updateProductionStatus,
};
