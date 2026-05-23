import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  subscribeToBranchInventory,
  getBranchInventory,
  unsubscribeFromInventory,
} from '@/api/inventorySyncService';
import toast from 'react-hot-toast';

/**
 * Real-Time Inventory Sync Monitor
 * Shows live inventory updates across branches
 * Displays sync status and performance metrics
 */
export default function InventorySync() {
  const [branchId, setBranchId] = useState(localStorage.getItem('selectedBranch') || '');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncActive, setSyncActive] = useState(false);
  const [syncStats, setSyncStats] = useState({
    lastSyncTime: null,
    itemsUpdated: 0,
    syncLatency: 0, // ms
    lowStockCount: 0,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const productsMap = useMemo(() => {
    const map = {};
    products.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  useEffect(() => {
    if (branchId) {
      loadInventory();
      startRealTimeSync();
    }

    return () => {
      unsubscribeFromInventory(`branch_${branchId}`);
    };
  }, [branchId]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const startTime = performance.now();
      const data = await getBranchInventory(branchId);
      const latency = performance.now() - startTime;

      const lowStock = data.filter(item => item.quantity <= item.reorderPoint).length;

      setInventory(data);
      setSyncStats(prev => ({
        ...prev,
        lastSyncTime: new Date(),
        syncLatency: Math.round(latency),
        lowStockCount: lowStock,
      }));
    } catch (error) {
      toast.error('Failed to load inventory');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startRealTimeSync = () => {
    try {
      const unsubscribe = subscribeToBranchInventory(branchId, newInventory => {
        const startTime = performance.now();
        setInventory(newInventory);
        const latency = performance.now() - startTime;

        const lowStock = newInventory.filter(
          item => item.quantity <= item.reorderPoint
        ).length;

        setSyncStats(prev => ({
          ...prev,
          lastSyncTime: new Date(),
          itemsUpdated: newInventory.length,
          syncLatency: Math.round(latency),
          lowStockCount: lowStock,
        }));

        setSyncActive(true);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error starting real-time sync:', error);
      toast.error('Failed to connect to real-time sync');
    }
  };

  const handleRefresh = () => {
    loadInventory();
  };

  const lowStockItems = inventory.filter(item => item.quantity <= item.reorderPoint);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Sync</h1>
          <p className="text-gray-600 mt-1">Real-time inventory synchronization across branches</p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Sync Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Sync Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <Zap className={`w-5 h-5 ${syncActive ? 'text-green-500' : 'text-gray-400'}`} />
              <span className={`text-lg font-bold ${syncActive ? 'text-green-600' : 'text-gray-600'}`}>
                {syncActive ? 'Active' : 'Idle'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {syncStats.lastSyncTime
                ? `Updated ${syncStats.lastSyncTime.toLocaleTimeString()}`
                : 'Waiting for sync...'}
            </p>
          </CardContent>
        </Card>

        {/* Latency */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Sync Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{syncStats.syncLatency}ms</div>
            <p className="text-xs text-gray-500 mt-2">
              {syncStats.syncLatency < 100 ? '✅ Excellent' : syncStats.syncLatency < 500 ? '⚠️ Good' : '❌ Poor'}
            </p>
          </CardContent>
        </Card>

        {/* Items Updated */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Items Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{syncStats.itemsUpdated}</div>
            <p className="text-xs text-gray-500 mt-2">Live updates tracked</p>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className={lowStockItems.length > 0 ? 'border-yellow-200 bg-yellow-50' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`w-5 h-5 ${lowStockItems.length > 0 ? 'text-yellow-600' : 'text-gray-400'}`}
              />
              <span className="text-2xl font-bold text-yellow-600">{syncStats.lowStockCount}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Need restocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Items Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">⚠️ Low Stock Alert</CardTitle>
            <CardDescription className="text-yellow-700">
              {lowStockItems.length} item(s) are below reorder point
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.slice(0, 5).map(item => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-bold text-gray-900 leading-tight">
                      {productsMap[item.productId]?.name || `Unlisted Item (${item.productId})`}
                    </p>
                    {productsMap[item.productId]?.barcode && (
                      <p className="text-[10px] text-gray-500 font-mono">
                        SKU/Barcode: {productsMap[item.productId].barcode}
                      </p>
                    )}
                    {productsMap[item.productId]?.category && (
                      <span className="self-start inline-block px-1.5 py-0.5 text-[9px] bg-yellow-500/10 text-yellow-800 border border-yellow-500/20 rounded-md font-bold">
                        {productsMap[item.productId].category}
                      </span>
                    )}
                    <p className="text-xs text-gray-600 mt-0.5">Current: <span className="font-extrabold">{item.quantity}</span> units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-yellow-600">Reorder: {item.reorderPoint}</p>
                    <p className="text-xs text-gray-500">
                      Short by {item.reorderPoint - item.quantity} units
                    </p>
                  </div>
                </div>
              ))}
              {lowStockItems.length > 5 && (
                <p className="text-sm text-gray-600 pt-2">
                  +{lowStockItems.length - 5} more items
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Inventory</CardTitle>
          <CardDescription>
            Real-time inventory for {inventory.length} items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin">Loading...</div>
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No inventory items found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Product Details</th>
                    <th className="text-right py-3 px-4 font-semibold">Current Stock</th>
                    <th className="text-right py-3 px-4 font-semibold">Reorder Point</th>
                    <th className="text-right py-3 px-4 font-semibold">Reorder Qty</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                    <th className="text-center py-3 px-4 font-semibold">Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.slice(0, 20).map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-gray-900 leading-tight">
                            {productsMap[item.productId]?.name || `Unlisted Product`}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">
                              ID: {item.productId}
                            </span>
                            {productsMap[item.productId]?.barcode && (
                              <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">
                                Barcode: {productsMap[item.productId].barcode}
                              </span>
                            )}
                            {productsMap[item.productId]?.category && (
                              <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-black bg-yellow-500/10 text-yellow-800 border border-yellow-500/20">
                                {productsMap[item.productId].category}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="font-bold">{item.quantity}</span>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600">{item.reorderPoint}</td>
                      <td className="text-right py-3 px-4 text-gray-600">{item.reorderQuantity}</td>
                      <td className="text-center py-3 px-4">
                        {item.quantity <= item.reorderPoint ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : item.quantity <= item.reorderPoint * 1.5 ? (
                          <Badge variant="secondary">Caution</Badge>
                        ) : (
                          <Badge variant="outline">OK</Badge>
                        )}
                      </td>
                      <td className="text-center py-3 px-4 text-gray-500 text-xs">
                        {item.updatedAt
                          ? new Date(item.updatedAt.toDate?.() || item.updatedAt).toLocaleTimeString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inventory.length > 20 && (
                <div className="py-4 text-center text-sm text-gray-600">
                  Showing 20 of {inventory.length} items
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">💡 Sync Performance Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800">
          <ul className="list-disc list-inside space-y-1">
            <li>Sub-1000ms sync latency indicates excellent real-time connectivity</li>
            <li>Inventory updates propagate to all branches within milliseconds</li>
            <li>Low-stock items trigger automatic notifications to managers</li>
            <li>Stock transfers between branches update instantly across the network</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
