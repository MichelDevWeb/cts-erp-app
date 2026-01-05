import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Truck } from 'lucide-react'

export function ShipmentsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipments</h1>
          <p className="text-muted-foreground">
            Track shipments and deliveries
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Shipment
        </Button>
      </div>

      {/* Empty State - will be replaced with shipment list in Phase 3 */}
      <Card>
        <CardHeader>
          <CardTitle>No shipments yet</CardTitle>
          <CardDescription>
            Shipment tracking will be available in Phase 3.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
            <Truck className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
            Shipment management will be available in Phase 3. Create shipments from confirmed or invoiced orders.
          </p>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Coming in Phase 3
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

