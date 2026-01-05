import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'

export function InvoicesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage invoices and track payments
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* Empty State - will be replaced with invoice list in Phase 2 */}
      <Card>
        <CardHeader>
          <CardTitle>No invoices yet</CardTitle>
          <CardDescription>
            Invoices will be generated from confirmed orders in Phase 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
            Invoice management will be available in Phase 2. Create orders first, then generate invoices from confirmed orders.
          </p>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Coming in Phase 2
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

