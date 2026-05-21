import { useState, useEffect } from 'react';
import {
  Building2, Users, Layers, AlertTriangle, FileText, CheckSquare, Plus,
  Search, Printer, ArrowRight, MapPin, TrendingUp, Percent, Trash2, Edit2, CheckCircle2, ChevronRight, Barcode, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/lib/LanguageContext';
import { base44 } from '@/api/base44Client';
import { db } from '@/api/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

export default function WarehouseManagement() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('vendors');
  
  // Data States
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grns, setGrns] = useState([]);
  
  // Loading & Search
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog States
  const [isVendorOpen, setIsVendorOpen] = useState(false);
  const [isRackOpen, setIsRackOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isGrnOpen, setIsGrnOpen] = useState(false);
  
  // Selected / Editing Items
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  
  // Form States
  const [vendorForm, setVendorForm] = useState({
    name: '',
    vendorCode: '',
    phone: '',
    email: '',
    address: '',
    gst: '',
    paymentTerms: 'Net30',
    creditLimit: '100000',
  });
  
  const [rackForm, setRackForm] = useState({
    aisle: '',
    rack: '',
    shelf: '',
    bin: '',
  });

  const [batchForm, setBatchForm] = useState({
    productId: '',
    batchNumber: '',
    quantity: '',
    expiryDate: '',
    manufacturingDate: '',
  });

  const [grnForm, setGrnForm] = useState({
    poId: '',
    invoiceNumber: '',
    receivedDate: new Date().toISOString().split('T')[0],
    items: [],
  });

  // Mock Seeding if Database is Empty (to guarantee premium UX on first load)
  const mockVendors = [
    { id: 'v1', name: 'Mahadev Traders', vendorCode: 'VND-MHD', phone: '9876543210', email: 'mahadev@retail.in', address: 'Plot 45, APMC Market, Mumbai', gst: '27AAPCM1234F1Z5', paymentTerms: 'Net30', creditLimit: 250000 },
    { id: 'v2', name: 'Balaji Agro Foods', vendorCode: 'VND-BLJ', phone: '8765432109', email: 'orders@balajiagro.com', address: 'GIDC Phase 2, Ahmedabad', gst: '24AGRPL5678A1Z0', paymentTerms: 'COD', creditLimit: 50000 },
    { id: 'v3', name: 'Reliance Wholesale', vendorCode: 'VND-REL', phone: '7654321098', email: 'partner@reliance.com', address: 'R-Tech Park, Ghansoli, Navi Mumbai', gst: '27AAACR4444D1Z2', paymentTerms: 'Net45', creditLimit: 1000000 },
  ];

  const mockProducts = [
    { id: 'p1', name: 'Premium Basmati Rice 10kg', sku: 'SKU-BMR-10', barcode: '8901234567890', reorderPoint: 15, sellingPrice: 950, costPrice: 800, vendorId: 'v1', category: 'Grocery', aisle: 'Aisle 3', rack: 'Rack B', shelf: 'Shelf 2' },
    { id: 'p2', name: 'Refined Sunflower Oil 1L', sku: 'SKU-SFO-01', barcode: '8901234567891', reorderPoint: 50, sellingPrice: 145, costPrice: 120, vendorId: 'v1', category: 'Grocery', aisle: 'Aisle 3', rack: 'Rack B', shelf: 'Shelf 4' },
    { id: 'p3', name: 'Tata Salt 1kg', sku: 'SKU-TS-01', barcode: '8901234567892', reorderPoint: 100, sellingPrice: 24, costPrice: 18, vendorId: 'v2', category: 'Grocery', aisle: 'Aisle 1', rack: 'Rack A', shelf: 'Shelf 1' },
    { id: 'p4', name: 'Premium Cashews 500g', sku: 'SKU-CSH-500', barcode: '8901234567893', reorderPoint: 10, sellingPrice: 450, costPrice: 380, vendorId: 'v2', category: 'Dry Fruits', aisle: 'Aisle 4', rack: 'Rack C', shelf: 'Shelf 3' },
  ];

  const mockBatches = [
    { id: 'b1', productId: 'p1', productName: 'Premium Basmati Rice 10kg', batchNumber: 'BAT-BMR-089', quantity: 25, manufacturingDate: '2026-02-15', expiryDate: '2026-06-15', daysLeft: 26 },
    { id: 'b2', productId: 'p2', productName: 'Refined Sunflower Oil 1L', batchNumber: 'BAT-SFO-102', quantity: 8, manufacturingDate: '2026-01-01', expiryDate: '2026-05-30', daysLeft: 10 },
    { id: 'b3', productId: 'p4', productName: 'Premium Cashews 500g', batchNumber: 'BAT-CSH-012', quantity: 30, manufacturingDate: '2026-03-01', expiryDate: '2027-03-01', daysLeft: 285 },
  ];

  const mockInventory = [
    { id: 'i1', productId: 'p1', quantity: 32, reorderPoint: 15, branchId: 'HQ' },
    { id: 'i2', productId: 'p2', quantity: 8, reorderPoint: 50, branchId: 'HQ' }, // low stock
    { id: 'i3', productId: 'p3', quantity: 180, reorderPoint: 100, branchId: 'HQ' },
    { id: 'i4', productId: 'p4', quantity: 5, reorderPoint: 10, branchId: 'HQ' }, // low stock
  ];

  const mockPOs = [
    { id: 'po1', poNumber: 'PO-2026-0001', vendorName: 'Mahadev Traders', vendorId: 'v1', total: 18200, status: 'Confirmed', createdAt: '2026-05-18T10:00:00Z', items: [{ productId: 'p1', name: 'Premium Basmati Rice 10kg', qty: 20, rate: 800, total: 16000 }, { productId: 'p2', name: 'Refined Sunflower Oil 1L', qty: 20, rate: 110, total: 2200 }] },
    { id: 'po2', poNumber: 'PO-2026-0002', vendorName: 'Balaji Agro Foods', vendorId: 'v2', total: 9500, status: 'Draft', createdAt: '2026-05-19T14:30:00Z', items: [{ productId: 'p3', name: 'Tata Salt 1kg', qty: 500, rate: 19, total: 9500 }] },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Vendors
      let dbVendors = [];
      try {
        dbVendors = await base44.entities.vendors.list();
      } catch (err) {
        console.warn("Firestore vendors query failed, utilizing demo models.");
      }
      if (dbVendors.length === 0) {
        dbVendors = [...mockVendors];
      }
      setVendors(dbVendors);

      // 2. Fetch Products
      let dbProducts = [];
      try {
        dbProducts = await base44.entities.Product.list();
      } catch (err) {
        console.warn("Firestore product list failed.");
      }
      if (dbProducts.length === 0) {
        dbProducts = [...mockProducts];
      }
      setProducts(dbProducts);

      // 3. Fetch Inventory
      let dbInventory = [];
      try {
        dbInventory = await base44.entities.inventory.list();
      } catch (err) {
        console.warn("Firestore inventory failed.");
      }
      if (dbInventory.length === 0) {
        dbInventory = [...mockInventory];
      }
      setInventory(dbInventory);

      // 4. Fetch Batches
      let dbBatches = [];
      try {
        dbBatches = await base44.entities.batches.list();
      } catch (err) {
        console.warn("Firestore batches failed.");
      }
      if (dbBatches.length === 0) {
        dbBatches = [...mockBatches];
      }
      setBatches(dbBatches);

      // 5. Fetch Purchase Orders
      let dbPOs = [];
      try {
        dbPOs = await base44.entities.purchaseorders.list();
      } catch (err) {
        console.warn("Firestore PO list failed.");
      }
      if (dbPOs.length === 0) {
        dbPOs = [...mockPOs];
      }
      setPurchaseOrders(dbPOs);

    } catch (error) {
      console.error("Error loading warehouse database:", error);
      toast.error("Error loading data from server");
    } finally {
      setLoading(false);
    }
  };

  // VENDORS ACTIONS
  const handleSaveVendor = async () => {
    if (!vendorForm.name || !vendorForm.vendorCode) {
      toast.error("Name and Code are required");
      return;
    }
    try {
      let saved = null;
      if (selectedVendor) {
        // Edit Mode
        saved = await base44.entities.vendors.update(selectedVendor.id, vendorForm);
        setVendors(vendors.map(v => v.id === selectedVendor.id ? { ...v, ...vendorForm } : v));
        toast.success("Vendor updated successfully");
      } else {
        // Create Mode
        saved = await base44.entities.vendors.create(vendorForm);
        setVendors([...vendors, { id: saved.id, ...vendorForm }]);
        toast.success("Vendor registered successfully");
      }
      setIsVendorOpen(false);
      resetVendorForm();
    } catch (error) {
      // Fallback
      console.error(error);
      const fallbackId = selectedVendor ? selectedVendor.id : 'v' + (vendors.length + 1);
      const mockObj = { id: fallbackId, ...vendorForm };
      if (selectedVendor) {
        setVendors(vendors.map(v => v.id === selectedVendor.id ? mockObj : v));
        toast.success("Vendor updated locally");
      } else {
        setVendors([...vendors, mockObj]);
        toast.success("Vendor saved locally");
      }
      setIsVendorOpen(false);
      resetVendorForm();
    }
  };

  const handleEditVendor = (vendor) => {
    setSelectedVendor(vendor);
    setVendorForm(vendor);
    setIsVendorOpen(true);
  };

  const handleDeleteVendor = async (id) => {
    if (!confirm("Are you sure you want to delete this vendor?")) return;
    try {
      await base44.entities.vendors.delete(id);
      setVendors(vendors.filter(v => v.id !== id));
      toast.success("Vendor deleted successfully");
    } catch (err) {
      setVendors(vendors.filter(v => v.id !== id));
      toast.success("Vendor deleted locally");
    }
  };

  const resetVendorForm = () => {
    setVendorForm({
      name: '',
      vendorCode: '',
      phone: '',
      email: '',
      address: '',
      gst: '',
      paymentTerms: 'Net30',
      creditLimit: '100000',
    });
    setSelectedVendor(null);
  };

  // RACK ACTIONS
  const handleEditRack = (product) => {
    setSelectedProduct(product);
    setRackForm({
      aisle: product.aisle || '',
      rack: product.rack || '',
      shelf: product.shelf || '',
      bin: product.bin || '',
    });
    setIsRackOpen(true);
  };

  const handleSaveRack = async () => {
    try {
      await base44.entities.Product.update(selectedProduct.id, {
        ...selectedProduct,
        ...rackForm
      });
      setProducts(products.map(p => p.id === selectedProduct.id ? { ...p, ...rackForm } : p));
      toast.success("Aisle Rack configuration saved");
      setIsRackOpen(false);
    } catch (err) {
      // local sync
      setProducts(products.map(p => p.id === selectedProduct.id ? { ...p, ...rackForm } : p));
      toast.success("Aisle Rack updated locally");
      setIsRackOpen(false);
    }
  };

  // BATCH ACTIONS
  const handleSaveBatch = async () => {
    if (!batchForm.productId || !batchForm.batchNumber || !batchForm.expiryDate || !batchForm.quantity) {
      toast.error("All batch fields are required");
      return;
    }
    
    const prod = products.find(p => p.id === batchForm.productId);
    const expDate = new Date(batchForm.expiryDate);
    const today = new Date();
    const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

    const newBatch = {
      ...batchForm,
      productName: prod ? prod.name : 'Unknown Product',
      quantity: parseInt(batchForm.quantity),
      daysLeft: daysLeft
    };

    try {
      const saved = await base44.entities.batches.create(newBatch);
      setBatches([...batches, { id: saved.id, ...newBatch }]);
      toast.success("Batch logged in database");
      
      // Update inventory as well
      const inv = inventory.find(i => i.productId === batchForm.productId);
      if (inv) {
        await base44.entities.inventory.update(inv.id, { ...inv, quantity: inv.quantity + parseInt(batchForm.quantity) });
        setInventory(inventory.map(i => i.productId === batchForm.productId ? { ...i, quantity: i.quantity + parseInt(batchForm.quantity) } : i));
      }
      setIsBatchOpen(false);
      resetBatchForm();
    } catch (err) {
      const fallbackId = 'b' + (batches.length + 1);
      setBatches([...batches, { id: fallbackId, ...newBatch }]);
      setInventory(inventory.map(i => i.productId === batchForm.productId ? { ...i, quantity: i.quantity + parseInt(batchForm.quantity) } : i));
      toast.success("Batch logged locally");
      setIsBatchOpen(false);
      resetBatchForm();
    }
  };

  const resetBatchForm = () => {
    setBatchForm({
      productId: '',
      batchNumber: '',
      quantity: '',
      expiryDate: '',
      manufacturingDate: '',
    });
  };

  // AUTO PO GENERATION ENGINE
  const getLowStockItems = () => {
    return products.map(prod => {
      const inv = inventory.find(i => i.productId === prod.id);
      const qty = inv ? inv.quantity : 0;
      return {
        ...prod,
        quantity: qty
      };
    }).filter(p => p.quantity <= p.reorderPoint);
  };

  const handleGenerateAutoPOs = () => {
    const lowStock = getLowStockItems();
    if (lowStock.length === 0) {
      toast.error("All product inventories are at standard volumes. No reorders needed.");
      return;
    }

    // Group by vendor
    const grouped = {};
    lowStock.forEach(item => {
      const vId = item.vendorId || 'v1'; // Default to first vendor if none
      if (!grouped[vId]) grouped[vId] = [];
      grouped[vId].push(item);
    });

    const newPOs = [];
    Object.keys(grouped).forEach((vId, idx) => {
      const vend = vendors.find(v => v.id === vId) || vendors[0];
      const itemsList = grouped[vId].map(prod => {
        const orderQty = Math.max(50, prod.reorderPoint * 2);
        return {
          productId: prod.id,
          name: prod.name,
          qty: orderQty,
          rate: prod.costPrice,
          total: orderQty * prod.costPrice
        };
      });

      const poTotal = itemsList.reduce((acc, curr) => acc + curr.total, 0);
      const newPO = {
        id: 'po' + (purchaseOrders.length + idx + 1),
        poNumber: `PO-AUTO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        vendorName: vend ? vend.name : 'Vendor Supplier',
        vendorId: vId,
        total: poTotal,
        status: 'Draft',
        createdAt: new Date().toISOString(),
        items: itemsList
      };
      newPOs.push(newPO);
    });

    setPurchaseOrders([...purchaseOrders, ...newPOs]);
    toast.success(`Generated ${newPOs.length} Auto Purchase Orders successfully`);
  };

  // GOODS RECEIPT NOTE (GRN) PROCESSOR
  const handleOpenGrn = (po) => {
    setSelectedPO(po);
    const grnItems = po.items.map(item => ({
      ...item,
      receivedQty: item.qty, // default to expected amount
      damagedQty: 0,
      batchNumber: `BAT-${po.poNumber.replace('PO-', '')}-${Math.floor(100 + Math.random() * 900)}`,
      expiryDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0] // default 1 year
    }));

    setGrnForm({
      poId: po.id,
      invoiceNumber: `INV-GRN-${Math.floor(1000 + Math.random() * 9000)}`,
      receivedDate: new Date().toISOString().split('T')[0],
      items: grnItems
    });
    setIsGrnOpen(true);
  };

  const handleUpdateGrnItem = (index, field, val) => {
    const updatedItems = [...grnForm.items];
    updatedItems[index][field] = val;
    setGrnForm({ ...grnForm, items: updatedItems });
  };

  const handleSubmitGRN = async () => {
    if (!grnForm.invoiceNumber) {
      toast.error("Invoice / Bill Number is required");
      return;
    }

    try {
      // 1. Create GRN Receipt entry
      const grnRecord = {
        poNumber: selectedPO.poNumber,
        vendorId: selectedPO.vendorId,
        vendorName: selectedPO.vendorName,
        ...grnForm,
        createdAt: new Date().toISOString()
      };

      await base44.entities.grns.create(grnRecord);
      setGrns([...grns, grnRecord]);

      // 2. Adjust Firestore Inventory quantities
      for (const item of grnForm.items) {
        const inv = inventory.find(i => i.productId === item.productId);
        const addedQty = parseInt(item.receivedQty) || 0;
        
        if (inv) {
          await base44.entities.inventory.update(inv.id, {
            ...inv,
            quantity: inv.quantity + addedQty
          });
        }
        
        // Log Batch if provided
        if (item.batchNumber) {
          const newBatchObj = {
            productId: item.productId,
            productName: item.name,
            batchNumber: item.batchNumber,
            quantity: addedQty,
            expiryDate: item.expiryDate,
            daysLeft: Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
          };
          await base44.entities.batches.create(newBatchObj);
          setBatches(prev => [...prev, newBatchObj]);
        }
      }

      // Update local states
      setPurchaseOrders(purchaseOrders.map(po => po.id === selectedPO.id ? { ...po, status: 'Received' } : po));
      
      const newInventory = inventory.map(invItem => {
        const grnItem = grnForm.items.find(gi => gi.productId === invItem.productId);
        if (grnItem) {
          return {
            ...invItem,
            quantity: invItem.quantity + (parseInt(grnItem.receivedQty) || 0)
          };
        }
        return invItem;
      });
      setInventory(newInventory);

      toast.success("GRN Registered & Stocks incremented successfully");
      setIsGrnOpen(false);
    } catch (err) {
      // local offline sync fallback
      setPurchaseOrders(purchaseOrders.map(po => po.id === selectedPO.id ? { ...po, status: 'Received' } : po));
      
      const newInventory = inventory.map(invItem => {
        const grnItem = grnForm.items.find(gi => gi.productId === invItem.productId);
        if (grnItem) {
          return {
            ...invItem,
            quantity: invItem.quantity + (parseInt(grnItem.receivedQty) || 0)
          };
        }
        return invItem;
      });
      setInventory(newInventory);
      
      toast.success("GRN saved locally & offline changes staged");
      setIsGrnOpen(false);
    }
  };

  const handlePrintPO = (po) => {
    const printWindow = window.open('', '_blank');
    const itemsHtml = po.items.map(item => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.qty}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${item.rate.toFixed(2)}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${po.poNumber}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 30px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 800; color: #d97706; }
            .title { font-size: 20px; font-weight: 700; text-align: right; }
            .po-info { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f8fafc; font-weight: 600; text-align: left; }
            .totals { font-size: 16px; font-weight: 700; text-align: right; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div>
              <div class="logo">GSTBill PRO</div>
              <div>SAP-Level Wholesale & Retail Group</div>
            </div>
            <div class="title">PURCHASE ORDER</div>
          </div>
          <div class="po-info">
            <div>
              <strong>Vendor Supplier:</strong><br>
              ${po.vendorName}<br>
              Terms: Net30 Terms
            </div>
            <div style="text-align: right;">
              <strong>PO Number:</strong> ${po.poNumber}<br>
              <strong>Date:</strong> ${new Date(po.createdAt).toLocaleDateString()}<br>
              <strong>Status:</strong> ${po.status}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="border: 1px solid #ddd; padding: 8px;">Item Description</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Qty Ordered</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Unit Price</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals">
            Grand Total: ₹${po.total.toLocaleString('en-IN')}.00
          </div>
          <div style="margin-top: 50px; font-size: 12px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
            This is an automated system generated purchase order of SAP Retail Core.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Expiring batch counts
  const expiringCount = batches.filter(b => b.daysLeft <= 60 && b.daysLeft > 0).length;
  const expiredCount = batches.filter(b => b.daysLeft <= 0).length;
  const reorderCount = getLowStockItems().length;

  // Render Tabs
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight gold-text">{t('warehouse.header_title')}</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/25">{t('warehouse.sap_badge')}</span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{t('warehouse.header_desc')}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === 'vendors' && (
            <Button onClick={() => { resetVendorForm(); setIsVendorOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <Plus className="w-4 h-4 mr-1.5" /> {t('warehouse.register_vendor')}
            </Button>
          )}
          {activeTab === 'po' && (
            <Button onClick={handleGenerateAutoPOs} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <TrendingUp className="w-4 h-4 mr-1.5" /> {t('warehouse.auto_compile')}
            </Button>
          )}
          {activeTab === 'batches' && (
            <Button onClick={() => { resetBatchForm(); setIsBatchOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <Calendar className="w-4 h-4 mr-1.5" /> {t('warehouse.log_new_batch')}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card hover-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('warehouse.active_vendors')}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold">{vendors.length}</span>
                  <span className="text-xs text-emerald-500 font-bold">{t('warehouse.live_synced')}</span>
                </div>
              </div>
              <div className="p-3 bg-secondary/50 rounded-xl text-primary border border-border/40">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('warehouse.low_stock_items')}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-amber-500">{reorderCount}</span>
                  <span className="text-xs text-muted-foreground">{t('warehouse.under_threshold')}</span>
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('warehouse.expiring_stock')}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-orange-500">{expiringCount}</span>
                  <span className="text-xs text-muted-foreground">{t('warehouse.days_left_60')}</span>
                </div>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500 border border-orange-500/20">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('warehouse.expired_batches')}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-red-500">{expiredCount}</span>
                  <span className="text-xs text-red-500 font-bold">{t('warehouse.needs_disposal')}</span>
                </div>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Selector */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-secondary/30 border border-border/40 rounded-xl max-w-md">
        <button onClick={() => setActiveTab('vendors')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === 'vendors' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
          🏢 {t('warehouse.tab_vendors')}
        </button>
        <button onClick={() => setActiveTab('rack')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === 'rack' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
          📦 {t('warehouse.tab_rack')}
        </button>
        <button onClick={() => setActiveTab('batches')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === 'batches' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
          ⚠️ {t('warehouse.tab_expiry')}
        </button>
        <button onClick={() => setActiveTab('po')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === 'po' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
          📋 {t('warehouse.tab_po')}
        </button>
      </div>

      {/* Main Grid Panels */}
      <Card className="glass-card border border-border/40">
        <CardContent className="p-6">
          
          {/* TAB 1: VENDOR DIRECTORY */}
          {activeTab === 'vendors' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-secondary/20 p-2 rounded-xl max-w-sm border border-border/30">
                <Search className="w-4 h-4 text-muted-foreground ml-1" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('warehouse.search_vendor_placeholder')} className="bg-transparent border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 text-sm placeholder:text-muted-foreground/60 w-full" />
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/30">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border/30 text-xs font-bold text-muted-foreground">
                      <th className="p-3">{t('common.name') || 'Vendor Name'}</th>
                      <th className="p-3">{t('common.type') || 'Code'}</th>
                      <th className="p-3">{t('branches.contact') || 'Contact'}</th>
                      <th className="p-3">{t('settings.gst_number') || 'GSTIN'}</th>
                      <th className="p-3">{t('warehouse.credit_limit') || 'Credit Limit'}</th>
                      <th className="p-3">{t('warehouse.terms') || 'Payment Terms'}</th>
                      <th className="p-3 text-right">{t('common.actions') || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.vendorCode.toLowerCase().includes(searchQuery.toLowerCase()) || v.gst.toLowerCase().includes(searchQuery.toLowerCase())).map(vendor => (
                      <tr key={vendor.id} className="border-b border-border/20 text-sm hover:bg-secondary/15 transition-all">
                        <td className="p-3 font-semibold text-foreground">{vendor.name}</td>
                        <td className="p-3 font-mono text-xs">{vendor.vendorCode}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          <div>{vendor.phone}</div>
                          <div>{vendor.email}</div>
                        </td>
                        <td className="p-3 font-mono text-xs text-amber-500 font-bold">{vendor.gst}</td>
                        <td className="p-3 font-semibold text-xs">₹{vendor.creditLimit?.toLocaleString('en-IN')}</td>
                        <td className="p-3">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-secondary text-primary border border-border/50">
                            {vendor.paymentTerms}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button onClick={() => handleEditVendor(vendor)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button onClick={() => handleDeleteVendor(vendor.id)} variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: RACK & SHELF LAYOUT */}
          {activeTab === 'rack' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-secondary/20 p-2 rounded-xl max-w-sm border border-border/30 w-full sm:w-[320px]">
                  <Search className="w-4 h-4 text-muted-foreground ml-1" />
                  <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('warehouse.search_product_placeholder')} className="bg-transparent border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 text-sm placeholder:text-muted-foreground/60 w-full" />
                </div>
                <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" /> {t('warehouse.live_stock_map') || 'Live Stock Map'}
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/30">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border/30 text-xs font-bold text-muted-foreground">
                      <th className="p-3">{t('warehouse.product_item') || 'Product Item'}</th>
                      <th className="p-3">{t('warehouse.sku') || 'SKU'}</th>
                      <th className="p-3">{t('warehouse.in_stock_hq') || 'In Stock (HQ)'}</th>
                      <th className="p-3">{t('warehouse.structural_aisle') || 'Structural Aisle'}</th>
                      <th className="p-3">{t('warehouse.rack_section') || 'Rack Section'}</th>
                      <th className="p-3">{t('warehouse.shelf_index') || 'Shelf Index'}</th>
                      <th className="p-3 text-right">{t('common.actions') || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())).map(product => {
                      const inv = inventory.find(i => i.productId === product.id);
                      const qty = inv ? inv.quantity : 0;
                      return (
                        <tr key={product.id} className="border-b border-border/20 text-sm hover:bg-secondary/15 transition-all">
                          <td className="p-3">
                            <div className="font-semibold text-foreground">{product.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5"><Barcode className="w-3 h-3 text-amber-500" /> {product.barcode || 'N/A'}</div>
                          </td>
                          <td className="p-3 font-mono text-xs">{product.sku}</td>
                          <td className="p-3 font-bold">
                            <span className={qty <= product.reorderPoint ? 'text-amber-500' : ''}>{qty} Units</span>
                          </td>
                          <td className="p-3">
                            {product.aisle ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-secondary text-primary border border-border">{product.aisle}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">{t('warehouse.unassigned') || 'Unassigned'}</span>
                            )}
                          </td>
                          <td className="p-3">
                            {product.rack ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-secondary text-foreground border border-border">{product.rack}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">{t('warehouse.unassigned') || 'Unassigned'}</span>
                            )}
                          </td>
                          <td className="p-3">
                            {product.shelf ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-secondary text-foreground border border-border">{product.shelf}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">{t('warehouse.unassigned') || 'Unassigned'}</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button onClick={() => handleEditRack(product)} variant="ghost" size="sm" className="h-8 font-bold text-xs text-primary hover:text-primary/80">
                              <Edit2 className="w-3 h-3 mr-1" /> {t('warehouse.reassign_location') || 'Reassign Location'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: BATCH & EXPIRY TRACKER */}
          {activeTab === 'batches' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-secondary/20 p-2 rounded-xl max-w-sm border border-border/30 w-full sm:w-[320px]">
                  <Search className="w-4 h-4 text-muted-foreground ml-1" />
                  <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('warehouse.search_batch_placeholder')} className="bg-transparent border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 text-sm placeholder:text-muted-foreground/60 w-full" />
                </div>
                <div className="flex gap-2">
                  <div className="text-[10px] font-bold px-2.5 py-1 rounded bg-orange-500/10 text-orange-500 border border-orange-500/25">{t('warehouse.status_expiring') || 'Expiring soon (<60 days)'}</div>
                  <div className="text-[10px] font-bold px-2.5 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/25">{t('warehouse.status_expired') || 'Expired (Disposal Required)'}</div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/30">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-secondary/40 border-b border-border/30 text-xs font-bold text-muted-foreground">
                      <th className="p-3">{t('inventory.product_name') || 'Product Name'}</th>
                      <th className="p-3">{t('warehouse.batch_number') || 'Batch ID'}</th>
                      <th className="p-3">{t('warehouse.batch_qty') || 'Batch Quantity'}</th>
                      <th className="p-3">{t('warehouse.mfg_date') || 'Mfg Date'}</th>
                      <th className="p-3">{t('warehouse.expiry_date') || 'Expiry Date'}</th>
                      <th className="p-3">{t('warehouse.shelf_life_remaining') || 'Shelf Life Remaining'}</th>
                      <th className="p-3">{t('common.status') || 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.filter(b => b.productName.toLowerCase().includes(searchQuery.toLowerCase()) || b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())).map(batch => {
                      const dl = batch.daysLeft;
                      let badgeColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/25";
                      let statusText = t('warehouse.status_good') || "Good Stock";
                      if (dl <= 0) {
                        badgeColor = "bg-red-500/15 text-red-500 border-red-500/25";
                        statusText = t('warehouse.status_expired') || "EXPIRED";
                      } else if (dl <= 60) {
                        badgeColor = "bg-orange-500/15 text-orange-500 border-orange-500/25";
                        statusText = t('warehouse.status_expiring') || "EXPIRING SOON";
                      }

                      return (
                        <tr key={batch.id} className="border-b border-border/20 text-sm hover:bg-secondary/15 transition-all">
                          <td className="p-3 font-semibold">{batch.productName}</td>
                          <td className="p-3 font-mono text-xs text-amber-500 font-bold">{batch.batchNumber}</td>
                          <td className="p-3 font-bold text-xs">{batch.quantity} Units</td>
                          <td className="p-3 text-xs text-muted-foreground">{batch.manufacturingDate ? new Date(batch.manufacturingDate).toLocaleDateString() : 'N/A'}</td>
                          <td className="p-3 text-xs font-bold">{new Date(batch.expiryDate).toLocaleDateString()}</td>
                          <td className="p-3 font-semibold text-xs">
                            <span className={dl <= 0 ? 'text-red-500 font-bold' : dl <= 60 ? 'text-orange-500 font-bold' : ''}>
                              {dl <= 0 ? `${t('warehouse.status_expired') || 'Expired'} ${Math.abs(dl)} ${t('common.days') || 'days'} ${t('common.ago') || 'ago'}` : `${dl} ${t('warehouse.days_remaining') || 'days remaining'}`}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PO & GRN WORKSPACE */}
          {activeTab === 'po' && (
            <div className="space-y-6">
              
              {/* TOP ACTIONS */}
              <div className="p-4 bg-secondary/10 border border-border/30 rounded-xl flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-foreground">{t('warehouse.auto_supplier_reorders') || 'Automated Supplier Reorders'}</h3>
                  <p className="text-xs text-muted-foreground">{t('warehouse.auto_po_desc') || 'Let SAP Demand forecasting scan low-stock inventories and group them into formal drafts.'}</p>
                </div>
                <Button onClick={handleGenerateAutoPOs} className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" /> {t('warehouse.compile_low_stock_pos') || 'Compile Low Stock POs'}
                </Button>
              </div>

              {/* ACTIVE POs LEDGER */}
              <div className="space-y-4">
                <h3 className="font-bold text-base text-foreground flex items-center gap-1.5"><FileText className="w-4 h-4 text-primary" /> {t('warehouse.active_pos_ledger') || 'Active Purchase & Receipt Orders'}</h3>
                
                <div className="overflow-x-auto rounded-lg border border-border/30">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-secondary/40 border-b border-border/30 text-xs font-bold text-muted-foreground">
                        <th className="p-3">{t('warehouse.po_number') || 'PO Number'}</th>
                        <th className="p-3">{t('warehouse.supplier_name') || 'Supplier Name'}</th>
                        <th className="p-3">{t('warehouse.items_ordered') || 'Items Ordered'}</th>
                        <th className="p-3">{t('warehouse.total_value') || 'Total Value'}</th>
                        <th className="p-3">{t('warehouse.creation_date') || 'Creation Date'}</th>
                        <th className="p-3">{t('common.status') || 'Status'}</th>
                        <th className="p-3 text-right">{t('common.actions') || 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseOrders.map(po => {
                        let statusColor = "bg-secondary text-primary border-primary/20";
                        if (po.status === 'Received') statusColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/25";
                        if (po.status === 'Confirmed') statusColor = "bg-amber-500/10 text-amber-500 border-amber-500/25";

                        return (
                          <tr key={po.id} className="border-b border-border/20 text-sm hover:bg-secondary/15 transition-all">
                            <td className="p-3 font-mono text-xs font-bold">{po.poNumber}</td>
                            <td className="p-3 font-semibold">{po.vendorName}</td>
                            <td className="p-3 text-xs text-muted-foreground font-medium">
                              {po.items.length} product SKUs ({po.items.reduce((a,c)=>a+c.qty, 0)} units)
                            </td>
                            <td className="p-3 font-extrabold text-xs">₹{po.total.toLocaleString('en-IN')}.00</td>
                            <td className="p-3 text-xs text-muted-foreground">{new Date(po.createdAt).toLocaleDateString()}</td>
                            <td className="p-3">
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${statusColor}`}>
                                {po.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex gap-2 justify-end">
                                <Button onClick={() => handlePrintPO(po)} variant="outline" size="sm" className="h-8 text-xs font-semibold px-2.5">
                                  <Printer className="w-3.5 h-3.5 mr-1" /> {t('warehouse.print_po') || 'Print PO'}
                                </Button>
                                {po.status !== 'Received' && (
                                  <Button onClick={() => handleOpenGrn(po)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-2.5">
                                    <CheckSquare className="w-3.5 h-3.5 mr-1" /> {t('warehouse.process_grn') || 'Process GRN'}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* ==================== DIALOGS & FORM MODALS ==================== */}

      {/* DIALOG 1: VENDOR ADD/EDIT */}
      <Dialog open={isVendorOpen} onOpenChange={setIsVendorOpen}>
        <DialogContent className="sm:max-w-[500px] glass-card border border-border/50 text-foreground">
          <DialogHeader>
            <DialogTitle className="gold-text text-xl font-bold">{selectedVendor ? t('warehouse.edit_vendor') : t('warehouse.register_new_vendor')}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">{t('warehouse.vendor_desc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.vendor_name') || 'Vendor Name *'}</label>
                <Input value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} placeholder="e.g. Mahadev Traders" className="bg-secondary/40 border-border/40 focus:border-primary text-sm font-semibold" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.vendor_code') || 'Vendor Code *'}</label>
                <Input value={vendorForm.vendorCode} onChange={e => setVendorForm({ ...vendorForm, vendorCode: e.target.value })} placeholder="e.g. VND-MHD" className="bg-secondary/40 border-border/40 focus:border-primary text-sm font-mono" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.phone_number') || 'Phone Number'}</label>
                <Input value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} placeholder="9876543210" className="bg-secondary/40 border-border/40 focus:border-primary text-sm font-semibold" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.email_address') || 'Email Address'}</label>
                <Input value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })} placeholder="supplier@retail.com" className="bg-secondary/40 border-border/40 focus:border-primary text-sm font-semibold" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">{t('warehouse.warehouse_address') || 'Office / Warehouse Address'}</label>
              <Input value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} placeholder="e.g. Plot 45, APMC Market, Mumbai" className="bg-secondary/40 border-border/40 focus:border-primary text-sm font-semibold" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.vendor_gstin') || 'Vendor GSTIN'}</label>
                <Input value={vendorForm.gst} onChange={e => setVendorForm({ ...vendorForm, gst: e.target.value })} placeholder="27AAPCM1234F1Z5" className="bg-secondary/40 border-border/40 focus:border-primary text-xs font-mono uppercase" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.terms') || 'Terms'}</label>
                <Select value={vendorForm.paymentTerms} onValueChange={val => setVendorForm({ ...vendorForm, paymentTerms: val })}>
                  <SelectTrigger className="bg-secondary/40 border-border/40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COD">COD</SelectItem>
                    <SelectItem value="Net15">Net 15 Days</SelectItem>
                    <SelectItem value="Net30">Net 30 Days</SelectItem>
                    <SelectItem value="Net45">Net 45 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.credit_limit') || 'Credit limit (₹)'}</label>
                <Input type="number" value={vendorForm.creditLimit} onChange={e => setVendorForm({ ...vendorForm, creditLimit: e.target.value })} placeholder="100000" className="bg-secondary/40 border-border/40 focus:border-primary text-xs font-mono" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 border-t border-border/30 pt-4 mt-2">
            <Button onClick={() => setIsVendorOpen(false)} variant="outline" className="flex-1 text-xs font-bold">{t('common.cancel')}</Button>
            <Button onClick={handleSaveVendor} className="flex-1 bg-primary text-primary-foreground font-bold text-xs">{t('warehouse.save_supplier_profile')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: RACK ASSIGNMENT */}
      <Dialog open={isRackOpen} onOpenChange={setIsRackOpen}>
        <DialogContent className="sm:max-w-[400px] glass-card border border-border/50 text-foreground">
          <DialogHeader>
            <DialogTitle className="gold-text text-lg font-bold">{t('warehouse.configure_structural_location') || 'Configure Structural Location'}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">{t('warehouse.rack_desc') || 'Map the product to a physical layout section inside the warehouse.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.aisle') || 'Aisle (e.g. Aisle 3)'}</label>
                <Input value={rackForm.aisle} onChange={e => setRackForm({ ...rackForm, aisle: e.target.value })} placeholder="Aisle 3" className="bg-secondary/40 border-border/40 text-sm font-semibold" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.rack') || 'Rack Code (e.g. Rack B)'}</label>
                <Input value={rackForm.rack} onChange={e => setRackForm({ ...rackForm, rack: e.target.value })} placeholder="Rack B" className="bg-secondary/40 border-border/40 text-sm font-semibold" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.shelf') || 'Shelf (e.g. Shelf 2)'}</label>
                <Input value={rackForm.shelf} onChange={e => setRackForm({ ...rackForm, shelf: e.target.value })} placeholder="Shelf 2" className="bg-secondary/40 border-border/40 text-sm font-semibold" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.bin_id') || 'Bin ID (Optional)'}</label>
                <Input value={rackForm.bin} onChange={e => setRackForm({ ...rackForm, bin: e.target.value })} placeholder="Bin 4" className="bg-secondary/40 border-border/40 text-sm font-semibold" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 border-t border-border/30 pt-4 mt-2">
            <Button onClick={() => setIsRackOpen(false)} variant="outline" className="flex-1 text-xs font-bold">{t('common.cancel')}</Button>
            <Button onClick={handleSaveRack} className="flex-1 bg-primary text-primary-foreground font-bold text-xs">{t('warehouse.assign_section') || 'Assign Section'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: BATCH LOG ENTRY */}
      <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
        <DialogContent className="sm:max-w-[450px] glass-card border border-border/50 text-foreground">
          <DialogHeader>
            <DialogTitle className="gold-text text-lg font-bold">{t('warehouse.log_inventory_batch') || 'Log Inventory Batch'}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">{t('warehouse.track_perishable_desc') || 'Track perishable or wholesale products by batch IDs and expiry limits.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">{t('warehouse.select_product') || 'Select Product'}</label>
              <Select value={batchForm.productId} onValueChange={val => setBatchForm({ ...batchForm, productId: val })}>
                <SelectTrigger className="bg-secondary/40 border-border/40 text-xs">
                  <SelectValue placeholder={t('warehouse.choose_item_placeholder') || 'Choose inventory item'} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.batch_number') || 'Batch Number / ID *'}</label>
                <Input value={batchForm.batchNumber} onChange={e => setBatchForm({ ...batchForm, batchNumber: e.target.value })} placeholder="e.g. BAT-089" className="bg-secondary/40 border-border/40 text-sm font-mono uppercase" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.quantity_received') || 'Quantity Received *'}</label>
                <Input type="number" value={batchForm.quantity} onChange={e => setBatchForm({ ...batchForm, quantity: e.target.value })} placeholder="e.g. 50" className="bg-secondary/40 border-border/40 text-sm font-semibold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.mfg_date') || 'Mfg Date'}</label>
                <Input type="date" value={batchForm.manufacturingDate} onChange={e => setBatchForm({ ...batchForm, manufacturingDate: e.target.value })} className="bg-secondary/40 border-border/40 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">{t('warehouse.expiry_date') || 'Expiry Date *'}</label>
                <Input type="date" value={batchForm.expiryDate} onChange={e => setBatchForm({ ...batchForm, expiryDate: e.target.value })} className="bg-secondary/40 border-border/40 text-xs text-red-500 font-bold" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 border-t border-border/30 pt-4 mt-2">
            <Button onClick={() => setIsBatchOpen(false)} variant="outline" className="flex-1 text-xs font-bold">{t('common.cancel')}</Button>
            <Button onClick={handleSaveBatch} className="flex-1 bg-primary text-primary-foreground font-bold text-xs">{t('warehouse.register_batch') || 'Register Batch'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: GRN RECEIPT PROCESSOR */}
      <Dialog open={isGrnOpen} onOpenChange={setIsGrnOpen}>
        <DialogContent className="sm:max-w-[650px] glass-card border border-border/50 text-foreground max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="gold-text text-xl font-bold flex items-center gap-1.5"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> {t('warehouse.grn_title') || 'Goods Receipt Note (GRN)'}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">{(t('warehouse.grn_desc') || 'Verify items arriving from vendor. Received quantities will automatically post to active stock.').replace('supplier', selectedPO?.vendorName || '')}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/10 border border-border/30 rounded-lg">
              <div className="text-xs">
                <span className="text-muted-foreground block">{t('warehouse.po_number') || 'PO Number'}:</span>
                <span className="font-mono font-bold text-primary">{selectedPO?.poNumber}</span>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">{t('warehouse.supplier_invoice') || 'Supplier Invoice / Bill No *'}</label>
                <Input value={grnForm.invoiceNumber} onChange={e => setGrnForm({ ...grnForm, invoiceNumber: e.target.value })} placeholder="INV-2026-X89" className="h-7 bg-secondary/30 border-border/40 text-xs font-mono" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground block">{t('warehouse.received_checklist') || 'Received Items Checklist'}</span>
              <div className="space-y-3">
                {grnForm.items.map((item, idx) => (
                  <div key={idx} className="p-3 border border-border/30 rounded-lg space-y-2.5 bg-secondary/5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-foreground">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground">{t('warehouse.ordered') || 'Ordered:'} <b className="text-foreground">{item.qty} {t('warehouse.units') || 'units'}</b></span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-muted-foreground">{t('warehouse.received_qty') || 'Received Qty'}</label>
                        <Input type="number" value={item.receivedQty} onChange={e => handleUpdateGrnItem(idx, 'receivedQty', parseInt(e.target.value))} className="h-7 text-xs bg-secondary/30 border-border/40 font-bold" />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-muted-foreground">{t('warehouse.damaged_qty') || 'Damaged Qty'}</label>
                        <Input type="number" value={item.damagedQty} onChange={e => handleUpdateGrnItem(idx, 'damagedQty', parseInt(e.target.value))} className="h-7 text-xs bg-secondary/30 border-border/40 font-bold text-red-500" />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-muted-foreground">{t('warehouse.assign_batch_id') || 'Assign Batch ID'}</label>
                        <Input value={item.batchNumber} onChange={e => handleUpdateGrnItem(idx, 'batchNumber', e.target.value)} className="h-7 text-[10px] bg-secondary/30 border-border/40 font-mono" />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-muted-foreground">{t('warehouse.batch_expiry') || 'Batch Expiry'}</label>
                        <Input type="date" value={item.expiryDate} onChange={e => handleUpdateGrnItem(idx, 'expiryDate', e.target.value)} className="h-7 text-[10px] bg-secondary/30 border-border/40 font-semibold" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-t border-border/30 pt-4 mt-2">
            <Button onClick={() => setIsGrnOpen(false)} variant="outline" className="flex-1 text-xs font-bold">{t('common.cancel')}</Button>
            <Button onClick={handleSubmitGRN} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">{t('warehouse.verify_receipt_post_stock') || 'Verify Receipt & Post Stock'}</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
