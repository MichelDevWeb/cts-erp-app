import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ShoppingCart } from 'lucide-react'

export function OrdersPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage and track all your orders
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Empty State - will be replaced with order list in Phase 1 */}
      <Card>
        <CardHeader>
          <CardTitle>No orders yet</CardTitle>
          <CardDescription>
            Create your first order to get started with order management.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
            <ShoppingCart className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
            Orders will appear here once you create them. You'll need customers and products first.
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Order
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

