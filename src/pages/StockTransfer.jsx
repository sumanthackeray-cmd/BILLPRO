import { useState, useEffect } from 'react';
import { ArrowRight, Package, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  transferInventory,
  getInventory,
} from '@/api/inventorySyncService';
import { getAllBranches } from '@/api/branchService';
import { useLanguage } from '@/lib/LanguageContext';
import toast from 'react-hot-toast';

/**
 * Stock Transfer Management
 * Transfer inventory between branches in real-time
 */
export default function StockTransfer() {
  const { t } = useLanguage();
  const [branches, setBranches] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState({
    productId: '',
    fromBranch: '',
    toBranch: '',
    quantity: '',
    notes: '',
  });

  const [availableStock, setAvailableStock] = useState(null);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (formData.productId && formData.fromBranch) {
      checkAvailableStock();
    }
  }, [formData.productId, formData.fromBranch]);

  const loadBranches = async () => {
    try {
      const data = await getAllBranches();
      setBranches(data);
    } catch (error) {
      toast.error(t('branches.failed_load') || 'Failed to load branches');
    }
  };

  const checkAvailableStock = async () => {
    try {
      const inventory = await getInventory(formData.productId, formData.fromBranch);
      setAvailableStock(inventory);
    } catch (error) {
      setAvailableStock(null);
    }
  };

  const handleTransfer = async () => {
    // Validation
    if (
      !formData.productId ||
      !formData.fromBranch ||
      !formData.toBranch ||
      !formData.quantity
    ) {
      toast.error(t('stock_transfer.toast_fill_required'));
      return;
    }

    if (formData.fromBranch === formData.toBranch) {
      toast.error(t('stock_transfer.toast_different_branches'));
      return;
    }

    if (!availableStock || availableStock.quantity < parseInt(formData.quantity)) {
      toast.error(t('stock_transfer.toast_insufficient_stock'));
      return;
    }

    try {
      setLoading(true);
      await transferInventory(
        formData.productId,
        formData.fromBranch,
        formData.toBranch,
        parseInt(formData.quantity)
      );

      // Add to transfer history
      setTransfers([
        {
          id: Date.now(),
          ...formData,
          status: 'Completed',
          timestamp: new Date().toISOString(),
        },
        ...transfers,
      ]);

      toast.success(t('stock_transfer.toast_transfer_success'));
      setIsOpen(false);
      resetForm();
    } catch (error) {
      toast.error(t('stock_transfer.toast_transfer_failed') + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      fromBranch: '',
      toBranch: '',
      quantity: '',
      notes: '',
    });
    setAvailableStock(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('stock_transfer.title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('stock_transfer.subtitle')}
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Truck className="w-4 h-4 mr-2" />
          {t('stock_transfer.new_transfer')}
        </Button>
      </div>

      {/* Transfer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('stock_transfer.total_transfers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transfers.length}</div>
            <p className="text-xs text-gray-500 mt-2">{t('stock_transfer.this_session')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('stock_transfer.completed')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {transfers.filter(t => t.status === 'Completed').length}
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('stock_transfer.success_transferred')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('stock_transfer.branches_connected')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branches.length}</div>
            <p className="text-xs text-gray-500 mt-2">{t('stock_transfer.active_locations')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Transfer History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('stock_transfer.recent_transfers')}</CardTitle>
          <CardDescription>
            {transfers.length === 0
              ? t('stock_transfer.no_transfers')
              : `${transfers.length} ${t('stock_transfer.transfers_in_history')}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>{t('stock_transfer.no_transfers')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map(transfer => (
                <div
                  key={transfer.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-1">
                        <p className="font-semibold">{t('stock_transfer.product_id')}: {transfer.productId}</p>
                        <p className="text-sm text-gray-600">
                          {transfer.quantity} {t('stock_transfer.units')}
                        </p>
                      </div>
                      <div className="text-center px-4">
                        <p className="text-xs text-gray-500 mb-1">{t('common.from') || 'FROM'}</p>
                        <p className="font-mono text-sm">{transfer.fromBranch}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                      <div className="text-center px-4">
                        <p className="text-xs text-gray-500 mb-1">{t('common.to') || 'TO'}</p>
                        <p className="font-mono text-sm">{transfer.toBranch}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-50">
                      ✓ {transfer.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(transfer.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('stock_transfer.create_transfer')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Product Selection */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t('stock_transfer.product_id')}</label>
              <Input
                placeholder={t('stock_transfer.product_id') + '...'}
                value={formData.productId}
                onChange={e =>
                  setFormData({ ...formData, productId: e.target.value.toUpperCase() })
                }
              />
            </div>

            {/* Branch Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">{t('stock_transfer.from_branch')}</label>
                <Select value={formData.fromBranch} onValueChange={value =>
                  setFormData({ ...formData, fromBranch: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder={t('stock_transfer.from_branch')} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableStock && (
                  <p className="text-sm text-gray-600 mt-2">
                    {t('stock_transfer.available')} <span className="font-bold">{availableStock.quantity} {t('stock_transfer.units')}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">{t('stock_transfer.to_branch')}</label>
                <Select value={formData.toBranch} onValueChange={value =>
                  setFormData({ ...formData, toBranch: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder={t('stock_transfer.to_branch')} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter(b => b.id !== formData.fromBranch)
                      .map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} ({branch.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t('stock_transfer.quantity')}</label>
              <Input
                type="number"
                placeholder={t('stock_transfer.enter_qty')}
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
              />
              {availableStock && parseInt(formData.quantity) > availableStock.quantity && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ {t('stock_transfer.exceeds_stock')} ({availableStock.quantity} {t('stock_transfer.units')})
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold mb-2">{t('stock_transfer.notes')}</label>
              <Input
                placeholder={t('inventory.reason') || 'Notes'}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1"
                onClick={handleTransfer}
                disabled={loading || !formData.productId || !formData.fromBranch || !formData.toBranch || !formData.quantity}
              >
                {loading ? t('common.loading') : t('stock_transfer.transfer_stock')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📦 {t('stock_transfer.how_it_works')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800">
          <ul className="list-disc list-inside space-y-1">
            <li>{t('stock_transfer.help_bullet_1')}</li>
            <li>{t('stock_transfer.help_bullet_2')}</li>
            <li>{t('stock_transfer.help_bullet_3')}</li>
            <li>{t('stock_transfer.help_bullet_4')}</li>
            <li>{t('stock_transfer.help_bullet_5')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
